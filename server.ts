import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import {
  clinicDb,
  sanitizeFolderName,
  User,
  isPersistentEnvironment,
  getStorageType,
  getDataDirPath,
  getDbFilePath,
} from './server/db';
import { encryptionService } from './server/security/encryptionService';
import { getClinicTodayStr } from './server/clinicDate';
import {
  hashPassword,
  generateSalt,
  generateRecoveryKey,
  verifyPassword,
  validatePasswordStrength,
  createSession,
  destroySession,
  getSession,
  touchSession,
  getSessionRemainingTime,
  INACTIVITY_TIMEOUT_MS,
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogin,
  clearAllLoginRateLimits,
  logAudit,
  getClientIp,
  isLocalhost,
  isAllowedClinicNetwork,
  securityHeadersMiddleware,
  originGuardMiddleware,
  authenticate,
  requireDoctor,
  SESSION_COOKIE_NAME,
} from './server/auth';

const app = express();
app.set('trust proxy', true);
const PORT = 3000;

// Security & Parsing Middlewares
app.use(securityHeadersMiddleware);
app.use(originGuardMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get local IPv4 addresses on the clinic LAN
function getLocalNetworkAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Multer storage engine saving directly to the specific clinic & patient folder on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = (req as any).user;
    const clinicId = user?.clinicId || 'cln-default';
    const patientId = req.body.patientId || 'unassigned';
    const patient = clinicDb.getPatientById(patientId, clinicId);
    let targetDir: string;
    if (patient) {
      targetDir = clinicDb.getPatientFolderPath(patient);
    } else {
      targetDir = path.join(clinicDb.getStoragePath(clinicId), `clinic_${clinicId}`, `Patient_${patientId}`);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalSafe = sanitizeFolderName(path.basename(file.originalname));
    cb(null, `${timestamp}_${originalSafe}`);
  },
});

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.scr', '.msi', '.com', '.pif', '.jar', '.apk'
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('صيغة الملف غير مسموح بها لأسباب أمنية. يرجى رفع ملفات الصور أو PDF فقط.'));
    }
    cb(null, true);
  },
});

// ================= LAN NETWORK GUARD =================
app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/api') && !isAllowedClinicNetwork(req)) {
    const ip = getClientIp(req);
    logAudit('NETWORK_BLOCKED', 'anonymous', ip, 'DENIED', `Blocked non-LAN access to ${req.path}`);
    return res.status(403).json({ error: 'الوصول مقتصر فقط على شبكة العيادة المحلية.' });
  }
  next();
});

// ================= AUTHENTICATION & MULTI-TENANT ROUTES =================

app.get('/api/auth/system-status', (req: Request, res: Response) => {
  try {
    const users = clinicDb.getUsers();
    const isPersistent = isPersistentEnvironment();
    const storageType = getStorageType();
    res.json({
      initialized: users.length > 0,
      usersCount: users.length,
      doctorExists: users.some(u => u.role === 'doctor' && u.isActive),
      persistent: isPersistent,
      storageType: storageType,
      dataDir: getDataDirPath(),
      dbFile: getDbFilePath(),
      encryption: encryptionService.getStatus(),
    });
  } catch (err: any) {
    console.error('[SYSTEM_STATUS_ERR] Failed reading clinic database:', err);
    res.status(500).json({ error: 'تعذّر الوصول إلى قاعدة البيانات' });
  }
});

// 2. Register New Clinic (Director creates new clinic + workspace)
app.post('/api/auth/register-clinic', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `تم حظر العمليات مؤقتاً لتكرار المحاولات. يرجى الانتظار ${rateLimit.remainingLockoutMinutes} دقيقة.`
    });
  }

  const { fullName, clinicName, username, password, confirmPassword } = req.body;
  if (!fullName || !clinicName || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة (الاسم الكامل، اسم العيادة، اسم المستخدم، كلمة المرور وتأكيدها).' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'كلمتا المرور غير متطابقتين.' });
  }

  const passCheck = validatePasswordStrength(password);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'يجب أن يكون اسم المستخدم بين 3 و 30 حرفاً.' });
  }

  if (clinicDb.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً لمستخدم آخر. يرجى اختيار اسم مستخدم فريد.' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = hashPassword(recoveryKey.trim().toUpperCase(), salt);

  const { clinic, user } = clinicDb.createClinic({
    clinicName: clinicName.trim(),
    doctorName: fullName.trim(),
    username: cleanUsername,
    passwordHash,
    salt,
    recoveryKeyHash,
  });

  clearFailedLogin(clientIp);
  const sessionToken = createSession(user, clinic.name, clientIp);
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  // Session cookie: no maxAge or expires -> destroyed automatically when browser/tab closes
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    secure: isHttps,
  });

  logAudit('CLINIC_REGISTERED', user.username, clientIp, 'SUCCESS', `Created clinic: ${clinic.name}`, clinic.id);

  return res.status(201).json({
    success: true,
    message: 'تم إنشاء حساب العيادة بنجاح! احتفظ بمفتاح الاسترجاع في مكان آمن.',
    token: sessionToken,
    user: {
      id: user.id,
      clinicId: clinic.id,
      clinicName: clinic.name,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: false,
    },
    recoveryKey,
  });
});

// 2b. Legacy initial setup fallback
app.post('/api/auth/setup-doctor', (req: Request, res: Response) => {
  const { fullName, username, password, confirmPassword } = req.body;
  if (!fullName || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'جميع حقول البيانات مطلوبة.' });
  }
  return res.redirect(307, '/api/auth/register-clinic');
});

