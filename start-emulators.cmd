@echo off
set PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin
cd /d "%~dp0"
firebase emulators:start
