# scaffold.ps1 parity

`scripts/scaffold.sh` and `scripts/scaffold.ps1` are kept in lockstep by hand, and `tools/scaffold-test/run.sh` case 6 is the only thing that proves it — but it needs `pwsh` or `powershell` on PATH. Without one it skips with a warning, and every PowerShell edit ships unexecuted: a syntax error, a quoting slip, or a `Write-Host` line that interpolates something it shouldn't would all pass the full suite silently.

**So install PowerShell wherever you develop the framework.** It is cross-platform, and it turns the whole problem into an ordinary test that runs every time. On Debian or Ubuntu (WSL included), Microsoft's package:

```
sudo apt-get install -y powershell      # after adding packages.microsoft.com
```

Where root or the repo is not an option, the release tarball unpacks anywhere — grab `powershell-<version>-linux-x64.tar.gz` (or `osx-arm64`, `linux-arm64`, …) from <https://github.com/PowerShell/PowerShell/releases>, extract it under `~/.local/`, and symlink `pwsh` onto PATH.

Either way, `bash tools/scaffold-test/run.sh` then runs case 6 for real and prints `scaffold-test: ps1-parity ran`.

## What case 6 checks, and what it cannot

Three assertions: `scaffold.ps1` exits 0, its tree is byte-identical to the bash one after CRLF normalisation, and the instruction-file wiring warning is identical in both. That last one earns its place — the warning is pure quoted prose in two languages, which is where they diverge most cheaply, and no other case in the suite makes it fire (the others scaffold into empty targets, so nothing is preserved and the block never prints).

What a **PowerShell 7 on Linux** run does not cover: Windows path semantics (backslash separators, drive letters), CRLF as written by `Set-Content` on Windows — deliberately normalised away by the comparison — and Windows PowerShell 5.1, which is a different edition from `pwsh` 7. Those need a Windows box. A Linux run is sound evidence for syntax, quoting, control flow and output parity; it is not evidence about Windows filesystem behaviour. Record which you did.

## The release gate

`scripts/release.sh` accepts either:

- **case 6 ran in the release environment** — parity compared for real, nothing else needed; or
- **a PASS row in this file naming the version being cut.**

A release with neither aborts, and there is no override flag: an unrun PowerShell path is either verified or it is not. The attestation route exists for environments where installing `pwsh` genuinely is not an option, and for recording the stronger Windows-native runs when somebody has a Windows box in front of them.

To exercise the fallback and the abort on a machine that *does* have PowerShell — worth doing after touching either the gate or the test — force the skip:

```
SCAFFOLD_TEST_NO_PWSH=1 bash scripts/release.sh --dry-run
```

Every release needs one or the other, whether or not `scaffold.ps1` changed. That is deliberate: the scripts share a footprint, so a change to *either* one can break parity, and "the ps1 wasn't touched" is exactly the reasoning that lets a bash-side addition ship with no PowerShell counterpart.

## Attestations

Newest first. Append-only; never edit a row after the fact. **Verdict** is PASS only when case 6 ran with zero failures — a run that skipped is not a row. A release cut on a box that has `pwsh` needs no row, but recording the run costs nothing and is what lets the same version be cut somewhere else.

| Version | Date | Environment | Verdict | By |
| --- | --- | --- | --- | --- |
| 0.37 | 2026-08-13 | PowerShell 7.x (Core) on WSL2 / Ubuntu, x64 — Linux run, so no Windows path or CRLF coverage | PASS | Mat Bettinson |
| 0.33 | 2026-08-05 | PowerShell 7.6.4 (Core) on WSL2 / Ubuntu, x64 — Linux run, so no Windows path or CRLF coverage | PASS | Mat Bettinson |
