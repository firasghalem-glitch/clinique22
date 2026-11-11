@echo off
chcp 65001 >nul
title منظومة إدارة عيادة طب وجراحة الأسنان
color 0A

echo =======================================================
echo     منظومة إدارة عيادة طب وجراحة الأسنان (النسخة المحلية)
echo =======================================================
echo.

:: التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] لم يتم العثور على Node.js في هذا الحاسوب!
    echo يرجى تحميل وتثبيت Node.js الإصدار المستقر (LTS) من الموقع:
    echo https://nodejs.org/
    echo بعد التثبيت أعد تشغيل هذا الملف.
    echo.
    pause
    exit /b 1
)

:: تحديد مسار البيانات الدائم على القرص المحلي
if "%DATA_DIR%"=="" (
    set "DATA_DIR=%~dp0clinic_data"
)

echo [1/3] مسار مجلد البيانات الدائم: %DATA_DIR%
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

:: التحقق من تثبيت الاعتماديات
if not exist "node_modules" (
    echo [2/3] جاري تثبيت المكتبات للمرة الأولى، يرجى الانتظار...
    call npm install
    if %errorlevel% neq 0 (
        echo [خطأ] فشل تثبيت المكتبات.
        pause
        exit /b 1
    )
) else (
    echo [2/3] المكتبات جاهزة للتشغيل.
)

echo [3/3] جاري تشغيل الخادم ولوحة تحكم العيادة...
echo.
echo =======================================================
echo  افتح المتصفح وتوجه إلى الرابط التالي:
echo  http://localhost:3000
echo =======================================================
echo.

call npm run dev
pause
