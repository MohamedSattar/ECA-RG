<#
.SYNOPSIS
    Build and deploy the Research Grants app to Azure App Service (Linux).
    Uses Azure CLI — no separate login needed if already signed in via VS Code.

.PARAMETER Slot
    Target deployment slot: prod | dev | stage  (default: prod)

.PARAMETER SkipBuild
    Skip the npm build step (use if dist/ is already up-to-date).

.EXAMPLE
    .\deploy.ps1                        # deploy to production
    .\deploy.ps1 -Slot dev              # deploy to dev slot
    .\deploy.ps1 -Slot stage -SkipBuild # re-deploy stage without rebuilding
#>
param(
    [ValidateSet("prod", "dev", "stage")]
    [string]$Slot = "prod",

    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Configuration ────────────────────────────────────────────────────────────
$AppName        = "researchgrant"
$ResourceGroup  = "research-grants-dev"
$Subscription   = "ECA_Staging_Testing"
$AzureSlot      = if ($Slot -eq "prod") { "production" } else { $Slot }
$StartupCommand = "npm install --omit=dev --quiet && node dist/server/node-build.mjs"
$ProjectRoot    = $PSScriptRoot
$ZipPath        = Join-Path $env:TEMP "rg-deploy-$Slot.zip"
# ──────────────────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan
}
function Write-OK([string]$msg) {
    Write-Host "  OK  $msg" -ForegroundColor Green
}
function Write-Warn([string]$msg) {
    Write-Host "  !!  $msg" -ForegroundColor Yellow
}

# ─── 1. Select Azure subscription ─────────────────────────────────────────────
Write-Step "Setting Azure subscription to '$Subscription' ..."
az account set --subscription $Subscription
if ($LASTEXITCODE -ne 0) { throw "Failed to set subscription. Run 'az login' first." }
$currentAccount = az account show --query "user.name" -o tsv
Write-OK "Using account: $currentAccount  |  subscription: $Subscription"

# ─── 2. Build ─────────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Set-Location $ProjectRoot

    # npm install only adds missing packages — does not delete locked binaries like esbuild.exe
    Write-Step "Restoring missing packages (npm install --prefer-offline) ..."
    npm install --prefer-offline 2>&1 | Where-Object { $_ -notmatch "^npm warn" }
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    Write-OK "Dependencies ready"

    # VITE_ variables are baked into the client bundle at build time — they are NOT
    # read from Azure App Settings at runtime. Load the correct slot env file now.
    $envFile = Join-Path $ProjectRoot ".env $Slot"
    if (Test-Path $envFile) {
        Copy-Item $envFile (Join-Path $ProjectRoot ".env") -Force
        Write-OK "Loaded build-time env from '.env $Slot'"
    } else {
        Write-Warn "No '.env $Slot' file found — using existing .env (VITE_ vars may be wrong)"
    }

    Write-Step "Building client (Vite) ..."
    node "$ProjectRoot/node_modules/vite/bin/vite.js" build
    if ($LASTEXITCODE -ne 0) { throw "Client build failed" }

    Write-Step "Building server (Node.js) ..."
    node "$ProjectRoot/node_modules/vite/bin/vite.js" build --config vite.config.server.ts
    if ($LASTEXITCODE -ne 0) { throw "Server build failed" }

    Write-OK "Build complete"
}

# ─── 3. Assemble deployment package ──────────────────────────────────────────
# Only ship dist/ + package manifests — Azure Oryx installs production deps
# on the server automatically (SCM_DO_BUILD_DURING_DEPLOYMENT=true).
Write-Step "Assembling deployment package (dist only) ..."

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Write-Step "Zipping package → $ZipPath ..."

# Build ZIP with forward-slash entry names so Kudu's rsync works on Linux.
# Compress-Archive produces backslash paths which break parallel_rsync.sh on Linux.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
Get-ChildItem -Path (Join-Path $ProjectRoot "dist") -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($ProjectRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}
foreach ($f in @("package.json", "package-lock.json")) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $ProjectRoot $f), $f) | Out-Null
}
$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-OK "Package size: $sizeMB MB"

