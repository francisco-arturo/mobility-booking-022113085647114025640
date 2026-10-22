# init.ps1 - Verification entrypoint for the Northlane prototype.
# Run: powershell -ExecutionPolicy Bypass -File .\init.ps1
# Fails fast on the first failing check.

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host '=== Northlane prototype verification ==='

Push-Location $root
try {
    Write-Host '=== Unit, API and site checks (node tests/run.mjs) ==='
    & node tests/run.mjs
    if ($LASTEXITCODE -ne 0) {
        throw "tests/run.mjs failed with exit code $LASTEXITCODE"
    }

    Write-Host '=== Structural score (harness validator) ==='
    $validator = Join-Path (Split-Path $root -Parent) '.harness\validate.mjs'
    if (Test-Path $validator) {
        & node $validator --target . --min-score 70
        if ($LASTEXITCODE -ne 0) {
            throw "validate.mjs failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Host "Validator not found at $validator; skipped structural score."
    }
}
finally {
    Pop-Location
}

Write-Host '=== Verification complete: all checks passed ==='