// 3. User Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const { username, password } = req.body || {};

  console.log(`[AUTH_LOGIN_ATTEMPT] Incoming login attempt | Username: "${username || ''}" | Client IP: ${clientIp} | Protocol: ${req.protocol} | Secure: ${req.secure}`);

  // 1. Check rate limit
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    console.warn(`[AUTH_LOGIN_FAIL] Reason: Rate limit lockout active. IP ${clientIp} is locked for ~${rateLimit.remainingLockoutMinutes} minutes.`);
    logAudit('LOGIN_BLOCKED', username || 'unknown', clientIp, 'LOCKED', `IP locked out for ${rateLimit.remainingLockoutMinutes} min`);
    return res.status(429).json({
      error: `تم قفل الحساب مؤقتاً لتكرار المحاولات الخاطئة (5 محاولات). يرجى الانتظار ${rateLimit.remainingLockoutMinutes} دقيقة قبل المحاولة مجدداً.`
    });
  }

  // 2. Validate input presence
  if (!username || typeof username !== 'string' || !username.trim() || !password || typeof password !== 'string') {
    console.warn(`[AUTH_LOGIN_FAIL] Reason: Empty username or password submitted from IP ${clientIp}`);
    recordFailedLogin(clientIp);
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  const cleanUsername = username.trim().toLowerCase();

  // 3. Fetch user from database
  let user: User | undefined;
  try {
    user = clinicDb.getUserByUsername(cleanUsername);
  } catch (dbErr: any) {
    console.error(`[AUTH_LOGIN_FAIL] Reason: Error reading clinic database state:`, dbErr);
    return res.status(500).json({ error: 'خطأ في قراءة قاعدة بيانات العيادة' });
  }

  // 4. User not found check
  if (!user) {
    const existingUsers = clinicDb.getUsers().map(u => `"${u.username}" (name: "${u.fullName}", role: ${u.role})`);
    console.warn(`[AUTH_LOGIN_FAIL] Reason: User not found in database. Searched for: "${cleanUsername}" | Registered users in DB: [${existingUsers.join(', ')}] | IP: ${clientIp}`);
    const status = recordFailedLogin(clientIp);
    logAudit('LOGIN_FAILED', cleanUsername, clientIp, 'FAILED', 'User not found');
    if (status.locked) {
      console.warn(`[AUTH_LOGIN_LOCKED] IP ${clientIp} has reached max failed attempts and is now locked for 15 minutes.`);
      return res.status(429).json({
        error: 'تم قفل الحساب مؤقتاً لتكرار المحاولات الخاطئة (5 محاولات). يرجى الانتظار 15 دقيقة.'
      });
    }
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  // 5. Account disabled check
  if (!user.isActive) {
    console.warn(`[AUTH_LOGIN_FAIL] Reason: Account is disabled. User: "${user.username}" (ID: ${user.id}, isActive: false) from IP: ${clientIp}`);
    logAudit('LOGIN_DEACTIVATED', user.username, clientIp, 'DENIED', 'Account is disabled', user.clinicId);
    return res.status(403).json({ error: 'تم تعطيل هذا الحساب من قبل مدير العيادة.' });
  }

  // 6. Verify password
  const verification = verifyPassword(password, user.salt, user.passwordHash);
  if (!verification.valid) {
    console.warn(`[AUTH_LOGIN_FAIL] Reason: Password mismatch. User: "${user.username}" (ID: ${user.id}) | Stored salt: ${user.salt?.slice(0, 8)}... | IP: ${clientIp}`);
    const status = recordFailedLogin(clientIp);
    logAudit('LOGIN_FAILED', user.username, clientIp, 'FAILED', 'Invalid password', user.clinicId);
    if (status.locked) {
      console.warn(`[AUTH_LOGIN_LOCKED] IP ${clientIp} has reached max failed attempts and is now locked for 15 minutes.`);
      return res.status(429).json({
        error: 'تم قفل الحساب مؤقتاً لتكرار المحاولات الخاطئة (5 محاولات). يرجى الانتظار 15 دقيقة.'
      });
    }
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  // 7. If password was verified and needs rehash, upgrade stored hash to user's real password
  if (verification.needsRehash) {
    try {
      const newSalt = generateSalt();
      const newHash = hashPassword(password, newSalt);
      const updates: Partial<User> = {
        salt: newSalt,
        passwordHash: newHash,
      };
      clinicDb.updateUser(user.id, updates, user.clinicId);
      console.log(`[AUTH_UPGRADE] Updated password hash for user "${user.username}" to secure scrypt.`);
      // Refresh user object
      const refreshed = clinicDb.getUserById(user.id);
      if (refreshed) user = refreshed;
    } catch (upgradeErr) {
      console.warn(`[AUTH_UPGRADE_WARN] Could not update hash automatically:`, upgradeErr);
    }
  }

  // 8. Clear failed login attempts on successful login
  clearFailedLogin(clientIp);

  // 9. Create session
  let sessionToken: string;
  const clinic = clinicDb.getClinicById(user.clinicId);
  const clinicName = clinic?.name || 'عيادة الأسنان';
  try {
    sessionToken = createSession(user, clinicName, clientIp);
  } catch (sessErr: any) {
    console.error(`[AUTH_LOGIN_FAIL] Reason: Failed to create session for user "${user.username}":`, sessErr);
    return res.status(500).json({ error: 'فشل إنشاء جلسة الدخول' });
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  // Session cookie: on HTTPS (cloud/iframe) SameSite=None + Secure; on HTTP (LAN) SameSite=Lax + Secure=false
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    secure: isHttps,
  });

  console.log(`[AUTH_LOGIN_SUCCESS] User "${user.username}" (${user.fullName}, ${user.role}) authenticated successfully from IP: ${clientIp}. Session token created.`);
  logAudit('LOGIN_SUCCESS', user.username, clientIp, 'SUCCESS', 'User logged in', user.clinicId);

  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      clinicId: user.clinicId,
      clinicName,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: !!user.mustChangePassword,
    },
  });
});

