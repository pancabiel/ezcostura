# Build the ezcostura desktop edition into installer\dist\ezcostura\
# Requires: Node 18+, Maven 3.9+, JDK 21+ (with jlink and jpackage on PATH).
# Usage:
#   .\build.ps1                 # builds portable folder
#   .\build.ps1 -Installer      # also runs jpackage to produce a Windows installer
#                               # (requires WiX Toolset 3.x for .msi/.exe)

[CmdletBinding()]
param(
    [switch]$Installer,
    [switch]$SkipFrontend,
    [switch]$SkipJre
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root        = (Resolve-Path "$PSScriptRoot\..").Path
$distDir     = Join-Path $PSScriptRoot 'dist'
$bundleDir   = Join-Path $distDir 'ezcostura'
$jreDir      = Join-Path $bundleDir 'jre'
$staticDir   = Join-Path $root 'backend\src\main\resources\static'
$frontendDir = Join-Path $root 'frontend'
$backendDir  = Join-Path $root 'backend'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Require-Cmd($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required tool not found on PATH: $name"
    }
}

Require-Cmd 'mvn'
Require-Cmd 'java'
if (-not $SkipJre) { Require-Cmd 'jlink' }
if ($Installer)    { Require-Cmd 'jpackage' }
if (-not $SkipFrontend) {
    Require-Cmd 'npm'
}

if (-not $SkipFrontend) {
    Step '1/5 Build frontend'
    Push-Location $frontendDir
    try {
        if (-not (Test-Path 'node_modules')) { npm install }
        npm run build
    } finally { Pop-Location }
}

Step '2/5 Copy frontend bundle into backend static resources'
if (Test-Path $staticDir) {
    Get-ChildItem -Path $staticDir -Force -Exclude '.gitkeep' | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $staticDir | Out-Null
Copy-Item -Recurse -Force "$frontendDir\dist\*" $staticDir

Step '3/5 Build backend (desktop profile)'
Push-Location $backendDir
try {
    $mvnArgs = @('-Pdesktop', '-DskipTests', 'clean', 'package')
    if ($env:SENTRY_AUTH_TOKEN) {
        Write-Host '   SENTRY_AUTH_TOKEN detected -> uploading source bundle to Sentry'
        $mvnArgs += '-Dsentry.skip=false'
    } else {
        Write-Host '   SENTRY_AUTH_TOKEN not set -> skipping Sentry upload'
    }
    & mvn @mvnArgs
    if ($LASTEXITCODE -ne 0) { throw "mvn failed with exit code $LASTEXITCODE" }
} finally { Pop-Location }

Step '4/5 Assemble portable bundle'
if (Test-Path $bundleDir) { Remove-Item -Recurse -Force $bundleDir }
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

$jar = Get-ChildItem "$backendDir\target\ezcostura-desktop.jar" -ErrorAction SilentlyContinue
if (-not $jar) {
    $jar = Get-ChildItem "$backendDir\target\*.jar" |
        Where-Object { $_.Name -notlike '*-sources*' -and $_.Name -notlike '*-javadoc*' -and $_.Name -notlike '*.original' } |
        Select-Object -First 1
}
if (-not $jar) { throw 'Built jar not found in backend\target' }
Copy-Item $jar.FullName (Join-Path $bundleDir 'ezcostura.jar')
Copy-Item (Join-Path $PSScriptRoot 'Iniciar ezcostura.cmd') $bundleDir
Copy-Item (Join-Path $PSScriptRoot 'LEIA-ME.txt')           $bundleDir

if (-not $SkipJre) {
    Step '4b/5 Build minimal JRE with jlink'
    if (Test-Path $jreDir) { Remove-Item -Recurse -Force $jreDir }
    & jlink `
        --add-modules java.base,java.sql,java.naming,java.management,java.desktop,java.security.jgss,java.instrument,java.xml,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,jdk.zipfs `
        --no-header-files --no-man-pages --strip-debug --compress=zip-6 `
        --output $jreDir
    if ($LASTEXITCODE -ne 0) { throw "jlink failed with exit code $LASTEXITCODE" }
}

if ($Installer) {
    Step '5/5 jpackage Windows installer'
    $installerOut = Join-Path $distDir 'installer'
    if (Test-Path $installerOut) { Remove-Item -Recurse -Force $installerOut }
    New-Item -ItemType Directory -Force -Path $installerOut | Out-Null

    & jpackage `
        --type exe `
        --name ezcostura `
        --app-version 0.0.1 `
        --vendor 'ezcostura' `
        --description 'Gestao de producao para faccoes de roupas' `
        --input $bundleDir `
        --main-jar ezcostura.jar `
        --main-class org.springframework.boot.loader.launch.JarLauncher `
        --runtime-image $jreDir `
        --java-options '-Xmx512m' `
        --win-dir-chooser `
        --win-menu `
        --win-shortcut `
        --dest $installerOut
    if ($LASTEXITCODE -ne 0) { throw "jpackage failed with exit code $LASTEXITCODE" }

    Write-Host "`nInstaller written to: $installerOut" -ForegroundColor Green
} else {
    Step '5/5 Skip installer (run with -Installer to enable)'
}

Write-Host "`nDONE." -ForegroundColor Green
Write-Host "Portable bundle: $bundleDir"
Write-Host "Zip the folder and send it. To launch, double-click 'Iniciar ezcostura.cmd'."
