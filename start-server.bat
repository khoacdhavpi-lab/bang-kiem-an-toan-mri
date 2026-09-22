@echo off
title He Thong Bang Kiem An Toan Chup MRI Truc Tuyen
chcp 65001 >nul
cls

echo ====================================================================
echo   HỆ THỐNG BẢNG KIỂM AN TOÀN CHỤP MRI TRỰC TUYẾN ĐA NGÔN NGỮ
echo   Khoa Chẩn Đoán Hình Ảnh • Bệnh Viện Đa Khoa
echo ====================================================================
echo.
echo Đang kiểm tra môi trường chạy...

where agy-node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy môi trường runtime agy-node. Đang khởi động...
    echo.
    agy-node server.js
    goto end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy Node.js. Đang khởi động...
    echo.
    node server.js
    goto end
)

echo [CHÚ Ý] Không tìm thấy lệnh node hoặc agy-node trong PATH mặc định.
echo Đang thử chạy bằng Electron Node từ Antigravity...
set ELECTRON_RUN_AS_NODE=1
"C:\Users\bbt\AppData\Local\Programs\antigravity\Antigravity.exe" server.js

:end
pause
