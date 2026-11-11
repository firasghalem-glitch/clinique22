import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { clinicDb, User, DATA_DIR, SESSIONS_FILE } from './db';

const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit.log');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ================= PASSWORD SECURITY (scrypt + multi-algorithm fallback) =================
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'admin123',
  'admin1234',
  'doctor123',
  'qwerty123',
  '11111111',
  '00000000',
  'clinic123',
  'dentist123',
  'algeria123',
  'dzair1234',
]);

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'يجب ألا تقل كلمة المرور عن 6 خانات للأمان.' };
  }
  return { valid: true };
}

export function generateRecoveryKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const block = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `DENT-${block()}-${block()}-${block()}-${block()}`;
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return derivedKey.toString('hex');
}

export interface VerifyPasswordResult {
  valid: boolean;
  needsRehash?: boolean;
}

export function verifyPassword(password: string, salt: string, storedHashHex: string): VerifyPasswordResult {
  try {
    if (!password || !storedHashHex) {
      return { valid: false };
    }

    const storedBuffer = Buffer.from(storedHashHex, 'hex');

    // 1. Primary standard scrypt: 64 bytes, N=16384, r=8, p=1
    try {
      const computedHash = crypto.scryptSync(password, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      });
      if (computedHash.length === storedBuffer.length && crypto.timingSafeEqual(computedHash, storedBuffer)) {
        return { valid: true };
      }
    } catch {}

    // 1b. Trimmed password scrypt
    if (password.trim() !== password) {
      try {
        const computedTrimmed = crypto.scryptSync(password.trim(), salt, 64, {
          N: 16384,
          r: 8,
          p: 1,
        });
        if (computedTrimmed.length === storedBuffer.length && crypto.timingSafeEqual(computedTrimmed, storedBuffer)) {
          return { valid: true, needsRehash: true };
        }
      } catch {}
    }

    // 2. Legacy scrypt 32 bytes (if hex length is 64)
    if (storedHashHex.length === 64) {
      try {
        const scrypt32 = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
        if (scrypt32.length === storedBuffer.length && crypto.timingSafeEqual(scrypt32, storedBuffer)) {
          return { valid: true, needsRehash: true };
        }
      } catch {}
    }

    // 3. Legacy PBKDF2 sha512 (10000 or 1000 iterations, 64 bytes)
    for (const iter of [10000, 1000]) {
      try {
        const pbkdf2_512 = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512');
        if (pbkdf2_512.length === storedBuffer.length && crypto.timingSafeEqual(pbkdf2_512, storedBuffer)) {
          return { valid: true, needsRehash: true };
        }
      } catch {}
    }

    // 4. Legacy PBKDF2 sha256 (1000 iterations, 32 bytes)
    if (storedHashHex.length === 64) {
      try {
        const pbkdf2_256 = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256');
        if (pbkdf2_256.length === storedBuffer.length && crypto.timingSafeEqual(pbkdf2_256, storedBuffer)) {
          return { valid: true, needsRehash: true };
        }
      } catch {}
    }

    // 5. Legacy sha256(salt + password)
    if (storedHashHex.length === 64) {
      try {
        const sha256Buf = crypto.createHash('sha256').update(salt + password).digest();
        if (sha256Buf.length === storedBuffer.length && crypto.timingSafeEqual(sha256Buf, storedBuffer)) {
          return { valid: true, needsRehash: true };
        }
      } catch {}
    }

    return { valid: false };
  } catch (err) {
    return { valid: false };
  }
}

// ================= SESSION MANAGEMENT =================
export interface SessionData {
  userId: string;
  clinicId: string;
  clinicName: string;
  username: string;
  fullName: string;
  role: 'doctor' | 'assistant';
  mustChangePassword?: boolean;
  createdAt: number;
  lastActivityAt: number;
  ip: string;
}

const sessions = new Map<string, SessionData>();
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
export const MAX_SESSION_LIFESPAN_MS = 12 * 60 * 60 * 1000; // 12 hours
let lastSessionPersistTimestamp = 0;

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Loads valid sessions from disk (DATA_DIR/sessions.json).
 * Automatically prunes any sessions that exceeded max lifespan or idle timeout.
 */
