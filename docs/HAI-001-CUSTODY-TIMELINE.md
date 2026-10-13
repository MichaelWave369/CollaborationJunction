# HAI-001 · Public custody sequencing screen

**Status:** Research tooling / NOT STARTED. No real calibration, independent witnessing, holdout registration, participant submission or confirmatory trial has occurred.

This document specifies **PR #9**, a read-only chronology consistency checker connecting the sealed challenge from PR #7 and the source commitment from PR #8. It is not a timestamping, attestation, code-running or approval service.

## The core problem

Two files can have perfectly valid cryptographic commitments and still support a fabricated story. A source could have been modified after the challenges were revealed, or a supposed publication might never have existed. A local computer clock and a JSON field saying “witnessed” provide no independent proof of chronology.

A trustworthy study needs an externally verifiable sequence: a witnessed public **holdout commitment**, then a witnessed **submission commitment**, then an independently witnessed **submission cutoff**, all before revealing private tests.

## What the checker verifies automatically

1. The exact **bytes** of a holdout public commitment and source public commitment (SHA-256), not merely their described digests.
2. Their schema, task ID, locked HAI-001 v0.1.0 pack hash and the fact that the source commitment binds the *same holdout commitment digest*.
3. A three-stage, ordered event ledger with strictly increasing, syntactically valid UTC times and distinct purported public GitHub commit SHA URLs.
4. A separately named opaque witness code for each stage, distinct from the named custodian code; this is **syntax only**.
5. Consistency between the declared provenance of the source commitment and the timeline's synthetic/observed designation. A synthetic source cannot be relabeled observed.
6. The third stage is a claimed submission-window closure, not a reveal permission. No case data or private nonce is read.

## What the checker does **not** verify

It does not visit the purported GitHub URLs, check whether those commits truly exist, validate their *GitHub-authored timestamps*, certify a witness's identity or independence, read private custody logs, confirm consent, inspect source code, run a VM, or permit challenge reveal. A fabricated timeline that looks structurally correct can pass the syntax screen.

Even **ATTESTED_OBSERVATION** returns only `STRUCTURAL_SEQUENCE_RECORDED`, with these hardcoded false: `external_publication_verified`, `independent_witness_verified`, `authorized_to_reveal`, `authorized_to_execute`, `scientific_result`.

## Input data and operator workflow

The CLI uses a timeline JSON, the **public** holdout commitment JSON, and the **public** source commitment JSON:

```sh
node scripts/hai-001/custody-sequence.mjs \
  /local/custody-timeline.json \
  /local/public-holdout-commitment.json \
  /local/public-source-commitment.json
```

The timeline schema is:

```json
{
  "schema": "CJ-HAI001-CUSTODY-SEQUENCE-v1",
  "protocol": "HAI-001",
  "task_pack_sha256": "3427497a87ff11f7f39beb32daea7b454457c0ba4c7ca9ed04debc4d647bf803",
  "record_kind": "SYNTHETIC",
  "task_id": "HAI-001-T01",
  "trial_id": "TRIAL_SYNTHETIC_0001",
  "custodian_id": "CUSTODIAN_DEMO",
  "events": [
    {
      "stage": "HOLDOUT_COMMITMENT_PUBLISHED",
      "timestamp_utc": "2026-10-11T12:00:00Z",
      "witness_id": "WITNESS_DEMO_001",
      "anchor": {"kind":"GITHUB_COMMIT","url":"https://github.com/synthetic/example/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
      "commitment_file_sha256": "PUT_EXACT_PUBLIC_HOLDOUT_FILE_SHA256_HERE"
    },
    {
      "stage": "SUBMISSION_COMMITMENT_PUBLISHED",
      "timestamp_utc": "2026-10-11T13:00:00Z",
      "witness_id": "WITNESS_DEMO_002",
      "anchor": {"kind":"GITHUB_COMMIT","url":"https://github.com/synthetic/example/commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","sha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
      "commitment_file_sha256": "PUT_EXACT_PUBLIC_SUBMISSION_FILE_SHA256_HERE"
    },
    {
      "stage": "SUBMISSION_WINDOW_CLOSED",
      "timestamp_utc": "2026-10-11T14:00:00Z",
      "witness_id": "WITNESS_DEMO_003",
      "anchor": {"kind":"GITHUB_COMMIT","url":"https://github.com/synthetic/example/commit/cccccccccccccccccccccccccccccccccccccccc","sha":"cccccccccccccccccccccccccccccccccccccccc"},
      "commitment_file_sha256": null
    }
  ],
  "notes": "Illustrative schema only, all URLs/times are invented and do not refer to actual publications."
}
```

The example shows a format, **not valid evidence**. The two file SHA-256 fields must be computed from the exact UTF-8 files by an independent local checksum tool. A GitHub URL should be a real independently witnessed immutable commit in an approved public repository for genuine work, not an editable branch link. Reviewers must visit the URL, inspect the published content, compare exact hashes and repository author/timestamp evidence, and verify the independently held witness receipts before asserting chronology.

## Manual gates before any reveal or execution

- An authorized human verifies the timestamp/order of the *real* linked publication anchors and the actual public commitment bytes.
- An independent evaluator verifies confidential holdout custody and source custody, and a separate witness attests the trial submissions really were closed before the holdout reveal.
- Participant recruitment, consent and data privacy have been independently reviewed.
- The isolated evaluator's threat model, host configuration and output controls have received separate human approval.
- The investigator publishes negative, null and contradictory evidence with equal care.

Neither this CLI nor the surrounding CI will ever automatically move a trial into `APPROVED`, `REVEALED`, `EXECUTED` or `DONE`.

**Current results count: zero.**