# ─── 4. Set Linux startup command ────────────────────────────────────────────
Write-Step "Setting startup command: '$StartupCommand' ..."
if ($AzureSlot -eq "production") {
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --startup-file $StartupCommand | Out-Null
} else {
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --slot $AzureSlot `
        --startup-file $StartupCommand | Out-Null
}
if ($LASTEXITCODE -ne 0) { throw "Failed to set startup command" }
Write-OK "Startup command set"

# ─── 5. Deploy ZIP via Kudu ZipDeploy API ─────────────────────────────────────
# Using the Kudu ZipDeploy endpoint directly avoids the OneDeploy build pipeline
# which fails on Windows-generated ZIPs due to backslash path handling on Linux.
Write-Step "Deploying ZIP to '$AppName' (slot: $AzureSlot) ..."

$slotArg = if ($AzureSlot -ne "production") { @("--slot", $AzureSlot) } else { @() }
$pubCreds = az webapp deployment list-publishing-credentials `
    --resource-group $ResourceGroup --name $AppName @slotArg `
    --query "{user:publishingUserName,pass:publishingPassword}" -o json | ConvertFrom-Json
$b64 = [System.Convert]::ToBase64String(
    [System.Text.Encoding]::UTF8.GetBytes("$($pubCreds.user):$($pubCreds.pass)"))

$scmHost = az webapp show --resource-group $ResourceGroup --name $AppName @slotArg `
    --query "defaultHostName" -o tsv | ForEach-Object {
        $_.Trim() -replace "\.azurewebsites\.net$", ".scm.azurewebsites.net"
    }

$deployUrl = "https://$scmHost/api/zipdeploy?isAsync=true&cleanDeployment=true"
Write-OK "Kudu endpoint: $deployUrl"

$uploadResp = Invoke-WebRequest -Uri $deployUrl -Method POST `
    -Headers @{ "Authorization" = "Basic $b64"; "Content-Type" = "application/octet-stream" } `
    -InFile $ZipPath -UseBasicParsing
if ($uploadResp.StatusCode -notin 200,201,202) {
    throw "Upload failed: HTTP $($uploadResp.StatusCode)"
}
Write-OK "ZIP uploaded (HTTP $($uploadResp.StatusCode)). Polling for completion..."

$pollHdrs = @{ "Authorization" = "Basic $b64" }
$pollUrl  = "https://$scmHost/api/deployments/latest"
$elapsed  = 0
do {
    Start-Sleep -Seconds 5; $elapsed += 5
    $d = Invoke-RestMethod -Uri $pollUrl -Headers $pollHdrs
    Write-Host "  status=$($d.status) complete=$($d.complete) ($elapsed s)"
} while (-not $d.complete -and $elapsed -lt 120)

if ($d.status -ne 4) { throw "Deployment failed (Kudu status $($d.status))" }
Write-OK "Deployment upload complete"

# ─── 6. Restart ───────────────────────────────────────────────────────────────
Write-Step "Restarting slot '$AzureSlot' ..."
if ($AzureSlot -eq "production") {
    az webapp restart --resource-group $ResourceGroup --name $AppName
} else {
    az webapp restart --resource-group $ResourceGroup --name $AppName --slot $AzureSlot
}
if ($LASTEXITCODE -ne 0) { throw "Restart failed" }
Write-OK "Restart command sent"

# ─── 7. Verify ────────────────────────────────────────────────────────────────
Write-Step "Waiting 30 s for app to warm up ..."
Start-Sleep -Seconds 30

# Derive the real hostname (handles regional subdomains like uaenorth-01)
$appUrl = az webapp show --resource-group $ResourceGroup --name $AppName @slotArg `
    --query "defaultHostName" -o tsv | ForEach-Object { "https://$($_.Trim())" }

Write-Step "Verifying app at $appUrl ..."
try {
    $response = Invoke-WebRequest -Uri "$appUrl/health" -UseBasicParsing -TimeoutSec 30 `
                    -ErrorAction SilentlyContinue
    $status = $response.StatusCode
} catch {
    $status = $_.Exception.Response.StatusCode.value__
}

if ($status -in 200, 301, 302, 401, 403) {
    Write-OK "App is up  (HTTP $status)"
} else {
    Write-Warn "Unexpected status $status — check the Azure portal for details."
    exit 1
}
Write-Host "`nDeployment to '$Slot' slot complete.`n" -ForegroundColor Green
