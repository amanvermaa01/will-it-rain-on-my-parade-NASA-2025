# NASA Weather Likelihood Analyzer Startup Script
# This PowerShell script starts both the backend and frontend servers

Write-Host "🛰️ NASA Weather Likelihood Analyzer" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Error: Please run this script from the nasa-space-apps-2025 directory" -ForegroundColor Red
    Write-Host "   The directory should contain 'backend' and 'frontend' folders" -ForegroundColor Red
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js not found. Please install Node.js 16+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting NASA Weather Analyzer..." -ForegroundColor Cyan

# Start backend server in background
Write-Host "📡 Starting backend server (Flask)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    cd backend
    python simple_app.py
} -ArgumentList (Get-Location)

Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🌐 Starting frontend server (React)..." -ForegroundColor Yellow
cd frontend

Write-Host ""
Write-Host "📋 Application URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://127.0.0.1:5000" -ForegroundColor White
Write-Host "   Health Check: http://127.0.0.1:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "🎯 To stop the application:" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C in this window, then run: Stop-Job -Name * | Remove-Job" -ForegroundColor White
Write-Host ""

# Start React development server (this will block)
npm start

# Cleanup background job when script exits
Stop-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue
