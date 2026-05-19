# scaffold.ps1 — copy the Bower framework footprint into a target directory.
#
# Usage: scripts\scaffold.ps1 <target-dir>
#
# Always copies (overwrites):
#   - _bower\                 (excluding project-CLAUDE.md, project-settings.json,
#                              VERSION, and SOURCE — VERSION is owned by /b-upgrade
#                              in the project; SOURCE is preserved so forks/mirrors
#                              are respected; the two templates are seeded out, not
#                              copied in.)
#   - .claude\agents\         (Bower subagents)
#   - .claude\commands\       (Bower /b-* slash commands)
#
# Conditionally creates:
#   - <target>\CLAUDE.md             only if the target has no CLAUDE.md, seeded
#                                    from _bower\project-CLAUDE.md.
#   - <target>\.claude\settings.json only if absent, seeded from
#                                    _bower\project-settings.json. Pre-allows
#                                    safe read-only Bash patterns Bower skills
#                                    use (find, ls, git status/diff/log/show,
#                                    rg, grep, wc) to cut permission-prompt
#                                    friction. The project owns this file
#                                    afterwards; edit freely.
#   - <target>\_bower\VERSION        only if absent. Holds the framework version
#                                    this project was last migrated to.
#                                    /b-upgrade in the project bumps this
#                                    step-by-step as migrations apply.
#   - <target>\_bower\SOURCE         only if absent. Holds the git URL of the
#                                    framework repo to clone from when
#                                    /b-upgrade runs. Written from this repo's
#                                    `origin` remote.
#
# Does not touch:
#   - target's existing CLAUDE.md, .claude\settings.json, _bower\VERSION, _bower\SOURCE
#   - target's docs\, .claude\settings.local.json, or anything else.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing _bower\ and .claude\agents,commands in place. The project
# should then run /b-upgrade to apply any per-version migrations and bump VERSION.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if (-not (Test-Path -LiteralPath $Target)) {
    New-Item -ItemType Directory -Path $Target | Out-Null
}
$Target = (Resolve-Path -LiteralPath $Target).Path

$frameworkVersion = (Get-Content -LiteralPath (Join-Path $src '_bower\VERSION') -Raw).Trim()

# Capture project's old version (if any) before we touch anything.
$oldVersionPath = Join-Path $Target '_bower\VERSION'
$oldVersion = ''
if (Test-Path -LiteralPath $oldVersionPath) {
    $oldVersion = (Get-Content -LiteralPath $oldVersionPath -Raw).Trim()
}

# 1. _bower\ — copy everything except template seeds (project-CLAUDE.md,
#    project-settings.json), VERSION, and SOURCE.
$bowerDst = Join-Path $Target '_bower'
if (-not (Test-Path -LiteralPath $bowerDst)) {
    New-Item -ItemType Directory -Path $bowerDst | Out-Null
}
Get-ChildItem -LiteralPath (Join-Path $src '_bower') -Force | Where-Object {
    $_.Name -notin @('project-CLAUDE.md', 'project-settings.json', 'VERSION', 'SOURCE')
} | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $bowerDst -Recurse -Force
}

# 2. .claude\agents and .claude\commands — refresh in place.
$claudeDst = Join-Path $Target '.claude'
if (-not (Test-Path -LiteralPath $claudeDst)) {
    New-Item -ItemType Directory -Path $claudeDst | Out-Null
}
foreach ($sub in @('agents', 'commands')) {
    $subSrc = Join-Path $src ".claude\$sub"
    $subDst = Join-Path $claudeDst $sub
    if (Test-Path -LiteralPath $subSrc) {
        if (Test-Path -LiteralPath $subDst) {
            Remove-Item -LiteralPath $subDst -Recurse -Force
        }
        Copy-Item -LiteralPath $subSrc -Destination $subDst -Recurse -Force
    }
}

# 3. CLAUDE.md — seed only if absent.
$claudeMd = Join-Path $Target 'CLAUDE.md'
if (Test-Path -LiteralPath $claudeMd) {
    $claudeAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower\project-CLAUDE.md') -Destination $claudeMd
    $claudeAction = 'created from _bower\project-CLAUDE.md'
}

# 4. .claude\settings.json — seed only if absent. The project owns it after that.
$settingsPath = Join-Path $claudeDst 'settings.json'
if (Test-Path -LiteralPath $settingsPath) {
    $settingsAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower\project-settings.json') -Destination $settingsPath
    $settingsAction = 'created from _bower\project-settings.json'
}

# 5. _bower\VERSION — seed only if absent. /b-upgrade owns it from then on.
if ([string]::IsNullOrEmpty($oldVersion)) {
    Copy-Item -LiteralPath (Join-Path $src '_bower\VERSION') -Destination $oldVersionPath
    $versionAction = "created at $frameworkVersion"
} else {
    $versionAction = "preserved (already exists, was $oldVersion)"
}

# 6. _bower\SOURCE — seed only if absent.
$sourcePath = Join-Path $Target '_bower\SOURCE'
if (Test-Path -LiteralPath $sourcePath) {
    $sourceAction = 'preserved (already exists)'
} else {
    try {
        $remoteUrl = (git -C $src remote get-url origin 2>$null).Trim()
        if ($remoteUrl) {
            Set-Content -LiteralPath $sourcePath -Value $remoteUrl -NoNewline
            Add-Content -LiteralPath $sourcePath -Value ''
            $sourceAction = "created ($remoteUrl)"
        } else {
            $sourceAction = 'skipped (no git remote in framework repo; /b-upgrade will prompt)'
        }
    } catch {
        $sourceAction = 'skipped (no git remote in framework repo; /b-upgrade will prompt)'
    }
}

Write-Host "Bower v$frameworkVersion -> $Target"
Write-Host "  _bower\                  refreshed"
Write-Host "  .claude\agents\          refreshed"
Write-Host "  .claude\commands\        refreshed"
Write-Host "  CLAUDE.md                $claudeAction"
Write-Host "  .claude\settings.json    $settingsAction"
Write-Host "  _bower\VERSION           $versionAction"
Write-Host "  _bower\SOURCE            $sourceAction"

if ($oldVersion -and $oldVersion -ne $frameworkVersion) {
    Write-Host ''
    Write-Host "Project was at v$oldVersion, framework is now v$frameworkVersion."
    Write-Host 'Run /b-upgrade in the project to apply migration notes and bump VERSION.'
}
