@echo off
setlocal

cd /d "%~dp0"

echo.
echo ============================================
echo   MediReservas - instalacion y ejecucion
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar-y-ejecutar.ps1"

echo.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
