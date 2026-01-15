@echo off
echo Starting Copy-Paste App...
echo.
echo Open http://localhost:8000 in your browser
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
start http://localhost:8000
python -m http.server 8000
