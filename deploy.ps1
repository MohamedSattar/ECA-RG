#Requires -Modules Az.Accounts, Az.Websites
<#
.SYNOPSIS
    Build and deploy the Research Grants app to Azure App Service.

.DESCRIPTION
    1. Builds client (Vite) and server (Node.js) locally.
    2. Packages the output into a ZIP with production dependencies.
    3. Publishes the ZIP to the target deployment slot on Azure.
    4. Restarts the slot and verifies the app is responding.

.PARAMETER Slot
    Target deployment slot: prod | dev | stage  (default: prod)

.PARAMETER SkipBuild
    Skip the npm build step (use if dist/ is already up-to-date).

.PARAMETER SkipLogin
    Skip Connect-AzAccount (use if you are already logged in).

.EXAMPLE
    .\deploy.ps1                        # deploy to production
    .\deploy.ps1 -Slot dev              # deploy to dev slot
    .\deploy.ps1 -Slot stage -SkipBuild # re-deploy stage without rebuilding
#>
param(
    [ValidateSet("prod", "dev", "stage")]
    [string]$Slot = "prod",

    [switch]$SkipBuild,
    [switch]$SkipLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Configuration ────────────────────────────────────────────────────────────
$AppName       = "researchgrant"
$ResourceGroup = "research-grants-dev"
$AzureSlot     = if ($Slot -eq "prod") { "production" } else { $Slot }
$ProjectRoot   = $PSScriptRoot
$TempDir       = Join-Path $env:TEMP "rg-deploy-$(Get-Random)"
$ZipPath       = Join-Path $env:TEMP "rg-deploy-$Slot.zip"
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

# ─── 1. Azure Login ───────────────────────────────────────────────────────────
if (-not $SkipLogin) {
    Write-Step "Connecting to Azure..."
    Connect-AzAccount -ErrorAction Stop | Out-Null
    Write-OK "Logged in as $((Get-AzContext).Account.Id)"
}

# ─── 2. Build ─────────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "Installing dependencies..."
    Set-Location $ProjectRoot
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

    Write-Step "Building client + server..."
    # Env vars for each slot are already configured in Azure App Settings.
    # The local .env is only used for any VITE_ build-time variables.
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
    Write-OK "Build complete"
}

# ─── 3. Assemble deployment package ──────────────────────────────────────────
Write-Step "Assembling deployment package..."

# Clean up any leftover temp folder
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy built artifacts
Copy-Item (Join-Path $ProjectRoot "dist")               $TempDir -Recurse
Copy-Item (Join-Path $ProjectRoot "package.json")       $TempDir
Copy-Item (Join-Path $ProjectRoot "package-lock.json")  $TempDir

# Install production dependencies inside the temp package
# (express & cors must be present at runtime)
Write-Step "Installing production dependencies in package..."
Push-Location $TempDir
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci (production package) failed" }
Pop-Location

# Write a minimal web.config so Azure/IIS routes all traffic to the Node process
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="dist/server/node-build.mjs" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="StaticFiles" stopProcessing="true">
          <match url="^assets/.*" />
          <action type="Rewrite" url="dist/spa/{R:0}"/>
        </rule>
        <rule name="NodeApp">
          <match url=".*" />
          <action type="Rewrite" url="dist/server/node-build.mjs"/>
        </rule>
      </rules>
    </rewrite>
    <iisnode node_env="production" watchedFiles="web.config" />
    <httpErrors existingResponse="PassThrough" />
    <security>
      <requestFiltering><hiddenSegments><remove segment="bin"/></hiddenSegments></requestFiltering>
    </security>
  </system.webServer>
</configuration>
"@
$webConfig | Set-Content (Join-Path $TempDir "web.config") -Encoding UTF8

# Create the zip (overwrite if exists)
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Write-Step "Zipping package to $ZipPath ..."
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-OK "Package size: $sizeMB MB"

# ─── 4. Deploy ────────────────────────────────────────────────────────────────
Write-Step "Publishing to '$AppName' (slot: $AzureSlot) ..."
if ($AzureSlot -eq "production") {
    Publish-AzWebApp `
        -ResourceGroupName $ResourceGroup `
        -Name              $AppName `
        -ArchivePath       $ZipPath `
        -Force
} else {
    Publish-AzWebApp `
        -ResourceGroupName $ResourceGroup `
        -Name              $AppName `
        -Slot              $AzureSlot `
        -ArchivePath       $ZipPath `
        -Force
}
Write-OK "Deployment upload complete"

# ─── 5. Restart ───────────────────────────────────────────────────────────────
Write-Step "Restarting app service slot '$AzureSlot' ..."
if ($AzureSlot -eq "production") {
    Restart-AzWebApp -ResourceGroupName $ResourceGroup -Name $AppName
} else {
    $webapp = Get-AzWebApp -ResourceGroupName $ResourceGroup -Name $AppName
    # Invoke restart on the slot via REST (Restart-AzWebApp doesn't support -Slot)
    $subId  = (Get-AzContext).Subscription.Id
    $uri    = "https://management.azure.com/subscriptions/$subId/resourceGroups/$ResourceGroup" +
              "/providers/Microsoft.Web/sites/$AppName/slots/$AzureSlot/restart?api-version=2023-01-01"
    $token  = (Get-AzAccessToken).Token
    Invoke-RestMethod -Uri $uri -Method Post `
        -Headers @{ Authorization = "Bearer $token" } | Out-Null
}
Write-OK "Restart command sent"

# ─── 6. Verify ────────────────────────────────────────────────────────────────
Write-Step "Waiting 30 s for app to warm up..."
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
