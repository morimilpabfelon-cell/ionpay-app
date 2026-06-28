param(
  [string]$BaseRef = "origin/main",
  [switch]$SkipInstall,
  [switch]$SkipValidation,
  [switch]$AllowRestricted
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message"
}

function Fail($Message) {
  Write-Host ""
  Write-Error $Message
  exit 1
}

Write-Step "ionPAY pre-PR check"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "git is not available."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Fail "pnpm is not available."
}

try {
  git rev-parse --is-inside-work-tree | Out-Null
} catch {
  Fail "This script must run inside the ionpay-app repository."
}

try {
  git fetch origin main --quiet
} catch {
  Write-Host "Could not fetch origin/main. Continuing with existing refs."
}

$trackedChanged = @(git diff --name-only "$BaseRef...HEAD")
$workingChanged = @(git diff --name-only)
$stagedChanged = @(git diff --cached --name-only)
$untrackedChanged = @(git ls-files --others --exclude-standard)

$changed = @(
  $trackedChanged
  $workingChanged
  $stagedChanged
  $untrackedChanged
) | Where-Object { $_ -and $_.Trim() -ne "" } | Sort-Object -Unique

Write-Step "Changed files"
if ($changed.Count -eq 0) {
  Write-Host "No changed files detected."
} else {
  $changed | ForEach-Object { Write-Host "- $_" }
}

$restrictedPatterns = @(
  "^server/(?!tests/[^/]+\.test\.mjs$)",
  "^android/",
  "^ios/",
  "^package\.json$",
  "^pnpm-lock\.yaml$",
  "^capacitor\.config\.ts$",
  "^.*migration.*$",
  "^.*schema.*$"
)

$restricted = @()
foreach ($file in $changed) {
  foreach ($pattern in $restrictedPatterns) {
    if ($file -match $pattern) {
      $restricted += $file
      break
    }
  }
}

if ($restricted.Count -gt 0 -and -not $AllowRestricted) {
  Write-Host ""
  Write-Host "Restricted files detected:"
  $restricted | Sort-Object -Unique | ForEach-Object { Write-Host "- $_" }
  Fail "Restricted scope requires explicit gate approval. Re-run with -AllowRestricted only after approval."
}

Write-Step "Whitespace check"
git diff --check

if (-not $SkipInstall) {
  Write-Step "Install dependencies"
  pnpm install --frozen-lockfile
}

if (-not $SkipValidation) {
  Write-Step "Build"
  pnpm build

  Write-Step "API tests"
  pnpm api:test

  Write-Step "Android sync"
  pnpm android:sync
}

Write-Step "Git status"
git status --short

Write-Host ""
Write-Host "Result: PASS"
