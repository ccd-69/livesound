# LiveSound Complete Uninstaller
# Run this in PowerShell as Administrator for full cleanup

$ErrorActionPreference = "Continue"

Write-Host "=== LiveSound Complete Removal Script ===" -ForegroundColor Cyan
Write-Host ""

# 1. Kill running processes
Write-Host "[1/6] Stopping LiveSound processes..." -ForegroundColor Yellow
$processes = Get-Process -Name "LiveSound" -ErrorAction SilentlyContinue
if ($processes) {
    $processes | ForEach-Object {
        Write-Host "  Killing PID $($_.Id)..."
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  Processes stopped." -ForegroundColor Green
} else {
    Write-Host "  No running processes found." -ForegroundColor Green
}

# 2. Run the official uninstaller if present
Write-Host ""
Write-Host "[2/6] Running official uninstaller..." -ForegroundColor Yellow
$uninstallRegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\b3339d87-5730-5119-8b19-f156b6e29d65"
if (Test-Path $uninstallRegPath) {
    $uninstallString = (Get-ItemProperty $uninstallRegPath -ErrorAction SilentlyContinue).UninstallString
    if ($uninstallString) {
        Write-Host "  Found uninstaller: $uninstallString"
        # NSIS uninstallers need /S for silent mode
        $uninstallCmd = $uninstallString.Trim('"')
        if ($uninstallCmd -match "unins.*\.exe$") {
            Start-Process -FilePath $uninstallCmd -ArgumentList "/SILENT" -Wait -ErrorAction SilentlyContinue
        } else {
            Start-Process -FilePath $uninstallCmd -ArgumentList "/S" -Wait -ErrorAction SilentlyContinue
        }
        Write-Host "  Uninstaller completed." -ForegroundColor Green
    }
} else {
    Write-Host "  No uninstaller registry entry found." -ForegroundColor Green
}
Start-Sleep -Seconds 2

# 3. Remove installation directories
Write-Host ""
Write-Host "[3/6] Removing installation directories..." -ForegroundColor Yellow
$installDirs = @(
    "$env:LOCALAPPDATA\Programs\LiveSound",
    "C:\Program Files\LiveSound",
    "C:\Program Files (x86)\LiveSound"
)
foreach ($dir in $installDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        if (Test-Path $dir) {
            Write-Host "  FAILED to remove: $dir (may need Admin rights)" -ForegroundColor Red
        } else {
            Write-Host "  Removed: $dir" -ForegroundColor Green
        }
    }
}

# 4. Remove user data and caches
Write-Host ""
Write-Host "[4/6] Removing user data, caches, and updater files..." -ForegroundColor Yellow
$userDataDirs = @(
    "$env:APPDATA\LiveSound",
    "$env:LOCALAPPDATA\LiveSound",
    "$env:LOCALAPPDATA\livesound-updater",
    "$env:APPDATA\livesound-updater"
)
foreach ($dir in $userDataDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        if (Test-Path $dir) {
            Write-Host "  FAILED to remove: $dir (may need Admin rights)" -ForegroundColor Red
        } else {
            Write-Host "  Removed: $dir" -ForegroundColor Green
        }
    }
}

# 5. Remove shortcuts
Write-Host ""
Write-Host "[5/6] Removing shortcuts..." -ForegroundColor Yellow
$shortcuts = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\LiveSound",
    "$env:PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\LiveSound",
    "$env:USERPROFILE\Desktop\LiveSound.lnk",
    "$env:PUBLIC\Desktop\LiveSound.lnk"
)
foreach ($path in $shortcuts) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        if (Test-Path $path) {
            Write-Host "  FAILED to remove: $path" -ForegroundColor Red
        } else {
            Write-Host "  Removed: $path" -ForegroundColor Green
        }
    }
}

# 6. Remove registry entries
Write-Host ""
Write-Host "[6/6] Removing registry entries..." -ForegroundColor Yellow
$regPaths = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\b3339d87-5730-5119-8b19-f156b6e29d65",
    "HKCU:\Software\LiveSound",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\b3339d87-5730-5119-8b19-f156b6e29d65",
    "HKLM:\Software\LiveSound"
)
foreach ($reg in $regPaths) {
    if (Test-Path $reg) {
        Remove-Item -Recurse -Force $reg -ErrorAction SilentlyContinue
        if (Test-Path $reg) {
            Write-Host "  FAILED to remove: $reg (may need Admin rights)" -ForegroundColor Red
        } else {
            Write-Host "  Removed: $reg" -ForegroundColor Green
        }
    }
}

# Also search for any other registry entries mentioning LiveSound
Write-Host ""
Write-Host "  Searching for other LiveSound registry entries..." -ForegroundColor DarkGray
$otherKeys = @(
    (Get-ChildItem "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue | Where-Object { $_.GetValue("DisplayName") -like "*LiveSound*" }),
    (Get-ChildItem "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue | Where-Object { $_.GetValue("DisplayName") -like "*LiveSound*" })
)
foreach ($key in $otherKeys) {
    if ($key) {
        Remove-Item -Recurse -Force $key.PSPath -ErrorAction SilentlyContinue
        Write-Host "  Removed additional key: $($key.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "If any items failed to remove, close any open File Explorer windows to LiveSound folders and re-run this script as Administrator." -ForegroundColor DarkYellow
