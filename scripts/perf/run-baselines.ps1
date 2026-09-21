# Perf harness only. Runs the full measurement matrix against an already-running
# `next start` (started with PERF_LOG + fetch-timer preloaded — see measure.mjs header).
#   pwsh scripts/perf/run-baselines.ps1 -Prefix baseline
param([string]$Prefix = "baseline")

$log = Join-Path (Get-Location) "perf-out\server.log"
$common = @("--log=$log")

function Run($label, $extra) {
  Write-Host "=== $label ($(Get-Date -Format HH:mm:ss))"
  node scripts/perf/measure.mjs --label=$label --out="perf-out/$label.json" @common @extra | Out-Null
}

node scripts/perf/seed.mjs small
Run "$Prefix-small-rtt0-run1" @("--n=20", "--rtt=0")
Run "$Prefix-small-rtt0-run2" @("--n=10", "--rtt=0", "--scenarios=nav,filters")
Run "$Prefix-small-rtt0-run3" @("--n=10", "--rtt=0", "--scenarios=nav,filters")
Run "$Prefix-small-rtt200" @("--n=20", "--rtt=200", "--scenarios=cold,nav,filters")

node scripts/perf/seed.mjs large
Run "$Prefix-large-rtt0" @("--n=20", "--rtt=0")
Run "$Prefix-large-rtt200" @("--n=20", "--rtt=200", "--scenarios=cold,nav,filters")
Write-Host "=== done ($(Get-Date -Format HH:mm:ss))"
