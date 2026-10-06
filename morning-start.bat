@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; if(-not $c){ Start-Process cmd.exe -ArgumentList '/c python -m http.server 8080' -WorkingDirectory '%~dp0' }"
timeout /t 4 >nul
start "" "http://127.0.0.1:8080/"
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('Contract Studio is running. Today 10:00 agenda: security hardening + features. Plan: SECURITY_WORKLOG.md in the project folder.',60,'10:00 Worklog',64)"
