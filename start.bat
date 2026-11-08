@echo off
rem Starts the store and the shop server at http://localhost:8080 and opens it in your browser.
rem Needs Node.js (https://nodejs.org) and MySQL. Close this window to stop the store.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing the libraries the server needs (only the first time)...
  call npm install
)
start "" http://localhost:8080
node server.js
pause
