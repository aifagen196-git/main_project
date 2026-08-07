# scripts/run-indeed-scheduled.ps1
#
# Wrapper for Windows Task Scheduler. Task Scheduler runs with no visible
# console and no easy way to see what happened afterward, so this logs every
# run to a timestamped file under job-engine/logs/ instead of letting output
# vanish. Kept as a script (not a raw `npm run indeed` action) so the working
# directory and log path are set the same way every time regardless of what
# Task Scheduler's own working-directory default happens to be.
#
# Deliberately NOT $ErrorActionPreference = "Stop": PowerShell wraps a native
# command's captured stderr lines as ErrorRecord objects, and under "Stop"
# that turned an ordinary console.error() log line from the collector into a
# script-terminating error — a live test run aborted mid-collector, right
# after the save step and before deactivation/stats ever printed, making a
# real (if partial) run look like a silent crash. Default ("Continue")
# lets those lines flow into the log as text without aborting the script.

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $logDir "indeed-$stamp.log"

# Node writes its emoji/box-drawing console output as UTF-8, but under Task
# Scheduler the console's active codepage is the system default (e.g.
# Windows-1252), not UTF-8 — so PowerShell decodes those bytes with the wrong
# codepage before Out-File ever sees them, producing mojibake ("≡ƒƒª")
# regardless of what encoding Out-File itself writes with. Switching the
# console to codepage 65001 (UTF-8) first is what actually fixes it; the
# earlier "-Encoding utf8" fix on Out-File alone was necessary but not
# sufficient — confirmed by a real Task-Scheduler-triggered run still coming
# out garbled after that first fix.
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Scaling history:
#   step 1: pairs 3 -> 6, pages stayed at 1. Several runs (manual + scheduled)
#           all showed blocked: 0 — confirmed clean before going further.
#   step 2: tested whether page 2+ (start=15, start=30...) returns NEW jobs
#           or duplicates of page 1. Verified live: one search alone returned
#           118 unique jobs across 6 pages, ZERO overlap between pages — depth
#           is real signal, not waste. Turned pages on: 1 -> 3.
#           One test run at these settings hit a page crash + a net::ERR_ABORTED
#           (looked like resource churn from many contexts in one long-lived
#           browser), but re-running the identical settings completed cleanly
#           with 0 blocks and 0 crashes — so it wasn't a deterministic ceiling.
#           Trimmed per-page detail-click count as a safety margin anyway,
#           since 3x the pages means 3x the click churn per search.
$env:INDEED_SEARCH_PAIRS = "6"
$env:INDEED_MAX_PAGES = "3"
$env:INDEED_DETAIL_FETCHES_PER_SEARCH = "6"

& npm run indeed 2>&1 | Out-File -FilePath $logFile -Encoding utf8

exit $LASTEXITCODE
