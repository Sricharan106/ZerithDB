Param()

# Determine script and repo root directories (works regardless of current working directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')

$packages = @(
  'web',
  'zerithdb-auth',
  'zerithdb-cli',
  'zerithdb-core',
  'zerithdb-db',
  'zerithdb-eslint-config',
  'zerithdb-network',
  'zerithdb-react',
  'zerithdb-sdk',
  'zerithdb-signaling-server',
  'zerithdb-sync',
  'zerithdb-tsconfig',
  'zerithdb-utils'
)

Write-Host "Using repo root: $repoRoot" -ForegroundColor Cyan

# Build each package sequentially
foreach ($p in $packages) {
  Write-Host "\n=== Building $p ===" -ForegroundColor Cyan
  $exitCode = 0
  & pnpm -w -F $p build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed for $p (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

Write-Host "\n=== Running tests for packages that have a test script ===" -ForegroundColor Cyan

# Build a map of workspace package names -> package folder paths so tests can be located reliably
$pkgFiles = Get-ChildItem -Path $repoRoot -Recurse -Filter package.json -File -ErrorAction SilentlyContinue
$pkgMap = @{}
foreach ($f in $pkgFiles) {
  try {
    $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
    if ($json.name) { $pkgMap[$json.name] = $f.DirectoryName }
  } catch {
    # ignore JSON parse errors
  }
}

foreach ($p in $packages) {
  if ($pkgMap.ContainsKey($p)) {
    $pkgPath = Join-Path $pkgMap[$p] 'package.json'
    $json = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if ($json.scripts -and $json.scripts.test) {
      Write-Host "\n--- Testing $p ---" -ForegroundColor Cyan
      & pnpm -w -F $p test
      if ($LASTEXITCODE -ne 0) {
        Write-Host "Tests failed for $p (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
      }
    } else {
      Write-Host "Skipping tests for $p (no test script)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "Package.json not found for $p, skipping tests" -ForegroundColor Yellow
  }
}

Write-Host "\nAll builds (and available tests) completed successfully." -ForegroundColor Green
