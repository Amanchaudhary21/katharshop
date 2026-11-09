@echo off
rem Starts the store and the shop server (Java) at http://localhost:8080 and opens it in your browser.
rem Needs Java 21 or newer (https://adoptium.net) and MySQL. Close this window to stop the store.
cd /d "%~dp0backend"
where java >nul 2>nul
if errorlevel 1 (
  echo Java is not installed. Get Java 21 or newer from https://adoptium.net and start again.
  pause
  exit /b 1
)
if not exist target\classes (
  echo Starting for the first time: downloading Maven and the Java libraries. This takes a few minutes, only once...
)
set OPEN_BROWSER=1
call mvnw.cmd -q spring-boot:run
pause
