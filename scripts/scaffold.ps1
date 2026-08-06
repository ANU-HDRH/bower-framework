# scaffold.ps1 — copy the Bower framework footprint into a target directory.
#
# Usage: scripts\scaffold.ps1 <target-dir>
#
# Preflight:
#   - Every directory this script manages is probed for writability BEFORE
#     anything is written. If any probe fails, the script names the paths and
#     exits 1 having written nothing. Some agent runtimes mount .agents\ and
#     .codex\ read-only inside their sandbox and fail the write outright rather
#     than prompting — a half-finished run would leave the runtime adapters on
#     different framework versions.
#
# Always copies (overwrites):
#   - _bower\                 (excluding the project-* templates, VERSION, and
#                              SOURCE — VERSION is owned by /b-upgrade in the
#                              project; SOURCE is preserved so forks/mirrors are
#                              respected; the templates are seeded out, not
#                              copied in.)
#   - .claude\agents\         (Bower subagents)
#   - .claude\commands\       (Bower /b-* slash commands)
#   - .agents\skills\b-*\     (Bower skills, the runtime-neutral location)
#   - .codex\agents\bower-*   (Bower custom agents for Codex)
#
# Prunes:
#   - Anything in <target>\_bower\ that the framework no longer ships, except
#     VERSION and SOURCE (project-owned). Directories are replaced wholesale,
#     so files retired inside them (e.g. a renamed viewer\ asset) go too.
#   - Entries in <target>\.agents\skills\ and <target>\.codex\agents\ that are
#     in a framework-owned namespace (`b-*`, `bower-*`) but have no counterpart
#     in this framework version. Anything outside those two namespaces is left
#     alone — .agents\skills\ is the standard skills location and a project may
#     keep its own skills there.
#     Each removal is named in the closing summary.
#
# Conditionally creates:
#   - <target>\AGENTS.md             only if the target has no AGENTS.md, seeded
#                                    from _bower\project-AGENTS.md. Thin: the
#                                    router directive plus project content. A
#                                    grown AGENTS.md is never edited.
#   - <target>\CLAUDE.md             only if the target has no CLAUDE.md, seeded
#                                    from _bower\project-CLAUDE.md — a two-line
#                                    shim that includes AGENTS.md and the
#                                    framework router.
#   - <target>\.codex\config.toml    only if absent, seeded from
#                                    _bower\project-codex-config.toml. Codex
#                                    convenience defaults; the project owns it
#                                    afterwards.
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
#   - target's existing AGENTS.md, CLAUDE.md, .codex\config.toml,
#     .claude\settings.json, _bower\VERSION, _bower\SOURCE
#   - target's docs\, .claude\settings.local.json, non-framework skills, or
#     anything else.
#
# Warns (but never edits) when a *preserved* AGENTS.md carries no reference to
# _bower\framework.md, or a preserved CLAUDE.md is missing either include line.
# An unwired instruction file means the runtime loads no router, and on a fresh
# adoption nothing downstream repairs it: VERSION is seeded at the current
# version, so /b-upgrade has no migration to walk. The warning prints last, names
# the exact lines, and says whether /b-upgrade or the operator should add them.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing _bower\ and the runtime adapter trees in place. The
# project should then run /b-upgrade to apply any per-version migrations and
# bump VERSION.

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

$frameworkVersion = (Get-Content -LiteralPath (Join-Path $src '_bower/VERSION') -Raw).Trim()

# Capture project's old version (if any) before we touch anything.
$oldVersionPath = Join-Path $Target '_bower/VERSION'
$oldVersion = ''
if (Test-Path -LiteralPath $oldVersionPath) {
    $oldVersion = (Get-Content -LiteralPath $oldVersionPath -Raw).Trim()
}