// 4. Recover Director Account using secret Recovery Key (Offline)
app.post('/api/auth/recover-director', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `تم حظر العمليات مؤقتاً لتكرار المحاولات. يرجى الانتظار ${rateLimit.remainingLockoutMinutes} دقيقة.`
    });
  }

  const { username, recoveryKey, newPassword, confirmPassword } = req.body;
  if (!username || !recoveryKey || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم، ومفتاح الاسترجاع، وكلمة المرور الجديدة وتأكيدها.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'كلمتا المرور غير متطابقتين.' });
  }

  const passCheck = validatePasswordStrength(newPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = clinicDb.getUserByUsername(cleanUsername);

  if (!user || user.role !== 'doctor' || !user.recoveryKeyHash) {
    recordFailedLogin(clientIp);
    return res.status(400).json({ error: 'اسم المستخدم أو مفتاح الاسترجاع غير صحيح.' });
  }

  const cleanKey = recoveryKey.trim().toUpperCase();
  const keyValid = verifyPassword(cleanKey, user.salt, user.recoveryKeyHash);

  if (!keyValid) {
    recordFailedLogin(clientIp);
    logAudit('RECOVERY_FAILED', cleanUsername, clientIp, 'FAILED', 'Invalid recovery key', user.clinicId);
    return res.status(400).json({ error: 'اسم المستخدم أو مفتاح الاسترجاع غير صحيح.' });
  }

  // Generate new salt, new password hash, and fresh new recovery key
  const newSalt = generateSalt();
  const newPasswordHash = hashPassword(newPassword, newSalt);
  const newRecoveryKey = generateRecoveryKey();
  const newRecoveryKeyHash = hashPassword(newRecoveryKey.trim().toUpperCase(), newSalt);

  clinicDb.updateUser(user.id, {
    salt: newSalt,
    passwordHash: newPasswordHash,
    recoveryKeyHash: newRecoveryKeyHash,
    mustChangePassword: false,
  }, user.clinicId);

  clearFailedLogin(clientIp);
  logAudit('DIRECTOR_RECOVERED', user.username, clientIp, 'SUCCESS', 'Password recovered with recovery key', user.clinicId);

  res.json({
    success: true,
    message: 'تمت استعادة كلمة المرور بنجاح! تم إنشاء مفتاح استرجاع جديد يرجى حفظه فوراً.',
    newRecoveryKey,
  });
});

// 5. Get Current User Info
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  const remainingMs = getSessionRemainingTime(token);
  res.json({
    user: (req as any).user,
    sessionRemainingMs: remainingMs,
    timeoutMs: INACTIVITY_TIMEOUT_MS,
  });
});

// 5b. Extend / Touch active session (Stay Connected)
app.post('/api/auth/extend-session', authenticate, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  const touched = touchSession(token);
  if (!touched) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' });
  }
  const remainingMs = getSessionRemainingTime(token);
  res.json({
    success: true,
    message: 'تم تمديد الجلسة بنجاح',
    remainingMs,
  });
});

// 5c. Check remaining session time
app.get('/api/auth/session-check', authenticate, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  const remainingMs = getSessionRemainingTime(token);
  res.json({
    valid: true,
    remainingMs,
    timeoutMs: INACTIVITY_TIMEOUT_MS,
  });
});

// 6. User Logout (Server-Side Session Invalidation)
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const headerToken = req.headers['x-session-token'] as string;
  const bearerToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = cookieToken || headerToken || bearerToken;

  const clientIp = getClientIp(req);
  let username = 'unknown';
  let clinicId = 'general';

  if (token) {
    const session = getSession(token, false);
    if (session) {
      username = session.username;
      clinicId = session.clinicId;
    }
    // Invalidate in memory map immediately
    destroySession(token);
    if (cookieToken && cookieToken !== token) destroySession(cookieToken);
    if (headerToken && headerToken !== token) destroySession(headerToken);
    console.log(`[AUTH_LOGOUT] Session destroyed and invalidated on server for user "${username}" (IP: ${clientIp})`);
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });

  logAudit('LOGOUT', username, clientIp, 'SUCCESS', 'User logged out and session destroyed', clinicId);
  res.json({ success: true, message: 'تم تسجيل الخروج وإبطال الجلسة في الخادم بنجاح' });
});

// 7. Mandatory or Voluntary Password Change
app.post('/api/auth/change-password', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const clientIp = getClientIp(req);
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'يرجى إدخال وتأكيد كلمة المرور الجديدة.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'كلمتا المرور غير متطابقتين.' });
  }

  const passCheck = validatePasswordStrength(newPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);

  clinicDb.updateUser(user.id, {
    passwordHash,
    salt,
    mustChangePassword: false,
  }, user.clinicId);

  logAudit('PASSWORD_CHANGED', user.username, clientIp, 'SUCCESS', 'User updated password', user.clinicId);
  res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح.' });
});

// ================= TEAM MANAGEMENT (DIRECTOR ONLY - SCOPED TO CLINIC) =================

