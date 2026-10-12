# HAI-001 protocol versions

## v0.1.0 / frozen draft, not run

This directory holds a publicly reviewable precommitted task pack, acceptance fixtures, scoring rubric and condition definitions.

- **12 tasks** grouped into 4 candidate complexity families, with **5 public acceptance cases per task** (60 cases).
- **4 proposed conditions** (human-only, human + small local model, human + cloud model, bounded model-first).
- **No human or model experiment has been run** in this repo.
- All candidate implementations must be original and comply with authorized task constraints.
- The task families are **not empirically difficulty matched yet**. This must be evaluated during a separate calibration phase and disclosed.

### Integrity

File bytes for `v0.1.0/{tasks,fixtures,rubric,conditions}.json` are SHA-256 hashed individually. The aggregate digest hashes sorted lines of `filename TAB fileSha256 NEWLINE`.

Run:

```sh
node scripts/hai-001/verify-lock.mjs
node --test tests/hai001.test.mjs
node scripts/hai-001/validate-receipt.mjs examples/hai-001-synthetic-receipt.json
```

The example receipt is **SYNTHETIC** and is not evidence of an experiment. Receipt validation establishes syntax and task membership **only**. It does not check reported outcomes, execute code, or validate model contributions.

### Study guardrails

1. Before any qualifying trial, independently register assignment seed, participant/round counts, preregistered allocation and task-time protocol. Do not use one person's repeated exposure to identical tasks to claim unbiased differences.
2. Keep candidate solutions and execution isolated. **Never directly run untrusted generated code on a production or personal machine.** Any later execution harness requires sandboxing and explicit approval.
3. Pilot/calibration data must be labeled exploratory; only future properly designed runs can support confirmatory hypotheses.
4. All visible acceptance examples are open-book. Correctly passing them is not proof of full correctness or broad generalization.
5. To amend frozen content, create a **new version directory** and a new manifest. Never silently change v0.1.0's evidence contract.

### Protocol status

Status: `FROZEN_FOR_REVIEW_NOT_RUN`. This freeze locks the *measurement specification*, not results. A green CI check establishes only internal structural/integrity checks.