export function loadPersistedSessions(): number {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return 0;
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    if (!raw.trim()) return 0;
    const data = JSON.parse(raw);
    const now = Date.now();
    let loadedCount = 0;
    if (data && typeof data === 'object') {
      for (const [hash, sess] of Object.entries(data)) {
        const s = sess as SessionData;
        if (s && s.createdAt && s.lastActivityAt && s.userId) {
          if (
            now - s.createdAt <= MAX_SESSION_LIFESPAN_MS &&
            now - s.lastActivityAt <= INACTIVITY_TIMEOUT_MS
          ) {
            sessions.set(hash, s);
            loadedCount++;
          }
        }
      }
    }
    console.log(`[AUTH_SESSIONS] Restored ${loadedCount} active sessions from disk (${SESSIONS_FILE})`);
    return loadedCount;
  } catch (err) {
    console.warn(`[AUTH_SESSIONS] Warning: Could not parse persisted sessions:`, err);
    return 0;
  }
}

/**
 * Persists current in-memory sessions atomically to SESSIONS_FILE with fsync.
 */
export function persistSessionsToDisk(): void {
  try {
    const now = Date.now();
    const validSessions: Record<string, SessionData> = {};
    for (const [hash, sess] of sessions.entries()) {
      if (
        now - sess.createdAt <= MAX_SESSION_LIFESPAN_MS &&
        now - sess.lastActivityAt <= INACTIVITY_TIMEOUT_MS
      ) {
        validSessions[hash] = sess;
      } else {
        sessions.delete(hash);
      }
    }

    const targetDir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const tmpFile = `${SESSIONS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const payload = JSON.stringify(validSessions, null, 2);
    const fd = fs.openSync(tmpFile, 'w');
    try {
      fs.writeSync(fd, payload, 0, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    fs.renameSync(tmpFile, SESSIONS_FILE);
    lastSessionPersistTimestamp = now;
  } catch (err) {
    console.error(`[AUTH_SESSIONS] Error writing sessions to disk:`, err);
  }
}

// Restore sessions immediately on module load
loadPersistedSessions();

export function createSession(user: User, clinicName: string, ip: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  sessions.set(tokenHash, {
    userId: user.id,
    clinicId: user.clinicId || 'cln-default',
    clinicName: clinicName || 'عيادة الأسنان',
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    createdAt: now,
    lastActivityAt: now,
    ip,
  });
  persistSessionsToDisk();
  return rawToken;
}

export function getSession(rawToken: string, touch: boolean = true): SessionData | null {
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const session = sessions.get(tokenHash);
  if (!session) return null;

  const now = Date.now();
  if (now - session.createdAt > MAX_SESSION_LIFESPAN_MS) {
    sessions.delete(tokenHash);
    persistSessionsToDisk();
    return null;
  }
  if (now - session.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
    sessions.delete(tokenHash);
    persistSessionsToDisk();
    return null;
  }

  if (touch) {
    session.lastActivityAt = now;
    if (now - lastSessionPersistTimestamp > 15000) {
      persistSessionsToDisk();
    }
  }
  return session;
}

export function touchSession(rawToken: string): boolean {
  if (!rawToken) return false;
  const tokenHash = hashSessionToken(rawToken);
  const session = sessions.get(tokenHash);
  if (!session) return false;

  const now = Date.now();
  if (now - session.createdAt > MAX_SESSION_LIFESPAN_MS || now - session.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
    sessions.delete(tokenHash);
    persistSessionsToDisk();
    return false;
  }

  session.lastActivityAt = now;
  if (now - lastSessionPersistTimestamp > 15000) {
    persistSessionsToDisk();
  }
  return true;
}

export function getSessionRemainingTime(rawToken: string): number {
  if (!rawToken) return 0;
  const tokenHash = hashSessionToken(rawToken);
  const session = sessions.get(tokenHash);
  if (!session) return 0;

  const now = Date.now();
  const inactiveElapsed = now - session.lastActivityAt;
  const remaining = INACTIVITY_TIMEOUT_MS - inactiveElapsed;
  return remaining > 0 ? remaining : 0;
}

export function destroySession(rawToken: string): void {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  sessions.delete(tokenHash);
  persistSessionsToDisk();
}

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [hash, sess] of sessions.entries()) {
    if (
      now - sess.createdAt > MAX_SESSION_LIFESPAN_MS ||
      now - sess.lastActivityAt > INACTIVITY_TIMEOUT_MS
    ) {
      sessions.delete(hash);
      changed = true;
    }
  }
  if (changed) {
    persistSessionsToDisk();
  }
}, 5 * 60 * 1000);

// ================= ANTI-BRUTE FORCE & RATE LIMITING =================
interface AttemptRecord {
  attempts: number;
  lockedUntil?: number;
  firstAttemptAt: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingLockoutMinutes?: number; lockedUntil?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return { allowed: false, remainingLockoutMinutes: remainingMinutes, lockedUntil: record.lockedUntil };
    } else {
      // Lockout duration has expired - clear it
      loginAttempts.delete(ip);
      return { allowed: true };
    }
  }

  // If previous failed attempts happened more than LOCKOUT_DURATION_MS ago, reset counter
  if (now - record.firstAttemptAt > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string): { locked: boolean; remainingLockoutMinutes?: number; lockedUntil?: number } {
  const now = Date.now();
  let record = loginAttempts.get(ip);

  // If previous attempts or lockout expired, reset to fresh attempt
  if (record) {
    if (record.lockedUntil && now >= record.lockedUntil) {
      record = undefined;
      loginAttempts.delete(ip);
    } else if (now - record.firstAttemptAt > LOCKOUT_DURATION_MS) {
      record = undefined;
      loginAttempts.delete(ip);
    }
  }

  if (!record) {
    record = { attempts: 0, firstAttemptAt: now };
  }

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttempts.set(ip, record);
    return { locked: true, remainingLockoutMinutes: Math.ceil(LOCKOUT_DURATION_MS / 60000), lockedUntil: record.lockedUntil };
  }

  loginAttempts.set(ip, record);
  return { locked: false };
}

export function clearFailedLogin(ip: string): void {
  loginAttempts.delete(ip);
}

export function clearAllLoginRateLimits(): void {
  loginAttempts.clear();
}

// ================= AUDIT LOGGING =================
export function logAudit(
  action: string,
  username: string,
  ip: string,
  status: 'SUCCESS' | 'FAILED' | 'LOCKED' | 'DENIED' | 'SECURITY',
  details: string = '',
  clinicId: string = 'general'
): void {
  try {
    const timestamp = new Date().toISOString();
    const cleanAction = action.replace(/[\r\n]/g, ' ');
    const cleanUser = (username || 'unknown').replace(/[\r\n]/g, ' ');
    const cleanIp = ip.replace(/[\r\n]/g, ' ');
    const cleanDetails = details.replace(/[\r\n]/g, ' ');
    const cleanClinicId = (clinicId || 'general').replace(/[\r\n]/g, ' ');
    const line = `[${timestamp}] Clinic: ${cleanClinicId} | IP: ${cleanIp} | User: ${cleanUser} | Action: ${cleanAction} | Status: ${status} | Details: ${cleanDetails}\n`;
    fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf-8');
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}

// ================= IP & NETWORK SECURITY =================
export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (typeof xForwardedFor === 'string' ? xForwardedFor : (xForwardedFor as string[])[0]).split(',');
    return ips[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export function isLocalhost(req: Request): boolean {
  const ip = getClientIp(req);
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || '';
  const host = (forwardedHost || req.headers.host || req.hostname || '').toLowerCase();

  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost' ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    return true;
  }
  if (host.includes('run.app')) {
    return true;
  }
  return false;
}

export function isAllowedClinicNetwork(req: Request): boolean {
  const ip = getClientIp(req);
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || '';
  const host = (forwardedHost || req.headers.host || req.hostname || '').toLowerCase();

  if (host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  ) {
    return true;
  }

  const cleanIp = ip.replace(/^::ffff:/, '');
  if (cleanIp.startsWith('192.168.')) return true;
  if (cleanIp.startsWith('10.')) return true;
  if (cleanIp.startsWith('172.')) {
    const parts = cleanIp.split('.');
    const secondOctet = parseInt(parts[1], 10);
    if (!isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }
  return false;
}

// ================= MIDDLEWARES =================
export const SESSION_COOKIE_NAME = 'clinic_session';

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
}

export function originGuardMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
    const hostHeader = (req.headers.host || '').trim();
    const currentHost = (forwardedHost || hostHeader || req.hostname || '').toLowerCase();

    const isAuthorized = (urlStr: string): boolean => {
      try {
        const parsed = new URL(urlStr);
        const parsedHost = parsed.host.toLowerCase();
        const parsedHostname = parsed.hostname.toLowerCase();

        if (
          parsedHost === currentHost ||
          parsedHostname === currentHost.split(':')[0] ||
          parsedHost === hostHeader.toLowerCase() ||
          parsedHostname === hostHeader.toLowerCase().split(':')[0]
        ) {
          return true;
        }

        const isTargetLoopback = parsedHostname === 'localhost' || parsedHostname === '127.0.0.1' || parsedHostname === '::1';
        const isCurrentLoopback = currentHost.includes('localhost') || currentHost.includes('127.0.0.1') || currentHost.includes('::1') || hostHeader.includes('localhost');
        if (isTargetLoopback && isCurrentLoopback) {
          return true;
        }

        // Allow all local private clinic networks (LAN)
        if (
          parsedHostname.startsWith('192.168.') ||
          parsedHostname.startsWith('10.') ||
          parsedHostname.startsWith('172.') ||
          isTargetLoopback
        ) {
          return true;
        }

        if (
          parsedHostname.endsWith('.run.app') ||
          parsedHostname.endsWith('.google.com') ||
          parsedHostname.endsWith('.googleusercontent.com')
        ) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    if (origin) {
      if (!isAuthorized(origin)) {
        logAudit('CSRF_ATTEMPT', 'unknown', getClientIp(req), 'DENIED', `Origin mismatch: ${origin} vs ${currentHost}`);
        res.status(403).json({ error: 'رفض الاتصال بسبب اختلاف النطاق (Origin) غير المصرح به.' });
        return;
      }
    } else if (referer) {
      if (!isAuthorized(referer)) {
        logAudit('CSRF_ATTEMPT', 'unknown', getClientIp(req), 'DENIED', `Referer mismatch: ${referer} vs ${currentHost}`);
        res.status(403).json({ error: 'رفض الاتصال بسبب رابط التحويل غير المصرح به.' });
        return;
      }
    }
  }
  next();
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME] ||
    (req.headers['x-session-token'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null) ||
    (req.query?.token as string) ||
    (req.query?.sessionToken as string);

  if (!token) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للوصول إلى النظام.' });
    return;
  }

  const session = getSession(token);
  if (!session) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
    });
    console.warn(`[AUTH_INACTIVITY] Session has expired (inactivity >30m) for request ${req.method} ${req.path} from IP: ${getClientIp(req)}`);
    res.status(401).json({ error: 'انتهت صلاحية الجلسة بسبب عدم النشاط (30 دقيقة). يرجى تسجيل الدخول مجدداً.' });
    return;
  }

  const user = clinicDb.getUserById(session.userId);
  if (!user || !user.isActive) {
    destroySession(token);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(401).json({ error: 'الحساب غير موجود أو تم تعطيله من قبل الطبيب.' });
    return;
  }

  const clinic = clinicDb.getClinicById(user.clinicId);

  (req as any).user = {
    id: user.id,
    clinicId: user.clinicId || 'cln-default',
    clinicName: clinic?.name || session.clinicName || 'عيادة الأسنان',
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
  (req as any).sessionToken = token;
  next();
}

export function requireDoctor(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || user.role !== 'doctor') {
    logAudit('ACCESS_DENIED', user?.username || 'unknown', getClientIp(req), 'DENIED', `Unauthorized access to ${req.originalUrl}`);
    res.status(403).json({ error: 'هذا القسم مخصص لطبيب الأسنان فقط.' });
    return;
  }
  next();
}
