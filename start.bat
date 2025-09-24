@echo off
echo ===============================================
echo 🛰️ NASA Weather Likelihood Analyzer
echo ===============================================
echo.

REM Check if we're in the correct directory
if not exist "backend" (
    echo ❌ Error: backend folder not found
    echo Please run this script from the nasa-space-apps-2025 directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Error: frontend folder not found
    echo Please run this script from the nasa-space-apps-2025 directory
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)

echo ✅ Dependencies check passed
echo.
echo 📡 Starting backend server...

REM Start backend server
cd backend
start "NASA Backend" cmd /k "python simple_app.py"
cd ..

echo 🌐 Starting frontend server...
echo.
echo 📋 Application URLs:
echo    Frontend: http://localhost:3000
echo    Backend API: http://127.0.0.1:5000
echo    Health Check: http://127.0.0.1:5000/api/health
echo.

REM Start frontend server
cd frontend
npm start

echo.
echo To stop the application, close both terminal windows
pause
