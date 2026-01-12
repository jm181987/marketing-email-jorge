@echo off
title KNJ Mail System
color 0A

echo Iniciando KNJ Mail Dominator...
echo.

if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
)

echo Abrindo navegador...
start http://localhost:3001

echo Iniciando servidor Node.js...
node server.js

pause