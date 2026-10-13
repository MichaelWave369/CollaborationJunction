# HAI-001 · Future isolated evaluator threat model

**Status: DESIGN ONLY, NOT IMPLEMENTED, NOT APPROVED TO RUN UNTRUSTED CODE.**  
**Version:** 0.1 draft, 2026-10-12.

## The security boundary

A research participant could submit malicious or unexpectedly unsafe JavaScript. Even code that looks innocent may hang, allocate huge amounts of memory, spawn subprocesses, access secrets, run a network miner, probe a host, or write outside its assigned workspace. GitHub Actions is **not** an acceptable general-purpose untrusted program execution service for this project.

No real research runner exists in the repository. The tools in PR #8 only read private source as bytes and compute cryptographic commitments. The eventual evaluator requires independent security review and explicit human approval to run.

## Explicit isolation requirements for a later implementation

| Area | Minimum security requirement |
| --- | --- |
| Host | Dedicated disposable VM/machine, not the maintainer's main workstation; separate research identity and credentials |
| Container | Runtime inside a dedicated VM where possible; an ordinary container alone is **not** a complete hostile-code boundary |
| Filesystem | Read-only runtime, fresh short-lived writable scratch volume with size limit, no host personal directories or credential mounts |
| Network | Default-deny all outbound/inbound network; no internet or metadata-service access |
| Processes | Non-root unprivileged UID, zero Linux capabilities, no-new-privileges, strict process count |
| Compute | Hard CPU, memory, process, output-volume, disk and wall-clock limits with an independent watchdog |
| System calls | Current vetted seccomp/VM hardening; no privileged mode, daemon/socket mounts or nested container control |
| Inputs | Locked source and holdout are passed as read-only inputs to isolated runner; never execute the original commit/signing tools against candidate source |
| Outputs | Fixed-size JSON outputs and exit state only, scrubbed for secrets and personally identifying data; preserve crashes and timeouts as failures |
| Custody | Witnessed holdout and submission commitments precede evaluation, with independently preserved experiment/environment manifest |
| Cleanup | Destroy disposable VM and credentials after evaluation; retain approved non-sensitive logs and signed receipts |
| Authorization | Security review of runner implementation and each operator-run scope; no automatic run on pull requests |

### Disallowed shortcuts

- `node candidate.js`, `eval()`, `Function()`, dynamic `import()` of unknown submissions on the host.
- Running candidate code directly in CI where it might access GitHub tokens, environment variables, repository credentials, or the network.
- Believing that a short timeout, Docker alone, or a `--network=none` flag proves complete isolation.
- Releasing hidden tests before the submissions are independently sealed and witnessed.
- Auto-marking a trial `VERIFIED` because a program printed expected public outputs.

### Evaluation validity requirements

The future harness must use independent unseen cases bound to a prior challenge commitment. It must independently compare actual program outputs, not use participant-provided answers or self-reported pass counts. Precommit scoring behavior before evaluations, and store execution metadata, resource usage, test IDs, failures, exclusions and rejected attempts.

**No model or candidate code is executed by this design document or the accompanying custody utilities.**

## Research go/no-go checklist

A future runner may be designed only after explicit review of: host isolation, participant consent, challenge quality, custody ordering, threat-model tests, logging/audit policies, privacy protection, and human authorization. Passing a static CI test suite is not sufficient.

**Current HAI-001 study state: NOT RUN.**