// 8. Get Team Members for Current Clinic
app.get('/api/users', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const users = clinicDb.getUsers(clinicId).map(u => ({
    id: u.id,
    clinicId: u.clinicId,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: !!u.mustChangePassword,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
  res.json(users);
});

// 9. Add Employee to Clinic (Director only)
app.post('/api/users', authenticate, requireDoctor, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const clinicId = admin.clinicId;
  const clientIp = getClientIp(req);
  const { fullName, username, temporaryPassword, role } = req.body;

  if (!fullName || !username || !temporaryPassword) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة (الاسم الكامل، اسم المستخدم، كلمة المرور المؤقتة).' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'يجب أن يكون اسم المستخدم بين 3 و 30 حرفاً.' });
  }
  if (clinicDb.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً في النظام. يرجى اختيار اسم مستخدم آخر.' });
  }

  const passCheck = validatePasswordStrength(temporaryPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const targetRole = role === 'doctor' ? 'doctor' : 'assistant';
  const salt = generateSalt();
  const passwordHash = hashPassword(temporaryPassword, salt);

  const newUser = clinicDb.createUser({
    clinicId,
    username: cleanUsername,
    passwordHash,
    salt,
    fullName: fullName.trim(),
    role: targetRole,
    isActive: true,
    mustChangePassword: true, // Forces staff to change password on first login
  }, clinicId);

  logAudit('USER_CREATED', admin.username, clientIp, 'SUCCESS', `Created ${targetRole} ${cleanUsername}`, clinicId);

  res.status(201).json({
    id: newUser.id,
    clinicId: newUser.clinicId,
    username: newUser.username,
    fullName: newUser.fullName,
    role: newUser.role,
    isActive: newUser.isActive,
    mustChangePassword: newUser.mustChangePassword,
    createdAt: newUser.createdAt,
  });
});

// 10. Reset Staff Password (Director only)
app.put('/api/users/:id/reset-password', authenticate, requireDoctor, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const clinicId = admin.clinicId;
  const clientIp = getClientIp(req);
  const { newTemporaryPassword } = req.body;

  if (!newTemporaryPassword) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة المرور المؤقتة.' });
  }

  const passCheck = validatePasswordStrength(newTemporaryPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const targetUser = clinicDb.getUserById(req.params.id, clinicId);
  if (!targetUser) {
    return res.status(404).json({ error: 'المستخدم غير موجود ضمن فريق عيادتك.' });
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(newTemporaryPassword, newSalt);
  clinicDb.updateUser(targetUser.id, {
    salt: newSalt,
    passwordHash: newHash,
    mustChangePassword: true,
  }, clinicId);

  logAudit('PASSWORD_RESET', admin.username, clientIp, 'SUCCESS', `Reset password for ${targetUser.username}`, clinicId);
  res.json({ success: true, message: 'تمت إعادة تعيين كلمة المرور بنجاح. سيُطلب من الموظف تغييرها عند تسجيل الدخول.' });
});

// 11. Toggle Staff Active Status (Director only)
app.patch('/api/users/:id/toggle-status', authenticate, requireDoctor, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const clinicId = admin.clinicId;
  const clientIp = getClientIp(req);
  const targetUser = clinicDb.getUserById(req.params.id, clinicId);
  if (!targetUser) {
    return res.status(404).json({ error: 'المستخدم غير موجود ضمن فريق عيادتك.' });
  }

  if (targetUser.id === admin.id) {
    return res.status(400).json({ error: 'لا يمكنك تعطيل حسابك الشخصي كمدير للعيادة.' });
  }

  const updated = clinicDb.updateUser(targetUser.id, {
    isActive: !targetUser.isActive,
  }, clinicId);

  logAudit('USER_STATUS_TOGGLED', admin.username, clientIp, 'SUCCESS', `${targetUser.username} isActive: ${updated.isActive}`, clinicId);
  res.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
});

// 12. Delete Staff Member (Director only)
app.delete('/api/users/:id', authenticate, requireDoctor, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const clinicId = admin.clinicId;
  const clientIp = getClientIp(req);
  const targetUser = clinicDb.getUserById(req.params.id, clinicId);
  if (!targetUser) {
    return res.status(404).json({ error: 'المستخدم غير موجود ضمن فريق عيادتك.' });
  }

  if (targetUser.id === admin.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الشخصي.' });
  }

  clinicDb.deleteUser(targetUser.id, clinicId);
  logAudit('USER_DELETED', admin.username, clientIp, 'SUCCESS', `Deleted user ${targetUser.username}`, clinicId);
  res.json({ success: true, message: 'تم حذف الموظف بنجاح.' });
});

// 13. Audit Logs (Director only - Scoped to Clinic)
app.get('/api/audit-logs', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const logFile = path.join(process.cwd(), 'clinic_data', 'audit.log');
  if (!fs.existsSync(logFile)) {
    return res.json({ logs: [] });
  }
  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    // Filter lines belonging to this clinic
    const filtered = lines.filter(l => l.includes(`Clinic: ${clinicId}`) || (!l.includes('Clinic: ') && clinicId === 'cln-default'));
    const recent = filtered.slice(-200).reverse();
    res.json({ logs: recent });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ في قراءة سجلات المراقبة' });
  }
});

// ================= MEDICAL & CLINIC PROTECTED ROUTES (SCOPED) =================

// Network Info
app.get('/api/network-info', authenticate, (req: Request, res: Response) => {
  const ips = getLocalNetworkAddresses();
  res.json({
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrls: ips.map(ip => `http://${ip}:${PORT}`),
    primaryLanIp: ips[0] || '127.0.0.1',
  });
});

// Dashboard Stats (Scoped)
app.get('/api/dashboard/stats', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const stats = clinicDb.getDashboardStats(clinicId);
  res.json(stats);
});

// Date-specific appointment & patient stats (Scoped to Clinic)
app.get('/api/dashboard/date-stats', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const rawDate = (req.query.date as string) || '';
  const dateStr = rawDate ? rawDate.slice(0, 10) : '';
  const dateStats = clinicDb.getDateStats(clinicId, dateStr);
  res.json(dateStats);
});

// Total Registered Patients Count (Database Single Source of Truth)
app.get('/api/patients/total-count', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const totalRegisteredPatients = clinicDb.getTotalRegisteredPatientsCount(clinicId);
  res.json({ totalRegisteredPatients });
});

// Patient Follow-up Overview (Scoped - Doctor & Assistant)
app.get('/api/followup/overview', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const rawDays = parseInt(req.query.noReturnDays as string, 10);
  const noReturnDays = !isNaN(rawDays) && rawDays > 0 ? rawDays : 30;
  const overview = clinicDb.getFollowUpOverview(clinicId, noReturnDays);
  res.json(overview);
});

