@echo off
setlocal
title ezcostura
cd /d "%~dp0"

echo.
echo Iniciando ezcostura. Na primeira vez pode levar ate 1 minuto
echo enquanto o banco de dados e preparado. NAO feche esta janela.
echo.

set "JAVA_BIN=%~dp0jre\bin\java.exe"
if not exist "%JAVA_BIN%" set "JAVA_BIN=java"

if not defined SENTRY_DSN set "SENTRY_DSN=https://bb2d985eef5495a2e8ecf93f064f67c3@o4511304484716544.ingest.us.sentry.io/4511304784150528"
if not defined SENTRY_ENVIRONMENT set "SENTRY_ENVIRONMENT=desktop"

"%JAVA_BIN%" -Xmx512m -jar "%~dp0ezcostura.jar"

echo.
echo ezcostura encerrado. Pressione qualquer tecla para fechar.
pause >nul
