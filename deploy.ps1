# 🚀 ApexChat Firebase Deployment Script (PowerShell)
# Automates the build and deploy process for Windows

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  🚀 APEXCHAT FIREBASE DEPLOYMENT" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check environment
Write-Host "[1/5] Checking environment..." -ForegroundColor Blue

if (-Not (Test-Path ".env.production")) {
    Write-Host "ERROR: .env.production not found!" -ForegroundColor Red
    Write-Host "Create .env.production with VITE_GROQ_API_KEY"
    exit 1
}

try {
    firebase --version | Out-Null
} catch {
    Write-Host "ERROR: Firebase CLI not installed!" -ForegroundColor Red
    Write-Host "Install with: npm install -g firebase-tools"
    exit 1
}

Write-Host "✓ Environment OK" -ForegroundColor Green
Write-Host ""

# Step 2: Clean old build
Write-Host "[2/5] Cleaning old build..." -ForegroundColor Blue
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
}
Write-Host "✓ Cleaned" -ForegroundColor Green
Write-Host ""

# Step 3: Build
Write-Host "[3/5] Building production bundle..." -ForegroundColor Blue
npm run build

if (-Not (Test-Path "dist/public")) {
    Write-Host "ERROR: Build failed! dist/public not found" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build complete" -ForegroundColor Green
Write-Host ""

# Step 4: Preview build
Write-Host "[4/5] Checking build output..." -ForegroundColor Blue
Get-ChildItem "dist/public/index.html" | Format-List
Write-Host ""
Write-Host "Build contains:"
Get-ChildItem "dist/public"
Write-Host ""

# Step 5: Deploy
Write-Host "[5/5] Deploying to Firebase..." -ForegroundColor Blue
firebase deploy --only hosting

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app is live at:"
Write-Host "https://gen-lang-client-0258578294.web.app" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Open the URL in your browser"
Write-Host "2. Test AI chat (should use Groq API)"
Write-Host "3. Test Firebase Auth login"
Write-Host "4. Check browser console for errors"
Write-Host ""
