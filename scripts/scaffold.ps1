# scaffold.ps1 — seed the Bower framework footprint into a target directory.
#
# Usage:
#   scripts\scaffold.ps1 [-Plugin] <target-dir>
#
# Source layout (this repo / the installed plugin):
#   commands\<cmd>.md         the /bower:<cmd> slash commands (plugin-native names)
#   agents\bower-*.md         the Bower subagents
#   _bower\*.md               reference files (framework.md, changes.md, …)
#   _bower\VERSION            canonical framework version
#   _bower\project-CLAUDE.md  CLAUDE.md template seeded into new projects
#   _bower\project-settings.json  .claude\settings.json template
#
# Source root resolves to $env:CLAUDE_PLUGIN_ROOT when set (so this script works
# when shipped inside the `bower` plugin); otherwise to this repo (so the legacy
# `git clone + scaffold.ps1` path is unchanged).
#
# TWO MODES
# ---------
# Legacy mode (default) — for projects that DON'T install the plugin:
#   Seeds the full footprint, transforming the plugin-native command refs back to
#   the flat scaffold form so the project gets `/b-*` commands:
#     - commands\<cmd>.md  -> <target>\.claude\commands\b-<cmd>.md  (refs /bower:x -> /b-x)
#     - agents\*.md        -> <target>\.claude\agents\               (refs /bower:x -> /b-x)
#     - _bower\*.md        -> <target>\_bower\                       (refs /bower:x -> /b-x)
#   This output is byte-identical to historical scaffold output. `commands\init.md`
#   is plugin-only and is NOT copied in legacy mode.
#
# -Plugin mode — for projects that DO install the `bower` plugin:
#   Seeds PROJECT STATE ONLY. The plugin supplies the commands and agents, so this
#   mode does NOT create .claude\commands or .claude\agents, and copies _bower\*.md
#   VERBATIM (keeping the /bower: command refs the plugin cohort actually types).
#   This is what `/bower:init` runs.
#
# Always copies (overwrites), per mode as above:
#   - _bower\                 (excluding project-CLAUDE.md, project-settings.json,
#                              VERSION, and SOURCE — VERSION is owned by the upgrade
#                              flow in the project; SOURCE is preserved so
#                              forks/mirrors are respected; the two templates are
#                              seeded out, not copied in.)
#   - .claude\agents\, .claude\commands\   (legacy mode only)
#
# Conditionally creates (both modes):
#   - <target>\CLAUDE.md             only if absent, seeded from
#                                    _bower\project-CLAUDE.md.
#   - <target>\.claude\settings.json only if absent, seeded from
#                                    _bower\project-settings.json.
#   - <target>\_bower\VERSION        only if absent.
#   - <target>\_bower\SOURCE         only if absent. Written from this repo's
#                                    `origin` remote (skipped when sourcing from a
#                                    plugin cache with no git remote).
#
# Does not touch:
#   - target's existing CLAUDE.md, .claude\settings.json, _bower\VERSION, _bower\SOURCE
#   - target's docs\, .claude\settings.local.json, or anything else.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing the footprint in place. The project should then run
# /b-upgrade (legacy) or /bower:upgrade (plugin) to apply per-version migrations.

[CmdletBinding()]
param(
    [switch]$Plugin,
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

# Source root: the installed plugin dir if present, else this repo.
if ($env:CLAUDE_PLUGIN_ROOT) {
    $src = $env:CLAUDE_PLUGIN_ROOT
} else {
    $src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

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

# Copy a single file. In legacy mode, .md files have their plugin-native command
# refs (/bower:cmd) rewritten to the flat scaffold form (/b-cmd); everything else
# (and everything in plugin mode) is copied verbatim. [a-z-]+ so multi-word
# historical refs (e.g. /bower:design-full) round-trip exactly.
function Copy-BowerFile {
    param([string]$From, [string]$To)
    if ((-not $Plugin) -and $From.EndsWith('.md')) {
        $content = Get-Content -LiteralPath $From -Raw
        $content = [regex]::Replace($content, '/bower:([a-z-]+)', '/b-$1')
        # Preserve byte-for-byte: write without a BOM and without an added newline.
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($To, $content, $utf8NoBom)
    } else {
        Copy-Item -LiteralPath $From -Destination $To -Force
    }
}

# 1. _bower\ — copy reference files, excluding template seeds, VERSION, SOURCE.
$bowerDst = Join-Path $Target '_bower'
if (-not (Test-Path -LiteralPath $bowerDst)) {
    New-Item -ItemType Directory -Path $bowerDst | Out-Null
}
Get-ChildItem -LiteralPath (Join-Path $src '_bower') -Force | Where-Object {
    $_.Name -notin @('project-CLAUDE.md', 'project-settings.json', 'VERSION', 'SOURCE')
} | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -LiteralPath $_.FullName -Destination $bowerDst -Recurse -Force
    } else {
        Copy-BowerFile -From $_.FullName -To (Join-Path $bowerDst $_.Name)
    }
}

