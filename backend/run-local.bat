@echo off
rem Mihenk yerel gelistirme sunucusu: cift tikla, ilk calistirmada kurulum yapar.
chcp 65001 >nul
cd /d "%~dp0"

if exist .venv\Scripts\python.exe goto :run
set "PY="
py -3.12 --version >nul 2>nul && set "PY=py -3.12"
if not defined PY py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY set "PY=python"
echo [Mihenk] Sanal ortam olusturuluyor (%PY%)...
%PY% -m venv .venv || goto :error
echo [Mihenk] Bagimliliklar yukleniyor...
.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r requirements.lock.txt || goto :error

:run
echo [Mihenk] Sunucu: http://127.0.0.1:8010  (durdurmak icin Ctrl+C)
start "" cmd /c "timeout /t 6 >nul & start http://127.0.0.1:8010/"
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
pause
exit /b

:error
echo [Mihenk] Kurulum basarisiz. Python 3.12 kurulu mu?
pause
