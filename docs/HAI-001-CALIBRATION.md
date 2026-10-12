# HAI-001 calibration protocol — C1

**Stage: CALIBRATION NOT STARTED.**  
**Created:** 2026-10-12. **Corresponding frozen task pack:** HAI-001 v0.1.0, SHA-256 manifest locked.

## Purpose

The 12 candidate software tasks are organized by type, **not** yet shown to be equally hard. Before drawing conclusions from four human–AI treatment arms, test whether the task wording, difficulty, and scoring are sensible.

Calibration is **exploratory preparation**. It must never be reported as a confirmatory human–AI effect.

## Preregistered screening procedure (proposal, not a claim of execution)

1. Recruit appropriately consented independent reviewers and human-only pilots, with opaque public IDs. Store consent records privately, never here. No minors or sensitive identifiers in public records.
2. For every task, collect at least two independent specification reviews. Rate spec clarity (1 ambiguous to 5 clear), estimated effort (1 easiest to 5 hardest) and ambiguity (1 minimal to 5 severe). Report disagreement.
3. Collect at least two independent **human-only**, unaided 25-minute-or-less pilot sessions per task. Use the locked v0.1.0 task text and fixtures without modification. Record elapsed time and accepted cases (0 through 5).
4. Independently cross-check reported passed-case totals against saved, privacy-scrubbed test receipts. A checkbox is **not proof** a cross-check occurred; this validation CLI only checks field types.
5. Evaluate per-task medians, pairwise reviewer disagreement, clarity, ambiguity and case pass proportions. Flag task median-time spread over 2x as a screening signal, not an automatic cutoff or proof of unequal difficulty.
6. Conduct a manual methods review and **explicitly decide** whether to amend/recalibrate, run a larger pilot, or approve a future study design. The automated tool never labels tasks 'matched' or a study ready.

### Contamination controls

Calibration reviewers and human-only pilots must not join the later confirmatory trial on tasks they have already seen, absent a documented design controlling that exposure. Avoid repeating the same task with the same participant in multiple conditions. Record task order, prior relevant experience, pauses, and possible learning effects in private study logs. The public template deliberately excludes identities and raw private conversations.

### Thresholds and interpretation

For **screening coverage** only: two independent spec ratings and two independent pilot sessions per task, plus cross-check attestation. The CLI also flags mean clarity below 4/5, mean ambiguity above 2/5, mean observed pass rate below 60%, or median time max/min above 2. These are **diagnostic thresholds**, not validated psychometric scales or acceptance criteria.

Passing coverage never establishes equivalent task difficulty, reliability, construct validity, causal identification or independent replication. Methods review, consent, sample design and external validation remain necessary.

## Run the non-executing checker

```sh
node scripts/hai-001/calibration-check.mjs
node scripts/hai-001/calibration-check.mjs calibration/HAI-001/observations.template.json
node --test tests/*.test.mjs
```

The empty template returns `NOT_STARTED`. The script reads JSON and summarizes it; it **does not execute code, AI models, or trials**.

## Example data schema

```json
{
  "schema": "CJ-HAI001-CALIBRATION-v1",
  "protocol": "HAI-001",
  "task_pack_sha256": "3427497a87ff11f7f39beb32daea7b454457c0ba4c7ca9ed04debc4d647bf803",
  "origin": "TEMPLATE",
  "consent_attested": false,
  "notes": "No observed data collected",
  "reviews": [],
  "pilots": []
}
```

For appropriately documented participant records, set `origin` to `OBSERVED` only if genuine sessions occurred and informed consent was obtained. Each `reviews` row has `task_id`, `reviewer_id`, integer `spec_clarity`, integer `estimated_effort`, and integer `ambiguity` (ratings 1–5). Each `pilots` row has `task_id`, `pilot_id`, `condition: "A"`, `wall_seconds`, `passed_cases` (0–5) and boolean `cases_crosschecked`.

Synthetic fixtures are created *in memory inside tests*, not stored as real participant data. Changing an `origin` field is not proof an observed event occurred. External custody logs and human verification are required.

## Exit criteria before a future confirmatory trial

- Calibration coverage, reviewer disagreement, task failures and any suspicious difficulty spread reviewed by a qualified human methods reviewer.
- Corrections to frozen v0.1.0 create a **new task-pack version and a new manifest**; never rewrite old locked values.
- Independent scorer and test harness, sandboxed generated code, task assignment seed, randomized task-condition allocation, exclusion rules and consent safeguards documented and locked.
- Study remains `PROPOSED / NOT RUN` until actual authorized trials occur.

**Current state: NOT STARTED.** Original experimental result count: **zero**.
