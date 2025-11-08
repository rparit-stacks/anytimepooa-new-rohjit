# Vercel Live Logs Tracker
# This script streams live logs from your Vercel deployment

Write-Host "🔍 Starting Vercel Logs Tracker..." -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
    Write-Host ""
}

# Check if logged in to Vercel
Write-Host "Checking Vercel authentication..." -ForegroundColor Yellow
$vercelWhoami = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Vercel!" -ForegroundColor Red
    Write-Host "Please run: vercel login" -ForegroundColor Yellow
    Write-Host "Or run: vercel login --github" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logged in as: $vercelWhoami" -ForegroundColor Green
Write-Host ""

# Get latest deployment URL
Write-Host "🔍 Getting latest deployment URL..." -ForegroundColor Yellow
$deployments = vercel ls 2>&1
$latestUrl = $null

# Parse the output to get the first Ready deployment URL
$deployments | ForEach-Object {
    if ($_ -match "https://([^\s]+\.vercel\.app)") {
        if (-not $latestUrl) {
            $latestUrl = $matches[1]
        }
    }
}

if (-not $latestUrl) {
    # Fallback to production domain
    $latestUrl = "anytimepooa-new-rohjit.vercel.app"
    Write-Host "⚠️  Using fallback URL: $latestUrl" -ForegroundColor Yellow
} else {
    Write-Host "✅ Using deployment: $latestUrl" -ForegroundColor Green
}

Write-Host "📦 Deployment URL: $latestUrl" -ForegroundColor Cyan
Write-Host ""

# Filter for important logs
Write-Host "🔴 Filtering for:" -ForegroundColor Yellow
Write-Host "  - [Middleware]" -ForegroundColor White
Write-Host "  - [getCurrentUser]" -ForegroundColor White
Write-Host "  - [v0]" -ForegroundColor White
Write-Host "  - [Dashboard]" -ForegroundColor White
Write-Host "  - Cookie" -ForegroundColor White
Write-Host "  - Session" -ForegroundColor White
Write-Host ""

Write-Host "📡 Streaming live logs (runs for 5 minutes, Press Ctrl+C to stop)..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Stream logs with filtering (new Vercel CLI streams automatically for 5 minutes)
vercel logs $latestUrl 2>&1 | ForEach-Object {
    $line = $_
    
    # Color code different log types
    if ($line -match "\[Middleware\]") {
        Write-Host $line -ForegroundColor Cyan
    }
    elseif ($line -match "\[getCurrentUser\]") {
        Write-Host $line -ForegroundColor Yellow
    }
    elseif ($line -match "\[v0\]") {
        Write-Host $line -ForegroundColor Magenta
    }
    elseif ($line -match "\[Dashboard\]") {
        Write-Host $line -ForegroundColor Green
    }
    elseif ($line -match "(Cookie|Session|cookie|session)") {
        Write-Host $line -ForegroundColor White -BackgroundColor DarkBlue
    }
    elseif ($line -match "(Error|error|ERROR|Failed|failed)") {
        Write-Host $line -ForegroundColor Red
    }
    elseif ($line -match "(Success|success|SUCCESS|Logged in)") {
        Write-Host $line -ForegroundColor Green
    }
    else {
        Write-Host $line
    }
}

