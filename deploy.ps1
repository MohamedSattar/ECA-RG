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
$TempDir        = Join-Path $env:TEMP "rg-deploy-$(Get-Random)"
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

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

Copy-Item (Join-Path $ProjectRoot "dist")              $TempDir -Recurse
Copy-Item (Join-Path $ProjectRoot "package.json")      $TempDir
Copy-Item (Join-Path $ProjectRoot "package-lock.json") $TempDir
# Include .deployment so Oryx knows to run npm install but skip a rebuild
Copy-Item (Join-Path $ProjectRoot ".deployment")       $TempDir -ErrorAction SilentlyContinue

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Write-Step "Zipping package → $ZipPath ..."
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
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

# ─── 5. Deploy ZIP ────────────────────────────────────────────────────────────
Write-Step "Deploying ZIP to '$AppName' (slot: $AzureSlot) ..."
if ($AzureSlot -eq "production") {
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppName `
        --src-path $ZipPath `
        --type zip `
        --clean true `
        --async false
} else {
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppName `
        --slot $AzureSlot `
        --src-path $ZipPath `
        --type zip `
        --clean true `
        --async false
}
if ($LASTEXITCODE -ne 0) { throw "Deployment failed" }
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

$url = if ($AzureSlot -eq "production") {
    "https://$AppName.azurewebsites.net"
} else {
    "https://$AppName-$AzureSlot.azurewebsites.net"
}

Write-Step "Verifying app at $url ..."
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 `
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

# ─── Cleanup ──────────────────────────────────────────────────────────────────
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "`nDeployment to '$Slot' slot complete.`n" -ForegroundColor Green
