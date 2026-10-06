@echo off
cd /d "%~dp0"
echo Contract Studio is running at http://127.0.0.1:8080
echo Keep this window open. Close it to stop the server.
start "" "http://127.0.0.1:8080/"
python -m http.server 8080
