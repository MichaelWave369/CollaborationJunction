# HAI-001 · Submission custody, sequencing, and witness boundaries

**Release:** SC1 draft · 2026-10-12  
**Research status:** NOT STARTED. No real submissions, holdout registrations, calibration sessions, or experimental outcomes.

## What this solves

The v0.1.0 research task pack is frozen and the public practice outputs can be verified. PR #7 added an **offline hidden-challenge seal**. But a hidden challenge only helps if the candidate's program is frozen *before* the test content is revealed. Otherwise, an evaluator could change the candidate after seeing cases and still claim an authentic win.

The source custody utility seals two exact private files:
1. **Source:** an original UTF-8 text file (up to 64 KiB) treated as data, never executed.
2. **Metadata:** an exact UTF-8 JSON file (up to 8 KiB) declaring the task, anonymous trial ID, one of conditions A/B/C/D, matching tool class, origin and the **previously sealed holdout commitment SHA-256**.

A fresh random 256-bit nonce binds their two SHA-256 hashes to a publishable commitment. A later reveal check verifies that both exact files remain unchanged. This does not prove who wrote the file, when the file was created, whether AI was used, how much human work was involved, or whether code passes hidden tests.

## Correct timeline (proposed; no actual runs yet)

1. An independent, consented research team locks study design, assignments, task comparability, handling of participants' information, and an approved evaluation environment.
2. An independent evaluator privately authors and reviews a per-task hidden case set, seals it using `holdout.mjs commit`, and publishes **only** its commitment to an independently timestamped, reviewable ledger. Keep the test file and nonce secret. (The included synthetic sample is not secret.)
3. The participant or custodian prepares a **private** source file and metadata. Each experimental task and assignment gets its own unique anonymous trial ID. Participant identifiers and prompt histories must remain in a separately governed protected record.
4. Use `submission.mjs seal` to create a source commitment bound to the **already-published hidden-case commitment**. Obtain an independent timestamp/witness of the **public source commitment** before any hidden tests are revealed.
5. Close and witness the submission window. Preserve original private source/metadata, model/tool logs, human editing logs and assignment records separately. A public hash alone is not proof these logs exist.
6. Only after submission cutoff, the evaluator may reveal hidden challenge content under the applicable privacy rules and independently verify `holdout.mjs verify` and `submission.mjs verify`.
7. A separately reviewed **local isolated test runner** could eventually read locked code and hidden cases after verification. That runner is **not implemented in this PR**. Its threat model, isolation capability and operational review must be green first.
8. An independent scorer reviews test outputs, exclusions, environmental records and contradictory results before any scientific interpretation.

### Private metadata example

The file must contain exactly:

```json
{
  "schema": "CJ-HAI001-SUBMISSION-METADATA-v1",
  "protocol": "HAI-001",
  "task_pack_sha256": "3427497a87ff11f7f39beb32daea7b454457c0ba4c7ca9ed04debc4d647bf803",
  "task_id": "HAI-001-T01",
  "trial_id": "TRIAL_RANDOM_CODE_001",
  "condition": "A",
  "tool_class": "NONE",
  "declared_origin": "SYNTHETIC",
  "holdout_commitment_sha256": "replace-with-a-real-64-character-holdout-commitment-hash"
}
```

The example above is **a template, not an operational receipt**. Values for `condition` and `tool_class` must align:

| Condition | Declared tool class | Research meaning |
| --- | --- | --- |
| A | NONE | Human only |
| B | LOCAL_MODEL | Human plus a local model |
| C | CLOUD_MODEL | Human plus a cloud model |
| D | MODEL_FIRST | Bounded model-first attempt |

These entries are **self-reports**. A correct label is not independent proof that a participant actually complied with the assigned condition.

### Local use

Store **all private data outside the Git checkout**, such as on an approved access-controlled local drive. The utility rejects private source or metadata stored inside the repository, and will not overwrite preexisting commitment/nonce files.

```sh
node scripts/hai-001/submission.mjs seal \
  /private/submission.js \
  /private/metadata.json \
  /private/prior-holdout-commitment.json \
  /private/source-commitment-public.json \
  /private/source-nonce.json

# After an independently witnessed submission freeze:
node scripts/hai-001/submission.mjs verify \
  /private/submission.js \
  /private/metadata.json \
  /private/prior-holdout-commitment.json \
  /private/source-commitment-public.json \
  /private/source-nonce.json
```

On Windows PowerShell, use absolute local paths with quotes. No network access or account connection is required by the script. Publishing the *reviewed public commitment* is a separate, deliberate human action. Do not publish source, source-hash (without nonce), nonce, metadata, or participant identities.

## Audit limitations

- **Integrity is not timestamping.** An independently witnessed before/after record is required to establish the ordering of holdout seal, submission seal, and reveal.
- **Integrity is not independent observation.** An operator could fabricate an apparent source file or falsely self-report a model.
- **Integrity is not safe execution.** This tooling treats submitted source as opaque text and will never import or run it.
- **Integrity is not an execution result.** No held-out accuracy, time savings, learning benefit, agent autonomy or collaboration effect is measured.
- **Nonce protection is not encryption.** Both private source file and nonce must be independently secured. Public commitment metadata should be reviewed for potential indirect information leakage.
- **Empty or oversized inputs fail closed.** Only strict UTF-8 source of 1–65,536 bytes and metadata of 1–8,192 bytes are accepted.
- **Consent and privacy remain external.** The system does not store names, recruiting records, transcripts or other identifying material.
- **No new truth tier is awarded automatically.** A successful verification returns `SUBMISSION_BYTES_VERIFIED_ONLY`, never `DONE`, `MATCHED` or `SCIENTIFIC_RESULT`.

## Test coverage

```sh
node --test tests/hai001-submission.test.mjs
node --test tests/*.test.mjs
node --check scripts/hai-001/submission-core.mjs
node --check scripts/hai-001/submission.mjs
```

All source files in tests are **synthetic, inert strings**. They are never dynamically evaluated.
