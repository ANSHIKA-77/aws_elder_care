# deploy.ps1
# Deploy Elder Care API to AWS Lambda + API Gateway
# Run from the elder-care directory: .\deploy.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Elder Care - AWS Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check AWS CLI
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow

$awsVersion = aws --version 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS CLI not found." -ForegroundColor Red
    Write-Host "Install it using:" -ForegroundColor White
    Write-Host "winget install Amazon.AWSCLI" -ForegroundColor White
    exit 1
}

Write-Host "AWS CLI: $awsVersion" -ForegroundColor Green


# 2. Check AWS credentials
Write-Host ""
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow

$identity = aws sts get-caller-identity 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS credentials are not configured." -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor White
    exit 1
}

Write-Host "AWS authentication: OK" -ForegroundColor Green


# 3. Check .env
Write-Host ""
Write-Host "Checking .env file..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host ".env file not found." -ForegroundColor Red
    exit 1
}

Write-Host ".env found" -ForegroundColor Green


# 4. Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

npm install --omit=dev

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed." -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed" -ForegroundColor Green


# 5. Deploy
Write-Host ""
Write-Host "Deploying to AWS Lambda..." -ForegroundColor Yellow
Write-Host "Region: ap-south-1" -ForegroundColor Yellow
Write-Host ""

npx serverless deploy --stage dev --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " DEPLOY FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}


# 6. Success
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check the API Gateway endpoint shown above." -ForegroundColor Cyan
Write-Host "If the URL changed, update public\js\config.js." -ForegroundColor Cyan
Write-Host ""