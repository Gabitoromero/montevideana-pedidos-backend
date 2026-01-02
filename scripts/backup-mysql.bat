@echo off
REM Script de Backup Automático de MySQL para Windows
REM Configuración para Montevideana Pedidos Backend

REM ============================================
REM CONFIGURACIÓN
REM ============================================

REM Cargar variables de entorno desde .env
for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#"') do set %%a

REM Configuración de backup
set BACKUP_DIR=backups\mysql
set RETENTION_DAYS=30
set DATE=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%
set BACKUP_FILE=%BACKUP_DIR%\backup_%DB_NAME%_%DATE%.sql
set LOG_FILE=%BACKUP_DIR%\backup.log

REM ============================================
REM CREAR DIRECTORIO DE BACKUPS
REM ============================================

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM ============================================
REM REALIZAR BACKUP
REM ============================================

echo [%date% %time%] Iniciando backup de base de datos: %DB_NAME% >> "%LOG_FILE%"

REM Ejecutar mysqldump (asegúrate de que MySQL esté en el PATH)
mysqldump ^
    --host=%DB_HOST% ^
    --port=%DB_PORT% ^
    --user=%DB_USER% ^
    --password=%DB_PASSWORD% ^
    --single-transaction ^
    --routines ^
    --triggers ^
    --events ^
    --databases %DB_NAME% ^
    > "%BACKUP_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Backup completado exitosamente: %BACKUP_FILE% >> "%LOG_FILE%"
    
    REM Comprimir con 7-Zip si está disponible
    if exist "C:\Program Files\7-Zip\7z.exe" (
        "C:\Program Files\7-Zip\7z.exe" a -tgzip "%BACKUP_FILE%.gz" "%BACKUP_FILE%"
        del "%BACKUP_FILE%"
        echo [%date% %time%] Backup comprimido: %BACKUP_FILE%.gz >> "%LOG_FILE%"
    )
) else (
    echo [%date% %time%] Error al realizar el backup >> "%LOG_FILE%"
    exit /b 1
)

REM ============================================
REM LIMPIAR BACKUPS ANTIGUOS
REM ============================================

echo [%date% %time%] Limpiando backups antiguos (^> %RETENTION_DAYS% días)... >> "%LOG_FILE%"

forfiles /P "%BACKUP_DIR%" /M backup_*.sql* /D -%RETENTION_DAYS% /C "cmd /c del @path" 2>nul

echo [%date% %time%] Proceso de backup finalizado >> "%LOG_FILE%"
