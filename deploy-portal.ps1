<#
.SYNOPSIS
    Build and deploy the Research Grants Portal to Azure App Service via Publishing Profile.
    Does NOT require 'az login' -- uses publishing profile credentials directly.

.PARAMETER SkipBuild
    Skip the npm build step (use if dist/ is already up-to-date).

.EXAMPLE
    .\deploy-portal.ps1               # full build + deploy
    .\deploy-portal.ps1 -SkipBuild    # re-deploy without rebuilding
#>
param([switch]$SkipBuild)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
$ScmHost    = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl     = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"
$PubUser    = '$ResearchGrants-Portal'
$PubPass    = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$ProjectRoot = $PSScriptRoot
$ZipPath    = Join-Path $env:TEMP "rg-portal-deploy.zip"
# ---------------------------------------------------------------------------

function Write-Step([string]$msg) { Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Write-OK([string]$msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "  !!  $msg" -ForegroundColor Yellow }

$b64Auth    = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$AuthHeader = @{ Authorization = "Basic $b64Auth" }
$AuthJson   = $AuthHeader + @{ "Content-Type" = "application/json" }

# --- 1. Build ----------------------------------------------------------------
if (-not $SkipBuild) {
    Set-Location $ProjectRoot

    Write-Step "Restoring packages (npm install --prefer-offline) ..."
    npm install --prefer-offline 2>&1 | Where-Object { $_ -notmatch "^npm warn" }
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    Write-OK "Dependencies ready"

    # Load prod env so VITE_ vars are baked into the client bundle at build time
    $envFile = Join-Path $ProjectRoot ".env prod"
    if (Test-Path $envFile) {
        Copy-Item $envFile (Join-Path $ProjectRoot ".env") -Force
        Write-OK "Loaded '.env prod' for build-time VITE_ vars"
    } else {
        Write-Warn "No '.env prod' found -- VITE_ vars may be wrong in the bundle"
    }

    Write-Step "Building client (Vite) ..."
    node "$ProjectRoot/node_modules/vite/bin/vite.js" build
    if ($LASTEXITCODE -ne 0) { throw "Client build failed" }

    Write-Step "Building server (Node.js) ..."
    node "$ProjectRoot/node_modules/vite/bin/vite.js" build --config vite.config.server.ts
    if ($LASTEXITCODE -ne 0) { throw "Server build failed" }

    Write-OK "Build complete"
}

# --- 2. Assemble deployment zip ----------------------------------------------
# Strategy: let Oryx handle npm install during deployment so the container
# startup script can extract node_modules and call npm start normally.
# We strip build scripts from package.json so Oryx only installs deps (not Vite).
Write-Step "Assembling deployment zip -> $ZipPath ..."
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')

# dist/ tree (pre-built client + server bundles)
Get-ChildItem -Path (Join-Path $ProjectRoot "dist") -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($ProjectRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}

# package.json -- stripped of build scripts so Oryx only runs npm install
$pkg = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$buildScripts = @("build", "build:client", "build:server", "typecheck", "format.fix")
foreach ($s in $buildScripts) { $pkg.scripts.PSObject.Properties.Remove($s) }
$pkgJson = $pkg | ConvertTo-Json -Depth 10
$pkgBytes = [Text.Encoding]::UTF8.GetBytes($pkgJson)
$entry = $zip.CreateEntry("package.json")
$stream = $entry.Open()
$stream.Write($pkgBytes, 0, $pkgBytes.Length)
$stream.Close()

# package-lock.json (needed for npm ci / reproducible install)
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $zip, (Join-Path $ProjectRoot "package-lock.json"), "package-lock.json") | Out-Null

# .env prod → .env  (server runtime secrets loaded by dotenv/config)
$envProd = Join-Path $ProjectRoot ".env prod"
if (Test-Path $envProd) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $envProd, ".env") | Out-Null
    Write-Host "  Included '.env prod' as '.env'"
} else {
    Write-Warn "'.env prod' not found -- server env vars will be missing at runtime"
}

$zip.Dispose()
$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-OK "Zip size: $sizeMB MB  (no node_modules -- Oryx installs during deploy)"

# --- 3. Configure SCM settings -----------------------------------------------
# Let Oryx run during deployment for npm install.
# Delete DISABLE_ORYX_BUILD so the container startup script runs normally.
Write-Step "Configuring SCM settings ..."