// Follow-up Records CRUD (Scoped - Doctor & Assistant)
app.get('/api/followups', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const statusFilter = req.query.status as string;
  const list = clinicDb.getFollowUps(clinicId, statusFilter);
  res.json(list);
});

app.get('/api/patients/:patientId/followups', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const list = clinicDb.getPatientFollowUps(clinicId, req.params.patientId);
  res.json(list);
});

app.post('/api/followups', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const user = (req as any).user;
  const {
    patientId,
    reason,
    nextProcedure,
    targetDate,
    priority,
    status,
    notes,
    appointmentId,
    createAppointment,
    appointmentTime,
  } = req.body;

  if (!patientId || !reason || !nextProcedure) {
    return res.status(400).json({ error: 'يرجى تحديد المريض، وسبب المتابعة، والإجراء المطلوب في الزيارة القادمة.' });
  }

  try {
    let linkedAppointmentId = appointmentId;

    // Optional: create linked scheduled appointment if requested and targetDate provided
    if (createAppointment && targetDate && !linkedAppointmentId) {
      try {
        const aptResult = clinicDb.createAppointment({
          patientId,
          appointmentDate: targetDate,
          appointmentTime: appointmentTime || '10:00',
          procedure: `متابعة: ${nextProcedure}`,
          status: 'scheduled',
          notes: notes ? `متابعة (${reason}): ${notes}` : `متابعة: ${reason}`,
        }, clinicId);
        if (aptResult?.appointment?.id) {
          linkedAppointmentId = aptResult.appointment.id;
        }
      } catch (aptErr) {
        console.warn('Could not auto-create appointment for follow-up:', aptErr);
      }
    }

    const record = clinicDb.createFollowUp(clinicId, {
      patientId,
      reason,
      nextProcedure,
      targetDate: targetDate || undefined,
      priority: priority || 'normal',
      status: status || 'pending',
      notes: notes || undefined,
      appointmentId: linkedAppointmentId,
      doctorName: user.fullName || 'طبيب العيادة',
    });

    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حفظ سجل المتابعة.' });
  }
});

app.put('/api/followups/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const updated = clinicDb.updateFollowUp(clinicId, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'سجل المتابعة غير موجود.' });
  }
  res.json(updated);
});

app.delete('/api/followups/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const deleted = clinicDb.deleteFollowUp(clinicId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'سجل المتابعة غير موجود أو تم حذفه مسبقاً.' });
  }
  res.json({ success: true, message: 'تم حذف سجل المتابعة بنجاح.' });
});

// Financial Stats (DOCTOR ONLY - Scoped)
app.get('/api/finance/stats', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const stats = clinicDb.getFinancialStats(clinicId);
  res.json(stats);
});

// Patients (Scoped)
app.get('/api/patients', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const query = (req.query.q as string || '').toLowerCase().trim();
  const typeFilter = req.query.type as string;
  let list = clinicDb.getPatients(clinicId);

  if (typeFilter && typeFilter !== 'all') {
    list = list.filter(p => p.patientType === typeFilter);
  }

  if (query) {
    list = list.filter(p =>
      p.fullName.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.id.toLowerCase().includes(query) ||
      (p.address && p.address.toLowerCase().includes(query)) ||
      (p.diseaseCondition && p.diseaseCondition.toLowerCase().includes(query))
    );
  }
  res.json(list);
});

// Recycle Bin (Trash) - Doctor Only (Placed before :id route)
app.get('/api/patients/trash', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const trashed = clinicDb.getDeletedPatients(clinicId);
  res.json(trashed);
});

app.get('/api/patients/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patient = clinicDb.getPatientById(req.params.id, clinicId);
  if (!patient) {
    return res.status(404).json({ error: 'المريض غير موجود' });
  }
  res.json(patient);
});

app.post('/api/patients', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const { fullName, phone, birthDate, gender, address, allergies, patientType, diseaseCondition, diseaseStatus, medications, notes } = req.body;
  if (!fullName || !phone) {
    return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  if (!/^(05|06|07)[0-9]{8}$/.test(cleanPhone) && !/^\+213(5|6|7)[0-9]{8}$/.test(cleanPhone)) {
    return res.status(400).json({
      error: 'رقم الهاتف يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.'
    });
  }

  const patient = clinicDb.createPatient({
    fullName: fullName.trim(),
    phone: cleanPhone,
    birthDate: birthDate || '',
    gender: gender || 'male',
    address: address || '',
    allergies: allergies || '',
    patientType: patientType || 'new',
    diseaseCondition: diseaseCondition ? diseaseCondition.trim() : undefined,
    diseaseStatus: diseaseStatus || 'active',
    medications: medications ? medications.trim() : '',
    notes: notes || '',
  }, clinicId);

  logAudit('PATIENT_CREATED', (req as any).user.username, clientIp, 'SUCCESS', `Added patient ID: ${patient.id}`, clinicId);
  res.status(201).json(patient);
});

app.put('/api/patients/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const updated = clinicDb.updatePatient(req.params.id, req.body, clinicId);
  if (!updated) {
    return res.status(404).json({ error: 'المريض غير موجود' });
  }
  logAudit('PATIENT_UPDATED', (req as any).user.username, clientIp, 'SUCCESS', `Updated patient ID: ${updated.id}`, clinicId);
  res.json(updated);
});

// Restore Patient from Recycle Bin - Doctor Only
app.post('/api/patients/:id/restore', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const restored = clinicDb.restorePatient(req.params.id, clinicId);
  if (!restored) {
    return res.status(404).json({ error: 'المريض غير موجود في سلة المحذوفات' });
  }
  logAudit('PATIENT_RESTORED', (req as any).user.username, clientIp, 'SUCCESS', `Restored patient ${req.params.id}`, clinicId);
  res.json({ success: true, patient: restored, message: 'تم استرجاع المريض بنجاح' });
});

