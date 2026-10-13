# HAI-001 v0.1.0 deterministic case-scoring instrument

**State:** tooling only; no observed calibration or controlled study results.  
**Built:** 2026-10-12.

## Purpose

Previously the calibration form allowed a human to type a `passed_cases` total (0–5) and independently attest it had been cross-checked. That number must not be accepted as a research finding without independent corroboration.

This change adds a **deterministic checker for JSON outputs**, not a code runner. It uses the frozen five expected values for a single task, does structural JSON comparison, and returns pass/fail for each case. A supplied `MISSING` response fails its case. Array order matters, object key order does not, and numbers are compared exactly. There is no fuzzy scoring.

Because acceptance fixtures are publicly visible, matching them can be accomplished by copying answers. Thus `5/5` is **not proof that an implementation works**. It is one traceable scoring step. Future studies need an independently designed, securely isolated functional test harness and external task-difficulty calibration.

## CLI quick start

```sh
node scripts/hai-001/verify-lock.mjs
node scripts/hai-001/score-answers.mjs examples/hai-001-synthetic-answers.json
node scripts/hai-001/audit-calibration.mjs calibration.json answers.json
node --test tests/*.test.mjs
```

A browser equivalent at `/CollaborationJunction/calibration/checker.html` verifies the frozen fixture SHA-256 before examining a local JSON file. Its output receipt omits the raw answer values and includes a SHA-256 digest of the exact bytes of the submitted answer file. A digest is an identifier, not a digital signature or proof of provenance.

## Answer-file schema

```json
{
  "schema": "CJ-HAI001-ANSWERS-v1",
  "protocol": "HAI-001",
  "task_pack_sha256": "3427497a87ff11f7f39beb32daea7b454457c0ba4c7ca9ed04debc4d647bf803",
  "origin": "SYNTHETIC",
  "task_id": "HAI-001-T01",
  "pilot_id": "DEMO_PILOT_01",
  "answers": [
    {"case_id":"HAI-001-T01-C01","kind":"VALUE","value":["a"]},
    {"case_id":"HAI-001-T01-C02","kind":"MISSING"}
  ]
}
```

This fragment illustrates the schema; an actual answer file must provide **all five cases** with unique IDs, each of kind `VALUE` (including a JSON value) or `MISSING` (without a value). The repository includes a complete synthetic file.

Only anonymous uppercase pilot IDs are accepted. No code, prompts, source files, secrets, names, contact information, or raw personal records should be submitted. OBSERVED marks a human claim about origin; it is not independently verified.

## Calibration audit

The auditor takes a calibration JSON export and one or more original answer JSON files. It recomputes each score **from the frozen fixtures** and matches by opaque pilot ID and task ID.

The report flags missing outputs, duplicate evidence, case-count differences, and origin mismatches. A nonzero exit code 2 means some entered pilot claims remain unmatched. Even if all counts agree, no claim about a real human session, consent, independent evaluation, timekeeping, participant identity, model used or task equivalence has been established.

Public records should contain only carefully reviewed, consented, sanitized data. Avoid publishing original answer files or personal/custody logs. Keep evidence locally with appropriate safeguards.

## Reproducibility limitations

- A human could copy the five expected outputs into an answer file without building any software.
- A researcher could falsely state that a file resulted from a real pilot.
- Matching a SHA-256 digest establishes byte identity of a file only; it does not authenticate an author or timestamp.
- A `cases_crosschecked` true flag is still only an operator attestation.
- Scoring equality against five visible cases does not measure generalization.
- No source code is executed; malicious programs cannot be run by this tool.
- Before future experimentation, independent reviewers must approve the methodology, sandbox and valid test suite.

**Scientific state remains: CALIBRATION NOT STARTED. EXPERIMENT RUNS: ZERO.**

## Preventing public-fixture copying in a future study

The five public cases in this scorer are **practice/transparent verification**, not a credible secret holdout. An independent evaluator must prepare fresh, hidden challenge inputs and answers without exposure to future submissions. The new [HAI-001 sealed challenge protocol](HAI-001-HOLDOUT.md) offers offline commitment/reveal of the exact private file bytes. It is not a candidate-code executor or proof of independent administration. Study state remains **NOT STARTED**.
