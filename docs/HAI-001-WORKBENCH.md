# HAI-001: local calibration workbench operator guide

**Version:** 0.1.0 · 2026-10-12  
**Status:** INSTRUMENT READY FOR REVIEW; CALIBRATION NOT STARTED; EXPERIMENT RESULTS: ZERO

## What it is

A static browser form at `site/calibration/`, linked from the research homepage. It reads fixed copies of the v0.1.0 frozen **tasks**, **acceptance fixtures**, and **SHA-256 lock** from the same GitHub Pages origin. SHA-256 is rechecked in browsers with Web Crypto and the CI suite ensures the published copies match the locked repository artifacts.

The form allows a researcher to create a **local JSON record** compatible with the existing `scripts/hai-001/calibration-check.mjs` schema. It offers specification review ratings, an advisory 25-minute stopwatch for condition-A human-only pilot observations, opaque ID generation, import/export to resume a session, and a local work ledger. **The webpage never uploads a record.**

It does **not** evaluate candidate code, run AI, independently confirm scores, confirm consent, prove task comparability, or publish results. Exported JSON is stored only wherever the operator chooses to save it.

## Authorized workflow (not evidence of execution)

1. Review `docs/HAI-001-CALIBRATION.md` and task materials. Arrange any required human-participant review, inform people about the procedure, obtain informed consent **before** collecting information, and keep sensitive consent records separate and private.
2. Open the workbench over HTTPS or localhost. The page fails closed if the frozen task and fixture copies cannot be integrity checked.
3. Select **SYNTHETIC** to exercise the UI with deliberately fabricated examples. Synthetic entries never qualify as observations, however realistic their numbers look.
4. For genuine appropriately consented calibration observations, start a fresh session, select **OBSERVED**, and affirm the consent attestation. This is a self-attested statement, not an independently validated consent record.
5. Choose a frozen task and one activity:
   - **Independent specification review**: use clarity, estimated effort, and ambiguity 1–5 ratings. Reviewers should not use AI to generate their judgments.
   - **Human-only pilot (condition A)**: report elapsed wall seconds (up to 1,500), observed passing acceptance cases (0–5), and check "independently crosschecked" **only** when a separate evaluator really checked retained test evidence.
6. Use an opaque ID generated on the page or assign a code such as `RATER_001`; **never type names, emails, usernames, contact details, chat transcripts, or other identifying information.**
7. Download JSON explicitly. Your browser will not preserve the unsaved session after a refresh. You can import your own exported JSON locally to continue collecting entries. Importing replaces unsaved entries only after an explicit confirmation.
8. From a local repository checkout, run:
   ```sh
   node scripts/hai-001/verify-lock.mjs
   node scripts/hai-001/calibration-check.mjs PATH_TO_LOCAL_CALIBRATION.json
   node --test tests/*.test.mjs
   ```
   The checker only validates and summarizes claims in the file; it does not turn them into verified findings.

## Evidence boundaries

- **TEMPLATE**: empty repository baseline; not a study.
- **SYNTHETIC**: hypothetical entered numbers; not a study even with full coverage.
- **OBSERVED**: an operator attests genuine observations occurred; the claim still requires independent provenance/custody and methods review.
- **MANUAL_REVIEW_REQUIRED**: a structural/coverage gate, not a claim of matched difficulty, research approval, or confirmatory readiness.

The repository deliberately includes no real participant calibration data and its homepage counter remains **0 original experiment runs**. Before any confirmatory trial, independently review recruitment, allocation, preregistration, test isolation, task comparability, and data governance.

## Privacy and failure behavior

No third-party JS libraries, advertising SDKs, analytics calls, localStorage, cookies, telemetry, or backend endpoints are used. The only runtime fetches load three static files from the site's own origin. Any actual file remains in browser memory until it is downloaded by deliberate operator action. The form enforces conservative field formats and rejects off-protocol or malformed imports.

The 25-minute stopwatch is advisory, relies on browser performance time, and is vulnerable to human recording error or a lost browser session. Nothing about the stopwatch validates human-only compliance, test outcomes or informed consent. Separate independent logs and evaluator checks are needed.

Static JavaScript delivered from GitHub Pages is still external code served by a hosting provider, so the instrument cannot guarantee confidentiality against the operator's browser/extensions/device or hosting infrastructure. For sensitive contexts, consult a privacy/security reviewer or use a locally inspected checkout before use.

## Change control

`protocols/HAI-001/v0.1.0/*` is immutable. The deployment copies `site/calibration/tasks.json`, `site/calibration/fixtures.json`, and `site/calibration/LOCK.json` are byte-for-byte mirrors verified by CI. If a protocol correction is needed, create a **new version with a new lock**, not an in-place alteration.

This is an instrument for collecting future evidence. **It is not itself evidence that AI helps or harms people.**