// Permanent Purge from Recycle Bin - Doctor Only
app.delete('/api/patients/:id/purge', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const success = clinicDb.purgePatient(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'المريض غير موجود في سلة المحذوفات للحذف النهائي' });
  }
  logAudit('PATIENT_PURGED', (req as any).user.username, clientIp, 'SUCCESS', `Permanently purged patient ${req.params.id}`, clinicId);
  res.json({ success: true, message: 'تم الحذف النهائي للمريض بنجاح' });
});

// Soft-Delete Patient (Move to Recycle Bin) - Doctor Only
app.delete('/api/patients/:id', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const user = (req as any).user;
  const deleterName = user.fullName || user.username || 'طبيب العيادة';
  const success = clinicDb.deletePatient(req.params.id, clinicId, deleterName);
  if (!success) {
    return res.status(404).json({ error: 'المريض غير موجود' });
  }
  logAudit('PATIENT_TRASHED', user.username, clientIp, 'SUCCESS', `Moved patient ${req.params.id} to trash`, clinicId);
  res.json({ success: true, message: 'تم نقل المريض إلى سلة المحذوفات بنجاح' });
});

// Appointments (Scoped)
app.get('/api/appointments', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const date = req.query.date as string;
  const patientId = req.query.patientId as string;
  let list = clinicDb.getAppointments(clinicId);

  if (date) {
    list = list.filter(a => a.appointmentDate === date);
  }
  if (patientId) {
    list = list.filter(a => a.patientId === patientId);
  }

  list.sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime));
  res.json(list);
});

app.post('/api/appointments', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const { patientId, appointmentDate, appointmentTime, procedure, status, cost, paymentMethod, notes } = req.body;
  if (!patientId || !appointmentDate || !appointmentTime || !procedure) {
    return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة للموعد' });
  }

  const result = clinicDb.createAppointment({
    patientId,
    appointmentDate,
    appointmentTime,
    procedure,
    status: status || 'scheduled',
    cost: cost ? parseFloat(cost) : undefined,
    paymentMethod: paymentMethod || 'cash',
    notes: notes || '',
  }, clinicId);

  if (result.error) {
    return res.status(409).json({ error: result.error });
  }

  logAudit('APPOINTMENT_CREATED', (req as any).user.username, clientIp, 'SUCCESS', `Scheduled appointment for ${patientId} at ${appointmentDate} ${appointmentTime}`, clinicId);
  res.status(201).json(result.appointment);
});

app.put('/api/appointments/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const result = clinicDb.updateAppointment(req.params.id, req.body, clinicId);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const updatedApt = result.appointment;
  // Item 6: If appointment completed and has cost > 0, auto-create invoice if not already created
  if (updatedApt && updatedApt.status === 'completed' && typeof updatedApt.cost === 'number' && updatedApt.cost > 0) {
    const existingInvoice = clinicDb.getInvoices(undefined, clinicId).find(inv => inv.appointmentId === updatedApt.id);
    if (!existingInvoice) {
      clinicDb.createInvoice({
        patientId: updatedApt.patientId,
        appointmentId: updatedApt.id,
        date: updatedApt.appointmentDate || getClinicTodayStr(),
        description: updatedApt.procedure || 'كشف ومتابعة',
        totalAmount: updatedApt.cost,
        paidAmount: updatedApt.cost,
        paymentMethod: updatedApt.paymentMethod || 'cash',
        notes: `فاتورة تم إنشاؤها تلقائياً عند اكتمال الموعد [${updatedApt.id}]`,
      }, clinicId);
    }
  }

  res.json(result.appointment);
});

app.delete('/api/appointments/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const success = clinicDb.deleteAppointment(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'الموعد غير موجود' });
  }
  res.json({ success: true, message: 'تم حذف الموعد' });
});

// ================= INVOICES (SCOPED) =================
app.get('/api/invoices', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patientId = req.query.patientId as string | undefined;
  res.json(clinicDb.getInvoices(patientId, clinicId));
});

app.get('/api/invoices/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const inv = clinicDb.getInvoiceById(req.params.id, clinicId);
  if (!inv) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }
  res.json(inv);
});

app.post('/api/invoices', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const { patientId, appointmentId, date, description, totalAmount, paidAmount, paymentMethod, notes } = req.body;

  if (!patientId || !description || totalAmount === undefined || totalAmount === null || totalAmount === '') {
    return res.status(400).json({ error: 'بيانات الفاتورة غير مكتملة (المريض، الوصف، والمبلغ الكلي إلزامية)' });
  }

  const invoice = clinicDb.createInvoice({
    patientId,
    appointmentId: appointmentId || undefined,
    date: date || getClinicTodayStr(),
    description,
    totalAmount: parseFloat(totalAmount),
    paidAmount: paidAmount !== undefined && paidAmount !== null && paidAmount !== '' ? parseFloat(paidAmount) : 0,
    paymentMethod: paymentMethod || 'cash',
    notes: notes || '',
  }, clinicId);

  res.status(201).json(invoice);
});

app.put('/api/invoices/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const updated = clinicDb.updateInvoice(req.params.id, req.body, clinicId);
  if (!updated) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }
  res.json(updated);
});

app.delete('/api/invoices/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const success = clinicDb.deleteInvoice(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }
  res.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
});

app.post('/api/invoices/:id/payment', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const user = (req as any).user;
  const { amount, paymentMethod, note, date } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'يرجى إدخال مبلغ دفعة صحيح أكبر من الصفر' });
  }

  const updated = clinicDb.recordInvoicePayment(
    req.params.id,
    numAmount,
    paymentMethod,
    clinicId,
    note,
    date,
    user?.fullName || user?.username
  );
  if (!updated) {
    return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  }
  res.json(updated);
});

// Dental Conditions (Scoped)
app.get('/api/conditions', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patientId = req.query.patientId as string;
  res.json(clinicDb.getDentalConditions(patientId, clinicId));
});

