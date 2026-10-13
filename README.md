# CollaborationJunction

**Human intelligence × artificial intelligence, examined with evidence.**

CollaborationJunction is a public research site with two tracks:

1. **AI Presence Atlas:** feature-level examples of AI in existing technology, backed by traceable primary sources. Documented use is not the same thing as independently auditing a proprietary model.
2. **Human–AI Evidence Lab:** testable protocols and eventually reproducible results. No experimental outcomes are claimed until measurements and receipts exist.

**Research position:** Neither "AI is always good" nor "AI is always slop" is a scientific conclusion. We investigate measurable differences, failures, authorship, and human agency.

## Status (2026-10-12)
- Five initial evidence entries and three externally published research summaries.
- HAI-001 is a **PROPOSED** pilot protocol. It has no participants, runs, scores, or findings yet.
- Public site is static HTML/CSS/JavaScript; no trackers, login, model API, dependencies, or backend.
- Source provenance and schema checks run in CI.

## Run locally

```bash
python -m http.server 8000 --directory site
# Open http://localhost:8000
```

## Validate

```bash
node --test tests/*.test.mjs
```

Node 20+ is recommended; no npm install is necessary.

## Deployment

`.github/workflows/pages.yml` deploys `site/` to GitHub Pages on pushes to `main`; its publish job runs the tests first. Configure **Settings > Pages > Build and deployment > Source: GitHub Actions** if the repository still uses branch publishing. PRs run validation but do not publish.

Expected project URL after deploy: https://michaelwave369.github.io/CollaborationJunction/

## Research documentation
- [Research charter](docs/RESEARCH_CHARTER.md)
- [Atlas evidence policy](docs/ATLAS_POLICY.md)
- [HAI-001 preregistration draft](docs/HAI-001.md)
- [Contributing](CONTRIBUTING.md)

## Governance
Separate **source says** from **independently tested**. Record contrary results. Never turn a successful CI build into a claim of scientific validation. Participation in human studies requires informed consent and appropriate safeguards; this repo does not collect participant data.

**Ledger above ego. Evidence above slogans.**

MIT License. Original implementation; citations link to external research, not imported code.

## Local-first HAI-001 calibration workbench

The public Pages site links to `site/calibration/`. It displays exact SHA-256-checked copies of the frozen task descriptions and public acceptance fixtures, and lets an operator prepare **local JSON exports only** for independent specification reviews and human-only condition-A feasibility pilots. It has no login, database, telemetry, generative AI, candidate-code execution or automatic submissions.

Calibration is **NOT STARTED**. The UI and validators do not establish consent, score accuracy, difficulty matching, or a valid causal experiment. Human reviewers must examine any later observations. See [operator guidance](docs/HAI-001-WORKBENCH.md).

## Deterministic HAI-001 case scoring

The static [JSON case checker](site/calibration/checker.html) and Node scorer compare a local **JSON output file** to the five frozen public fixture values for its task. They do not execute generated code, prove independent observation, or establish task equivalence.

```sh
node scripts/hai-001/score-answers.mjs examples/hai-001-synthetic-answers.json
node --test tests/hai001-scoring.test.mjs
```

See [scoring limitations and calibration audit](docs/HAI-001-SCORING.md). Original observed experiments: **zero**.

## Sealed challenge-set preparation (HAI-001)

The five public acceptance cases can be copied. Before any actual study, an independently held, not-yet-published challenge set should be specified **before trial submissions**, with an externally reviewable commitment.

New offline `scripts/hai-001/holdout.mjs` tooling supports **commit/reveal** for private JSON-only cases using fresh SHA-256 nonce commitments. The private case file and secret must live **outside the Git repository**. It runs no candidate programs, opens no network connections, and produces no study outcome.

See [sealed challenge governance](docs/HAI-001-HOLDOUT.md). The included example is **synthetic and publicly visible, not a secret holdout**.

**Status: no real holdout committed, no actual calibration or controlled trials performed.**

## Submission custody and safe-evaluator design

The next research integrity step is an **offline, non-executing source commitment** tied to a previously sealed private challenge. The `scripts/hai-001/submission.mjs` tool binds the exact source and its self-reported condition metadata to the hidden-test commitment, with a fresh random nonce. A private secret and source file stay outside the public repository.

No candidate implementation, model, or actual experiment is executed. No real submissions have been collected.

See [source submission custody](docs/HAI-001-SUBMISSION-CUSTODY.md) and the [future isolated evaluator threat model](docs/HAI-001-EXECUTION-THREAT-MODEL.md).

```sh
node --test tests/hai001-submission.test.mjs
node --check scripts/hai-001/submission.mjs
```

Actual controlled trials require independent consent, custody timestamps, task calibration and a separately audited disposable-VM evaluator. **CI green only validates this inert custody code.**

## Offline custody chronology preflight

After sealed challenges (PR #7) and source submissions (PR #8), the read-only [custody sequencing checker](docs/HAI-001-CUSTODY-TIMELINE.md) screens the three proposed pre-reveal events: challenge commitment publication, source commitment publication, and witnessed submission cutoff. It checks exact public-file hashes, pack and trial binding, structured UTC chronology and claimed GitHub publication anchors.

```sh
node scripts/hai-001/custody-sequence.mjs TIMELINE.json HOLDOUT_PUBLIC.json SUBMISSION_PUBLIC.json
node --test tests/hai001-custody-sequence.test.mjs
```

**Even a structurally valid chronology remains unverified.** The CLI never contacts GitHub, authenticates witnesses, establishes real timestamps, approves a reveal, or runs source code. All current examples are synthetic and no real trial observations exist.