# Delete DISABLE_ORYX_BUILD (was blocking the container startup script)
try {
    Invoke-RestMethod "https://$ScmHost/api/settings/DISABLE_ORYX_BUILD" `
        -Method DELETE -Headers $AuthHeader | Out-Null
    Write-OK "Deleted DISABLE_ORYX_BUILD"
} catch { Write-Warn "Could not delete DISABLE_ORYX_BUILD (may not exist): $($_.Exception.Message.Split([char]10)[0])" }

# Apply the remaining settings
$settings = @{
    WEBSITE_RUN_FROM_PACKAGE       = "0"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"   # Oryx runs npm install during deploy
} | ConvertTo-Json

Invoke-RestMethod "https://$ScmHost/api/settings" -Method POST `
    -Headers $AuthJson -Body $settings | Out-Null
Write-OK "SCM settings: SCM_DO_BUILD_DURING_DEPLOYMENT=true, WEBSITE_RUN_FROM_PACKAGE=0"

# --- 4. Deploy via Kudu ZipDeploy --------------------------------------------
Write-Step "Uploading ZIP to Kudu ..."
$uploadResp = Invoke-WebRequest `
    -Uri "https://$ScmHost/api/zipdeploy?isAsync=true&cleanDeployment=true" `
    -Method POST `
    -Headers ($AuthHeader + @{ "Content-Type" = "application/octet-stream" }) `
    -InFile $ZipPath -UseBasicParsing
if ($uploadResp.StatusCode -notin 200,201,202) { throw "Upload failed: HTTP $($uploadResp.StatusCode)" }
Write-OK "ZIP uploaded (HTTP $($uploadResp.StatusCode)) -- Oryx is running npm install ..."

# --- 5. Poll deployment (Oryx npm install runs here) -------------------------
$pollUrl = "https://$ScmHost/api/deployments/latest"
$elapsed = 0; $deployStatus = $null
do {
    Start-Sleep -Seconds 10; $elapsed += 10
    try {
        $deployStatus = Invoke-RestMethod $pollUrl -Headers $AuthHeader
        Write-Host "  status=$($deployStatus.status)  complete=$($deployStatus.complete)  ($elapsed s)"
    } catch { Write-Host "  polling... ($elapsed s)" }
} while ((-not ($deployStatus -and $deployStatus.complete)) -and $elapsed -lt 300)

if ($deployStatus.status -ne 4) {
    Write-Warn "Deployment status=$($deployStatus.status). Check https://portal.azure.com for Oryx logs."
} else {
    Write-OK "Deployment + Oryx npm install complete (status=4)"
}

# --- 6. Restart (fire-and-forget, avoid blocking) ----------------------------
Write-Step "Sending restart signal ..."
$restartJob = Start-Job {
    param($url, $auth)
    try { Invoke-WebRequest $url -Method DELETE -Headers @{ Authorization = $auth } `
            -UseBasicParsing -TimeoutSec 10 | Out-Null } catch {}
} -ArgumentList "https://$ScmHost/api/processes/0", "Basic $b64Auth"
Wait-Job $restartJob -Timeout 12 | Out-Null
Remove-Job $restartJob -Force | Out-Null
Write-OK "Restart signal sent"

# --- 7. Health check ---------------------------------------------------------
Write-Step "Waiting 30s for container to boot ..."
Start-Sleep -Seconds 30

Write-Step "Verifying $AppUrl/health (up to 4 min) ..."
$httpStatus = 0; $deadline = (Get-Date).AddSeconds(240)

while ((Get-Date) -lt $deadline) {
    try {
        $resp = Invoke-WebRequest "$AppUrl/health" -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
        $httpStatus = $resp.StatusCode; break
    } catch {
        $errResp = $_.Exception.Response
        if ($errResp) { $httpStatus = $errResp.StatusCode.value__; break }
        Write-Host "  still starting... ($([math]::Round(($deadline-(Get-Date)).TotalSeconds))s left)"
        Start-Sleep -Seconds 15
    }
}

if ($httpStatus -in 200,301,302,401,403) {
    Write-OK "App is UP  (HTTP $httpStatus)"
    Write-Host "`n  App URL : $AppUrl" -ForegroundColor White
    Write-Host "  Health  : $AppUrl/health" -ForegroundColor White
} else {
    Write-Warn "Health check inconclusive (HTTP $httpStatus)"
    Write-Warn "Check logs: https://$ScmHost/api/logs/docker"
}

Write-Host "`nDeployment to ResearchGrants-Portal complete.`n" -ForegroundColor Green
