$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$status = git status --short
if ($LASTEXITCODE -ne 0) { throw 'Could not read Git status.' }
$aheadText = git rev-list --count origin/main..HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not check commits waiting to push. Run git pull --ff-only origin main, then try again.' }
$ahead = [int]$aheadText

if (-not $status -and $ahead -eq 0) {
  Write-Host 'There are no changes to publish.' -ForegroundColor Yellow
  exit 0
}

if ($status) {
  Write-Host 'Files changed in this portfolio:' -ForegroundColor Cyan
  $status | ForEach-Object { Write-Host "  $_" }
  $message = Read-Host 'Commit message'
  if ([string]::IsNullOrWhiteSpace($message)) { throw 'A commit message is required.' }
  git add -A
  if ($LASTEXITCODE -ne 0) { throw 'Could not stage the changes.' }
  Write-Host "`nFiles that will be sent to the public repository:" -ForegroundColor Cyan
  git diff --cached --name-only
  if ($LASTEXITCODE -ne 0) { throw 'Could not list staged files.' }
}

if ($ahead -gt 0) {
  Write-Host "`nAlready-committed changes waiting to push: $ahead" -ForegroundColor Cyan
  git log --oneline origin/main..HEAD
}

$confirm = Read-Host "Type PUSH to publish these changes to saifullah391.github.io"
if ($confirm -cne 'PUSH') {
  if ($status) { git reset }
  Write-Host 'Stopped; your edits remain in the folder.' -ForegroundColor Yellow
  exit 0
}

if ($status) {
  git commit -m $message
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Review the Git message above.' }
}

git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed. Check the GitHub sign-in prompt or error, then run this script again.' }

Write-Host "`nPushed successfully. GitHub Pages will publish the update at https://saifullah391.github.io/" -ForegroundColor Green
