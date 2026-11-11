/**
 * Automated Database Persistence & Safety Test Script
 * Run with: npm run test:persistence
 *
 * This test runs in an isolated temporary directory in os.tmpdir()
 * to guarantee that real clinic data is never touched or polluted.
 */

import os from 'os';
import fs from 'fs';
import path from 'path';

// 1. Set DATA_DIR to an isolated temp directory BEFORE importing db or auth modules
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-test-persistence-'));
process.env.DATA_DIR = tempDir;

async function runPersistenceTests() {
  console.log('\x1b[36m%s\x1b[0m', '=======================================================');
  console.log('\x1b[36m%s\x1b[0m', '   بدء فحص واختبار أمان وديمومة قاعدة البيانات والجلسات   ');
  console.log('\x1b[36m%s\x1b[0m', '=======================================================');

  // Dynamic import AFTER process.env.DATA_DIR is set
  const {
    clinicDb,
    DB_FILE,
    DATA_DIR,
    SESSIONS_FILE,
    getDbFilePath,
    getDataDirPath,
    hashPassword,
    generateSalt,
  } = await import('./db.js');

  const {
    verifyPassword,
    createSession,
    getSession,
    destroySession,
    loadPersistedSessions,
  } = await import('./auth.js');

  console.log(`- مجلد البيانات المؤقت المعزول: ${getDataDirPath()}`);
  console.log(`- مسار قاعدة البيانات التجريبية: ${getDbFilePath()}`);

  if (getDataDirPath() !== tempDir) {
    throw new Error(`خطأ حرج: مجلد البيانات لم يتم عزله في المجلد المؤقت! المسار الحالي: ${getDataDirPath()}`);
  }

  const rawPassword = 'ClinicSecurePassword2026!';
  const testUsername = `test_doctor_${Date.now()}`;
  let createdClinicId: string = '';
  let createdUserId: string = '';

  try {
    // -------------------------------------------------------------
    // الاختبار 1: إنشاء عيادة ومستخدم، حفظ الحالة، إعادة التحميل والتحقق من verifyPassword
    // -------------------------------------------------------------
    console.log('\n[TEST 1] اختبار إنشاء عيادة ومستخدم وحفظهما والتحقق بعد محاكاة إعادة التشغيل...');
    const salt = generateSalt();
    const passwordHash = hashPassword(rawPassword, salt);

    const { clinic, user } = clinicDb.createClinic({
      clinicName: 'عيادة الاختبار المعزولة',
      doctorName: 'د. كريم التجريبي',
      username: testUsername,
      passwordHash,
      salt,
    });
    createdClinicId = clinic.id;
    createdUserId = user.id;

    // Flush to disk
    clinicDb.saveStateSync(clinicDb.getState());

    // Verify DB_FILE exists in isolated temp dir
    if (!fs.existsSync(DB_FILE)) {
      throw new Error(`ملف قاعدة البيانات لم يُكتب في المجلد المؤقت: ${DB_FILE}`);
    }

    // Simulate server reboot by reloading fresh from disk
    const reloadedState = clinicDb.reloadFromDisk();

    // Verify user by exact username
    const verifiedUser = clinicDb.getUserByUsername(testUsername);
    if (!verifiedUser) {
      throw new Error(`فشل العثور على المستخدم ${testUsername} بعد إعادة القراءة من القرص.`);
    }

    if (verifiedUser.id !== createdUserId) {
      throw new Error(`معرّف المستخدم غير متطابق بعد إعادة التحميل.`);
    }

    // Test verifyPassword
    const passCheck = verifyPassword(rawPassword, verifiedUser.salt, verifiedUser.passwordHash);
    if (!passCheck.valid) {
      throw new Error(`فشل التحقق من صحة كلمة المرور للمستخدم بعد إعادة تحميل قاعدة البيانات!`);
    }

    // Test exact username match only (no alias match)
    const nonExistentDoc = clinicDb.getUserByUsername('doctor');
    const nonExistentFiras = clinicDb.getUserByUsername('firas');
    if (nonExistentDoc || nonExistentFiras) {
      throw new Error('فشل التحقق: ما زالت الدالة getUserByUsername تطابق الأسماء البديلة غير المخزنة!');
    }

    console.log('\x1b[32m✔ نجح الاختبار 1: تم حفظ العيادة والمستخدم والتحقق من verifyPassword بنجاح بعد محاكاة إعادة التشغيل.\x1b[0m');

    // -------------------------------------------------------------
    // الاختبار 2: اختبار الكتابة الذرية والتعافي التلقائي من النسخ الاحتياطية
    // -------------------------------------------------------------
    console.log('\n[TEST 2] اختبار سلامة النسخ الاحتياطية والتعافي التلقائي عند تلف أو فقدان الملف...');
    const bak1File = path.join(DATA_DIR, 'clinic_database.bak1.json');
    if (!fs.existsSync(bak1File)) {
      throw new Error('لم يتم إنشاء النسخة الاحتياطية الأولى clinic_database.bak1.json أثناء الحفظ.');
    }

    // A) Simulate corrupted file
    fs.writeFileSync(DB_FILE, '{"corrupted": true, INVALID_JSON_TRIGGER_ERROR', 'utf-8');
    const stateAfterCorruption = clinicDb.reloadFromDisk();
    if (!stateAfterCorruption || !stateAfterCorruption.users || stateAfterCorruption.users.length === 0) {
      throw new Error('فشلت الاستعادة التلقائية من النسخة الاحتياطية عند تلف الملف الرئيسي.');
    }

    // Verify corrupt file preservation
    const corruptFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('clinic_database.corrupt-'));
    if (corruptFiles.length === 0) {
      throw new Error('لم يتم نسخ الملف التالف إلى clinic_database.corrupt-*.json.');
    }

    // B) Simulate missing DB_FILE (deleted/lost) with backups available
    fs.unlinkSync(DB_FILE);
    if (fs.existsSync(DB_FILE)) {
      throw new Error('فشل حذف DB_FILE لمحاكاة الفقدان.');
    }

    const stateAfterMissingFile = clinicDb.reloadFromDisk();
    if (!stateAfterMissingFile || !stateAfterMissingFile.users || stateAfterMissingFile.users.length === 0) {
      throw new Error('فشلت الاستعادة التلقائية لقاعدة البيانات عند فقدان DB_FILE مع وجود نسخ احتياطية.');
    }
    if (!fs.existsSync(DB_FILE)) {
      throw new Error('لم يتم إعادة كتابة DB_FILE المستعاد بعد الاستعادة التلقائية من النسخ الاحتياطية.');
    }

    console.log('\x1b[32m✔ نجح الاختبار 2: التعافي التلقائي يعمل بكفاءة عند تلف أو فقدان الملف الرئيسي.\x1b[0m');

    // -------------------------------------------------------------
    // الاختبار 3: اختبار استمرار الجلسات في sessions.json
    // -------------------------------------------------------------
    console.log('\n[TEST 3] اختبار استمرار الجلسات النشطة في sessions.json...');
    const rawSessionToken = createSession(verifiedUser, 'عيادة الاختبار المعزولة', '127.0.0.1');

    if (!fs.existsSync(SESSIONS_FILE)) {
      throw new Error(`ملف الجلسات ${SESSIONS_FILE} لم يُنشأ على القرص.`);
    }

    const activeSession = getSession(rawSessionToken, false);
    if (!activeSession || activeSession.username !== testUsername) {
      throw new Error('الجلسة غير صالحة في الذاكرة.');
    }

    // Simulate server reboot by calling loadPersistedSessions
    const restoredCount = loadPersistedSessions();
    if (restoredCount < 1) {
      throw new Error('فشلت قراءة الجلسات المستمرة من القرص عند محاكاة إعادة تشغيل الخادم.');
    }

    const sessionAfterReboot = getSession(rawSessionToken, false);
    if (!sessionAfterReboot || sessionAfterReboot.userId !== createdUserId) {
      throw new Error('فشل استعادة الجلسة بعد إعادة تشغيل الخادم.');
    }

    // Test logout / session destruction
    destroySession(rawSessionToken);
    const sessionAfterDestroy = getSession(rawSessionToken, false);
    if (sessionAfterDestroy) {
      throw new Error('الجلسة لم تُحذف بعد تسجيل الخروج.');
    }

    console.log('\x1b[32m✔ نجح الاختبار 3: الجلسات تُحفظ على القرص وتستمر عبر إعادة تشغيل الخادم وتُلغى عند الخروج.\x1b[0m');

    console.log('\n=======================================================');
    console.log('\x1b[32m%s\x1b[0m', 'PASS');
    console.log('\x1b[32m%s\x1b[0m', 'جميع اختبارات الأمان والديمومة والكتابة الذرية والجلسات نجحت بنسبة 100%!');
    console.log('=======================================================');
    return true;
  } catch (err: any) {
    console.error('\n=======================================================');
    console.error('\x1b[31m%s\x1b[0m', 'FAIL');
    console.error('\x1b[31m%s\x1b[0m', `فشل اختبار الديمومة: ${err.message}`);
    console.error(err);
    console.error('=======================================================');
    return false;
  } finally {
    // Completely remove isolated temporary test directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`\n[CLEANUP] تم حذف مجلد الاختبار المؤقت بالكامل بنجاح: ${tempDir}`);
      }
    } catch (cleanupErr) {
      console.warn('تحذير: تعذّر حذف المجلد المؤقت:', cleanupErr);
    }
  }
}

runPersistenceTests().then((success) => {
  process.exit(success ? 0 : 1);
});
