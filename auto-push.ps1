# PREMIRALAB — Auto Git Sync Watcher
# Automatically stages, commits, and pushes any file edits to GitHub

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PREMIRALAB Auto-Push Watcher is Running...   " -ForegroundColor Green
Write-Host "  Any saved changes will push to GitHub auto!   " -ForegroundColor Cyan
Write-Host "  Press Ctrl + C to stop.                       " -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PSScriptRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$lastPush = [DateTime]::MinValue

while ($true) {
    $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 3000)
    
    if ($result.TimedOut -eq $false) {
        $filePath = $result.Name
        
        # Ignore git, node_modules, and build outputs
        if ($filePath -notmatch '(\.git|node_modules|dist|\.log)' -and ([DateTime]::Now - $lastPush).TotalSeconds -gt 5) {
            Start-Sleep -Seconds 2
            Write-Host "`n[Change detected in $filePath] Pushing to GitHub..." -ForegroundColor Yellow
            
            git add .
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "Auto update: $timestamp" 2>$null
            git push origin main
            
            $lastPush = [DateTime]::Now
            Write-Host "[Done] Successfully pushed to GitHub!" -ForegroundColor Green
        }
    }
}