app.post('/api/conditions', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const {
    patientId,
    toothNumber,
    conditionType,
    treatmentDone,
    treatmentPlanned,
    diagnosis,
    surface,
    surfaces,
    surfaceDetails,
    doctorName,
    visitId,
    history,
    status,
    cost,
    recordedDate,
    notes
  } = req.body;

  if (!patientId || !toothNumber || !conditionType) {
    return res.status(400).json({ error: 'بيانات السن والتشخيص مطلوبة' });
  }

  const condition = clinicDb.createDentalCondition({
    patientId,
    toothNumber: parseInt(toothNumber, 10),
    conditionType,
    surface: surface || (surfaces && surfaces.length > 0 ? surfaces.join('') : 'All'),
    surfaces: surfaces || (surface ? [surface] : []),
    surfaceDetails: surfaceDetails || {},
    diagnosis: diagnosis || '',
    treatmentPlanned: treatmentPlanned || '',
    treatmentDone: treatmentDone || '',
    doctorName: doctorName || '',
    visitId: visitId || '',
    history: history || undefined,
    status: status || 'in_progress',
    cost: cost !== undefined && cost !== null && cost !== '' ? parseFloat(cost) : undefined,
    recordedDate: recordedDate || getClinicTodayStr(),
    notes: notes || '',
  }, clinicId);

  res.status(201).json(condition);
});

app.put('/api/conditions/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const updated = clinicDb.updateDentalCondition(req.params.id, req.body, clinicId);
  if (!updated) {
    return res.status(404).json({ error: 'حالة السن غير موجودة' });
  }
  res.json(updated);
});

app.delete('/api/conditions/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const success = clinicDb.deleteDentalCondition(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'حالة السن غير موجودة' });
  }
  res.json({ success: true, message: 'تم حذف الحالة' });
});

// Clinical Notes (Scoped)
app.get('/api/notes', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patientId = req.query.patientId as string;
  if (!patientId) {
    return res.status(400).json({ error: 'معرّف المريض مطلوب' });
  }
  res.json(clinicDb.getClinicalNotes(patientId, clinicId));
});

app.post('/api/notes', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const { patientId, noteText, doctorName } = req.body;
  if (!patientId || !noteText) {
    return res.status(400).json({ error: 'نص الملاحظة مطلوب' });
  }

  const note = clinicDb.createClinicalNote({
    patientId,
    noteText,
    doctorName: doctorName || (req as any).user.fullName || 'طبيب العيادة'
  }, clinicId);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const success = clinicDb.deleteClinicalNote(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'الملاحظة غير موجودة' });
  }
  res.json({ success: true, message: 'تم حذف الملاحظة' });
});

// Patient Files (Scoped)
app.get('/api/files', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patientId = req.query.patientId as string;
  res.json(clinicDb.getPatientFiles(patientId, clinicId));
});

app.post('/api/files/upload', authenticate, upload.single('file'), (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف' });
    }
    const patientId = req.body.patientId;
    if (!patientId) {
      return res.status(400).json({ error: 'معرّف المريض مطلوب لربط الملف' });
    }
    const category = req.body.category || 'ملف عام';

    // Encrypt file in-place on disk with AES-256-GCM
    encryptionService.encryptFile(req.file.path, req.file.path, 'files');

    const fileRecord = clinicDb.addPatientFile({
      patientId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
    }, clinicId);

    logAudit('FILE_UPLOADED', (req as any).user.username, getClientIp(req), 'SUCCESS', `Uploaded and encrypted file for patient ID: ${patientId}`, clinicId);
    res.status(201).json(fileRecord);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل رفع وتشفير الملف' });
  }
});

app.get('/api/files/preview/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const file = clinicDb.getPatientFiles(undefined, clinicId).find(f => f.id === req.params.id);
  if (!file || !fs.existsSync(file.filePath)) {
    return res.status(404).json({ error: 'الملف غير موجود على القرص' });
  }
  try {
    const decrypted = encryptionService.readDecryptedFile(file.filePath, 'files');
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', decrypted.length);
    res.end(decrypted);
  } catch (err: any) {
    console.error('File decryption preview error:', err);
    res.status(500).json({ error: 'فشل فك تشفير الملف الطبي' });
  }
});

app.get('/api/files/download/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const file = clinicDb.getPatientFiles(undefined, clinicId).find(f => f.id === req.params.id);
  if (!file || !fs.existsSync(file.filePath)) {
    return res.status(404).json({ error: 'الملف غير موجود' });
  }
  try {
    const decrypted = encryptionService.readDecryptedFile(file.filePath, 'files');
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', decrypted.length);
    res.end(decrypted);
  } catch (err: any) {
    console.error('File decryption download error:', err);
    res.status(500).json({ error: 'فشل فك تشفير الملف للتحميل' });
  }
});

app.delete('/api/files/:id', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const success = clinicDb.deletePatientFile(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'الملف غير موجود' });
  }
  logAudit('FILE_DELETED', (req as any).user.username, getClientIp(req), 'SUCCESS', `Deleted file ${req.params.id}`, clinicId);
  res.json({ success: true, message: 'تم حذف الملف بنجاح' });
});

// ================= BEFORE & AFTER CASES (SCOPED) =================
app.get('/api/before-after', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const patientId = req.query.patientId as string;
  const category = req.query.category as string;
  let cases = clinicDb.getBeforeAfterCases(patientId, clinicId);
  if (category && category !== 'all' && category !== 'الكل') {
    cases = cases.filter(c => c.category === category);
  }
  res.json(cases);
});

