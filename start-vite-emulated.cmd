@echo off
set PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm
set VITE_USE_EMULATORS=true
cd /d "C:\Admin\Projects\PetBase\app"
npx vite --port=3001 --host=0.0.0.0