# 0. Preflight: can we write everywhere we intend to? A directory that doesn't
#    exist yet is judged by its nearest existing ancestor, which is where the
#    mkdir would land. Probe files are removed immediately; a failed probe
#    creates nothing.
function Test-BowerWritable {
    param([string]$Path)
    $d = $Path
    while (-not (Test-Path -LiteralPath $d -PathType Container)) {
        $parent = Split-Path -Parent $d
        if (-not $parent -or $parent -eq $d) { return $false }
        $d = $parent
    }
    $probe = Join-Path $d ".bower-write-probe.$PID"
    try {
        New-Item -ItemType File -Path $probe -Force -ErrorAction Stop | Out-Null
        Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

$managed = @(
    $Target,
    (Join-Path $Target '_bower'),
    (Join-Path $Target '.claude'),
    (Join-Path $Target '.agents/skills'),
    (Join-Path $Target '.codex/agents')
)
$unwritable = @($managed | Where-Object { -not (Test-BowerWritable $_) })
if ($unwritable.Count -gt 0) {
    Write-Error -Message (@(
        'cannot write to paths this scaffold manages:'
        ($unwritable | ForEach-Object { "  $_" })
        ''
        'Nothing was written — the target is unchanged.'
        ''
        'Some agent runtimes mount .agents\ and .codex\ read-only inside their'
        'sandbox and fail the write outright rather than prompting for approval.'
        'If that is what happened, run this yourself in a terminal outside the'
        'sandbox:'
        ''
        "  powershell -File $src\scripts\scaffold.ps1 $Target"
    ) -join [Environment]::NewLine) -ErrorAction Continue
    exit 1
}

# 1. _bower\ — copy everything except the project-* template seeds, VERSION,
#    and SOURCE.
$bowerDst = Join-Path $Target '_bower'
if (-not (Test-Path -LiteralPath $bowerDst)) {
    New-Item -ItemType Directory -Path $bowerDst | Out-Null
}
Get-ChildItem -LiteralPath (Join-Path $src '_bower') -Force | Where-Object {
    $_.Name -notlike 'project-*' -and $_.Name -notin @('VERSION', 'SOURCE')
} | ForEach-Object {
    # Replace directories wholesale rather than merging, so files retired
    # inside them don't linger downstream.
    if ($_.PSIsContainer) {
        $dstSub = Join-Path $bowerDst $_.Name
        if (Test-Path -LiteralPath $dstSub) {
            Remove-Item -LiteralPath $dstSub -Recurse -Force
        }
    }
    Copy-Item -LiteralPath $_.FullName -Destination $bowerDst -Recurse -Force
}

# 1b. Prune _bower\ entries the framework no longer ships. VERSION and SOURCE
#     are project-owned and never pruned.
$pruned = @()
Get-ChildItem -LiteralPath $bowerDst -Force | Where-Object {
    $_.Name -notin @('VERSION', 'SOURCE')
} | ForEach-Object {
    if (-not (Test-Path -LiteralPath (Join-Path $src "_bower/$($_.Name)"))) {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
        $pruned += $_.Name
    }
}

# 2. .claude\agents and .claude\commands — refresh in place. Both trees are
#    wholly framework-owned, so they are replaced wholesale.
$claudeDst = Join-Path $Target '.claude'
if (-not (Test-Path -LiteralPath $claudeDst)) {
    New-Item -ItemType Directory -Path $claudeDst | Out-Null
}
foreach ($sub in @('agents', 'commands')) {
    $subSrc = Join-Path $src ".claude/$sub"
    $subDst = Join-Path $claudeDst $sub
    if (Test-Path -LiteralPath $subSrc) {
        if (Test-Path -LiteralPath $subDst) {
            Remove-Item -LiteralPath $subDst -Recurse -Force
        }
        Copy-Item -LiteralPath $subSrc -Destination $subDst -Recurse -Force
    }
}

# 3. .agents\skills\ — namespace-scoped replace. This is the standard skills
#    location and the project may keep its own skills alongside ours, so only
#    the framework-owned namespaces (b-*, bower-*) are ever touched.
$skillsSrc = Join-Path $src '.agents/skills'
$skillsDst = Join-Path $Target '.agents/skills'
if (-not (Test-Path -LiteralPath $skillsDst)) {
    New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
}
$shippedSkills = @()
if (Test-Path -LiteralPath $skillsSrc) {
    Get-ChildItem -LiteralPath $skillsSrc -Force -Directory | Where-Object {
        $_.Name -like 'b-*' -or $_.Name -like 'bower-*'
    } | ForEach-Object {
        $shippedSkills += $_.Name
        $dst = Join-Path $skillsDst $_.Name
        if (Test-Path -LiteralPath $dst) {
            Remove-Item -LiteralPath $dst -Recurse -Force
        }
        Copy-Item -LiteralPath $_.FullName -Destination $dst -Recurse -Force
    }
}

$skillsPruned = @()
Get-ChildItem -LiteralPath $skillsDst -Force -Directory | Where-Object {
    $_.Name -like 'b-*' -or $_.Name -like 'bower-*'
} | ForEach-Object {
    if ($shippedSkills -notcontains $_.Name) {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
        $skillsPruned += $_.Name
    }
}

# 4. .codex\agents\ — same namespace-scoped rule, over bower-*.toml files.
$codexSrc = Join-Path $src '.codex/agents'
$codexDst = Join-Path $Target '.codex/agents'
if (-not (Test-Path -LiteralPath $codexDst)) {
    New-Item -ItemType Directory -Path $codexDst -Force | Out-Null
}
$shippedCodex = @()
if (Test-Path -LiteralPath $codexSrc) {
    Get-ChildItem -LiteralPath $codexSrc -Force -File | Where-Object {
        ($_.Name -like 'b-*.toml' -or $_.Name -like 'bower-*.toml')
    } | ForEach-Object {
        $shippedCodex += $_.Name
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $codexDst $_.Name) -Force
    }
}

$codexPruned = @()
Get-ChildItem -LiteralPath $codexDst -Force -File | Where-Object {
    ($_.Name -like 'b-*.toml' -or $_.Name -like 'bower-*.toml')
} | ForEach-Object {
    if ($shippedCodex -notcontains $_.Name) {
        Remove-Item -LiteralPath $_.FullName -Force
        $codexPruned += $_.Name
    }
}

# 5. AGENTS.md — seed only if absent. A grown AGENTS.md is never edited; adding
#    the router directive to one is /b-upgrade's judgement step.
$agentsMd = Join-Path $Target 'AGENTS.md'
if (Test-Path -LiteralPath $agentsMd) {
    $agentsAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower/project-AGENTS.md') -Destination $agentsMd
    $agentsAction = 'created from _bower\project-AGENTS.md'
}

# 6. CLAUDE.md — seed only if absent.
$claudeMd = Join-Path $Target 'CLAUDE.md'
if (Test-Path -LiteralPath $claudeMd) {
    $claudeAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower/project-CLAUDE.md') -Destination $claudeMd
    $claudeAction = 'created from _bower\project-CLAUDE.md'
}

# 7. .codex\config.toml — seed only if absent. The project owns it after that.
$codexConfig = Join-Path $Target '.codex/config.toml'
if (Test-Path -LiteralPath $codexConfig) {
    $codexConfigAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower/project-codex-config.toml') -Destination $codexConfig
    $codexConfigAction = 'created from _bower\project-codex-config.toml'
}

# 8. .claude\settings.json — seed only if absent. The project owns it after that.
$settingsPath = Join-Path $claudeDst 'settings.json'
if (Test-Path -LiteralPath $settingsPath) {
    $settingsAction = 'preserved (already exists)'
} else {
    Copy-Item -LiteralPath (Join-Path $src '_bower/project-settings.json') -Destination $settingsPath
    $settingsAction = 'created from _bower\project-settings.json'
}

# 9. _bower\VERSION — seed only if absent. /b-upgrade owns it from then on.
if ([string]::IsNullOrEmpty($oldVersion)) {
    Copy-Item -LiteralPath (Join-Path $src '_bower/VERSION') -Destination $oldVersionPath
    $versionAction = "created at $frameworkVersion"
} else {
    $versionAction = "preserved (already exists, was $oldVersion)"
}

# 10. _bower\SOURCE — seed only if absent.
$sourcePath = Join-Path $Target '_bower/SOURCE'
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

# 11. Wiring check on *preserved* instruction files. Seeding-if-absent is right —
#     a grown AGENTS.md or CLAUDE.md is project-owned and this script must never
#     edit one. But preserving an unwired file silently is not: neither runtime
#     loads _bower\framework.md, so every gate, runtime binding and document
#     schema the skills cite is missing from the session, and the commands run
#     anyway and produce non-conformant work. For a project newly adopting Bower
#     nothing downstream repairs it either — VERSION is seeded current, so
#     /b-upgrade has no migration to walk. Name it, with the exact lines, as the
#     last thing on screen.
$agentsUnwired = $false
if ($agentsAction -like 'preserved*') {
    $agentsBody = Get-Content -LiteralPath $agentsMd -Raw
    if (($agentsBody -notlike '*_bower/framework.md*') -and
        ($agentsBody -notlike '*_bower\framework.md*')) {
        $agentsUnwired = $true
    }
}
$claudeMissing = @()
if ($claudeAction -like 'preserved*') {
    $claudeBody = Get-Content -LiteralPath $claudeMd -Raw
    if ($claudeBody -notlike '*@AGENTS.md*')           { $claudeMissing += '@AGENTS.md' }
    if ($claudeBody -notlike '*@_bower/framework.md*') { $claudeMissing += '@_bower/framework.md' }
}

Write-Host "Bower v$frameworkVersion -> $Target"
Write-Host "  _bower\                  refreshed"
foreach ($name in $pruned) {
    Write-Host "  _bower\$name  removed (retired upstream)"
}
Write-Host "  .claude\agents\          refreshed"
Write-Host "  .claude\commands\        refreshed"
Write-Host "  .agents\skills\          refreshed (framework skills only)"
foreach ($name in $skillsPruned) {
    Write-Host "  .agents\skills\$name  removed (retired upstream)"
}
Write-Host "  .codex\agents\           refreshed (framework agents only)"
foreach ($name in $codexPruned) {
    Write-Host "  .codex\agents\$name  removed (retired upstream)"
}
Write-Host "  AGENTS.md                $agentsAction"
Write-Host "  CLAUDE.md                $claudeAction"
Write-Host "  .codex\config.toml       $codexConfigAction"
Write-Host "  .claude\settings.json    $settingsAction"
Write-Host "  _bower\VERSION           $versionAction"
Write-Host "  _bower\SOURCE            $sourceAction"

Write-Host ''
Write-Host 'This rewrote instruction files. Agent runtimes do not reliably reload them'
Write-Host 'mid-session — if this ran under one, start a new session before further'
Write-Host 'Bower work.'

if ($oldVersion -and $oldVersion -ne $frameworkVersion) {
    Write-Host ''
    Write-Host "Project was at v$oldVersion, framework is now v$frameworkVersion."
    Write-Host 'Run /b-upgrade in the project to apply migration notes and bump VERSION.'
}

# The wiring warning goes last, so it is what the operator is left looking at.
if ($agentsUnwired -or $claudeMissing.Count -gt 0) {
    Write-Host ''
    Write-Host '================================================================================'
    Write-Host 'ACTION REQUIRED — your instruction files do not reach the Bower router'
    Write-Host '================================================================================'
    Write-Host ''
    Write-Host 'These files already existed, so they were preserved exactly as they are — this'
    Write-Host "script never edits a project's own instruction files. What is missing below is"
    Write-Host 'how a session reaches `_bower/framework.md`, and through it every gate, runtime'
    Write-Host 'binding and document schema the Bower commands cite. On the runtime whose path'
    Write-Host 'is broken the commands still run, and produce non-conformant work.'
    if ($agentsUnwired) {
        Write-Host ''
        Write-Host 'AGENTS.md — add this paragraph near the top, as its own paragraph:'
        Write-Host ''
        Write-Host '  **Before any Bower work — any `/b-*` or `$b-*` skill, any question about'
        Write-Host '  project state, any change to `docs/` — read `_bower/framework.md` in full.**'
        Write-Host '  It is the router for how this project is designed, documented, and changed;'
        Write-Host '  acting without it produces non-conformant work.'
        Write-Host ''
        Write-Host "This is the whole of Codex's path to the router: AGENTS.md is the file it always"
        Write-Host 'loads, and it has no include mechanism to follow.'
    }
    if ($claudeMissing.Count -gt 0) {
        Write-Host ''
        Write-Host 'CLAUDE.md — add the missing include line(s), conventionally at the top:'
        Write-Host ''
        foreach ($line in $claudeMissing) {
            Write-Host "  $line"
        }
        Write-Host ''
        Write-Host 'Neither line is redundant: `@AGENTS.md` pulls in the project''s own instructions,'
        Write-Host '`@_bower/framework.md` loads the router. Claude Code needs both — it is the only'
        Write-Host 'runtime that reads CLAUDE.md at all.'
    }
    if ($oldVersion -and $oldVersion -ne $frameworkVersion) {
        Write-Host ''
        Write-Host "You are mid-upgrade, so there is a better path than editing by hand: /b-upgrade's"
        Write-Host 'migration step does exactly this as a gated edit, moving your own content into'
        Write-Host 'place rather than overwriting it. The lines above are what it will add.'
    } else {
        Write-Host ''
        Write-Host 'Nothing downstream will do this for you. This project starts at the current'
        Write-Host 'framework version, so /b-upgrade has no migration to walk. Add the lines above'
        Write-Host 'before your first Bower command.'
    }
    Write-Host ''
}