app.post('/api/before-after', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const {
    patientId,
    patientName,
    category,
    procedureTitle,
    procedureDate,
    toothNumbers,
    beforeImageUrl,
    afterImageUrl,
    beforeNotes,
    afterNotes,
    clinicalNotes,
    doctorName,
    duration
  } = req.body;

  if (!patientId || !patientName || !category || !procedureTitle || !beforeImageUrl || !afterImageUrl) {
    return res.status(400).json({ error: 'يرجى ملء الحقول الإلزامية وتوفير صورتي قبل وبعد العلاج' });
  }

  const createdCase = clinicDb.createBeforeAfterCase({
    patientId,
    patientName,
    category,
    procedureTitle,
    procedureDate: procedureDate || getClinicTodayStr(),
    toothNumbers: toothNumbers || '',
    beforeImageUrl,
    afterImageUrl,
    beforeNotes: beforeNotes || '',
    afterNotes: afterNotes || '',
    clinicalNotes: clinicalNotes || '',
    doctorName: doctorName || (req as any).user.fullName || 'طبيب العيادة',
    duration: duration || '',
  }, clinicId);

  logAudit('BEFORE_AFTER_CREATED', (req as any).user.username, clientIp, 'SUCCESS', `Created before/after case for patient ID: ${patientId}`, clinicId);
  res.status(201).json(createdCase);
});

app.put('/api/before-after/:id', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const updated = clinicDb.updateBeforeAfterCase(req.params.id, req.body, clinicId);
  if (!updated) {
    return res.status(404).json({ error: 'الحالة العلاجية غير موجودة' });
  }
  logAudit('BEFORE_AFTER_UPDATED', (req as any).user.username, clientIp, 'SUCCESS', `Updated before/after case ${req.params.id}`, clinicId);
  res.json(updated);
});

app.delete('/api/before-after/:id', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const clientIp = getClientIp(req);
  const success = clinicDb.deleteBeforeAfterCase(req.params.id, clinicId);
  if (!success) {
    return res.status(404).json({ error: 'الحالة العلاجية غير موجودة' });
  }
  logAudit('BEFORE_AFTER_DELETED', (req as any).user.username, clientIp, 'SUCCESS', `Deleted before/after case ${req.params.id}`, clinicId);
  res.json({ success: true, message: 'تم حذف الحالة العلاجية بنجاح' });
});

// Settings (Scoped)
app.get('/api/settings', authenticate, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const settings = { ...clinicDb.getClinicSettings(clinicId) };
  res.json(settings);
});

app.put('/api/settings', authenticate, requireDoctor, (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  const updates = { ...req.body };
  const updated = clinicDb.updateClinicSettings(clinicId, updates);
  logAudit('SETTINGS_UPDATED', (req as any).user.username, getClientIp(req), 'SUCCESS', 'Clinic settings updated', clinicId);
  res.json(updated);
});

// Backup: Export (Scoped to Current Clinic)
app.get('/api/backup/export', authenticate, requireDoctor, async (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  try {
    const zipBuffer = await clinicDb.generateBackupZip(clinicId);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `نسخة_احتياطية_${dateStamp}.zip`;
    logAudit('BACKUP_EXPORTED', (req as any).user.username, getClientIp(req), 'SUCCESS', filename, clinicId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.end(zipBuffer);
  } catch (err: any) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'فشل تصدير النسخة الاحتياطية' });
  }
});

// Backup: Restore (Scoped to Current Clinic)
app.post('/api/backup/restore', authenticate, requireDoctor, upload.single('backupZip'), async (req: Request, res: Response) => {
  const clinicId = (req as any).user.clinicId;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى إرفاق ملف النسخة الاحتياطية (.zip)' });
    }
    const buffer = fs.readFileSync(req.file.path);
    const result = await clinicDb.restoreFromZip(buffer, clinicId);
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    logAudit('BACKUP_RESTORED', (req as any).user.username, getClientIp(req), 'SUCCESS', result.message, clinicId);
    res.json({ success: true, message: result.message });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشلت الاستعادة' });
  }
});



// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkAddresses();
    const loadedUsers = clinicDb.getUsers();
    const loadedPatients = clinicDb.getPatients();
    const isPersistent = isPersistentEnvironment();
    const storageType = getStorageType();
    console.log(`=======================================================`);
    console.log(`       لوحة تحكم إدارة عيادة طب وجراحة الأسنان         `);
    console.log(`=======================================================`);
    console.log(`  المنفذ: ${PORT}`);
    console.log(`  - محلياً: http://localhost:${PORT}`);
    ips.forEach(ip => {
      console.log(`  - شبكة العيادة LAN: http://${ip}:${PORT}`);
    });
    console.log(`-------------------------------------------------------`);
    console.log(`  قاعدة البيانات: ${getDbFilePath()}`);
    console.log(`  مجلد البيانات: ${getDataDirPath()}`);
    console.log(`  المستخدمون المحمّلون: ${loadedUsers.length} | إجمالي المرضى: ${loadedPatients.length}`);
    console.log(`  نوع بيئة التخزين: ${isPersistent ? 'تخزين محلّي دائم' : 'بيئة سحابية مؤقتة (Ephemeral Cloud)'} [${storageType}]`);
    if (!isPersistent) {
      console.warn(`  ⚠️ تنبيه: التطبيق يعمل في بيئة سحابية مؤقتة. البيانات لا تستمر بعد إعادة تشغيل الحاوية.`);
      console.warn(`     للاستخدام الإنتاجي في العيادة، شغّل المشروع على حاسوب العيادة المحلي مع ضبط DATA_DIR.`);
    }
    console.log(`=======================================================`);



    // Auto-Purge check for expired trashed patients (older than 30 days) - once daily
    const runAutoPurgeCheck = () => {
      try {
        clinicDb.autoPurgeExpiredDeletedPatients();
      } catch (e) {
        console.warn('[Auto-Purge] Error during daily check:', e);
      }
    };
    setTimeout(runAutoPurgeCheck, 10000);
    setInterval(runAutoPurgeCheck, 24 * 60 * 60 * 1000);
  });
}

startServer();