# 2. Commands and agents — legacy mode only (the plugin supplies these otherwise).
$claudeDst = Join-Path $Target '.claude'
if (-not (Test-Path -LiteralPath $claudeDst)) {
    New-Item -ItemType Directory -Path $claudeDst | Out-Null
}
if (-not $Plugin) {
    $commandsDst = Join-Path $claudeDst 'commands'
    $agentsDst = Join-Path $claudeDst 'agents'
    foreach ($d in @($commandsDst, $agentsDst)) {
        if (Test-Path -LiteralPath $d) { Remove-Item -LiteralPath $d -Recurse -Force }
        New-Item -ItemType Directory -Path $d | Out-Null
    }
    # commands\<cmd>.md -> .claude\commands\b-<cmd>.md (init.md is plugin-only: skip).
    Get-ChildItem -LiteralPath (Join-Path $src 'commands') -Filter '*.md' | Where-Object {
        $_.Name -ne 'init.md'
    } | ForEach-Object {
        Copy-BowerFile -From $_.FullName -To (Join-Path $commandsDst ('b-' + $_.Name))
    }
    # agents\*.md -> .claude\agents\ (names unchanged; plugins don't namespace agents).
    Get-ChildItem -LiteralPath (Join-Path $src 'agents') -Filter '*.md' | ForEach-Object {
        Copy-BowerFile -From $_.FullName -To (Join-Path $agentsDst $_.Name)
    }
}

# 3. CLAUDE.md — seed only if absent.
$claudeMd = Join-Path $Target 'CLAUDE.md'
if (Test-Path -LiteralPath $claudeMd) {
    $claudeAction = 'preserved (already exists)'
} else {
    Copy-BowerFile -From (Join-Path $src '_bower\project-CLAUDE.md') -To $claudeMd
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

# 5. _bower\VERSION — seed only if absent. Upgrade owns it from then on.
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
            $sourceAction = 'skipped (no git remote at source; upgrade will prompt)'
        }
    } catch {
        $sourceAction = 'skipped (no git remote at source; upgrade will prompt)'
    }
}

$modeLabel = if ($Plugin) { 'plugin (project state only)' } else { 'legacy (in-tree /b-* commands)' }
Write-Host "Bower v$frameworkVersion -> $Target  [$modeLabel]"
Write-Host "  _bower\                  refreshed"
if ($Plugin) {
    Write-Host "  .claude\commands,agents  skipped (provided by plugin)"
} else {
    Write-Host "  .claude\agents\          refreshed"
    Write-Host "  .claude\commands\        refreshed"
}
Write-Host "  CLAUDE.md                $claudeAction"
Write-Host "  .claude\settings.json    $settingsAction"
Write-Host "  _bower\VERSION           $versionAction"
Write-Host "  _bower\SOURCE            $sourceAction"

if ($oldVersion -and $oldVersion -ne $frameworkVersion) {
    Write-Host ''
    Write-Host "Project was at v$oldVersion, framework is now v$frameworkVersion."
    if ($Plugin) {
        Write-Host 'Run /bower:upgrade in the project to apply migration notes and bump VERSION.'
    } else {
        Write-Host 'Run /b-upgrade in the project to apply migration notes and bump VERSION.'
    }
}
