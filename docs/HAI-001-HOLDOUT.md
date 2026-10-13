# HAI-001 · Sealed independent challenge-set protocol

**Stage: PREPARATION ONLY.** No private challenge cases have been registered for real-world experiments, no cases have been administered, and no research results have been obtained.

## Why this exists

All five acceptance examples for each frozen HAI-001 task are public. Returning their known JSON outputs is not evidence that submitted source code works. For any future evaluation, a separate challenge set must be authored and held by an independent evaluator, with the test-set contents unavailable to task participants until the task submission cutoff.

This protocol allows a custodian to **cryptographically commit to a private case set before results are seen**, then disclose the original file and the random nonce later. It does not execute a submitted implementation, establish comparable task difficulty or authenticate research participants.

## Trust and governance

- HAI-001 v0.1.0 task descriptions, public acceptance fixtures, and scoring rubric remain frozen unchanged.
- The custodian creates at least 3 and at most 50 private cases for a single task, **outside this repository**, with inputs not identical to the task's public practice inputs. The script checks duplication, not the quality of expected answers.
- The custodian should derive expected answers independently before seeing submissions, using human review and/or another validated implementation. Include edge cases and counterexamples; document coverage separately.
- The custodian runs the commit CLI **before trials** and submits *only* the public commitment through a reviewable timestamped process (for example a reviewed PR or signed ledger entry) before exposure to candidate answers.
- Private case data and the cryptographic secret must remain offline or in properly governed private storage. Never commit them to this public repo, email them to participants or include them in a CI artifact.
- Freeze and independently witness the candidate submission before revealing any test cases. This PR does **not** implement submission custody, isolated code execution or blinded scorer review.
- After the submission cutoff, the custodian may publish the private case file and nonce **only after privacy and redistribution review** and run verify. The verified match proves byte commitment only, not scientific soundness.
- Report all failures, exclusions, failed challenges, and negative outcomes. Never silently modify a committed challenge. For revisions create a **new case_set_id and commitment** with an explicit rationale.

## Create a commitment (locally, outside the repo)

A fully synthetic example is included in `examples/hai-001-synthetic-challenge.json` for test demonstration. **Never use that file as an actual hidden challenge.**

Copy or author independent cases at a private path outside your Git checkout, such as `$HOME/ResearchPrivate/HAI001/private-cases.json`. The format is documented by the synthetic example.

```sh
# Example paths are illustrative. Set up the directories and do not reuse demo data.
node scripts/hai-001/holdout.mjs commit \
  /secure-private/private-cases.json \
  /secure-private/public-commitment.json \
  /secure-private/private-nonce.json

# Later, AFTER submissions are frozen and publication is appropriate:
node scripts/hai-001/holdout.mjs verify \
  /secure-private/private-cases.json \
  /secure-private/public-commitment.json \
  /secure-private/private-nonce.json
```

The tool refuses to create/reuse files over existing paths. It rejects private cases or nonce files located inside the Git repository. A fresh cryptographic 256-bit nonce is used for every seal. The public commitment includes: protocol/version binding, task/case-set identifiers, case count, algorithm and SHA-256 commitment, but **no test content, raw file SHA-256, or nonce**.

The digest uses SHA-256 of the exact bytes following a domain separator and the random nonce. The private secret contains the nonce and raw file digest. A secret nonce reduces the ability to guess small, predictable challenge sets from published digests. It is not encryption, and remains confidential only while the custodian safeguards both inputs and nonce.

```text
SHA256("CJ_HAI001_HOLDOUT_COMMIT_V1\\0" + nonceHex + "\\0" + exact_private_file_bytes)
```

### Threat model and limits

This protects against quietly altering a sealed case file **if an independently timestamped public commitment predates the candidate submissions and the nonce was genuinely kept secret**. It does not defend against colluding evaluators, copied code, leaked cases, deliberately biased questions, falsified participants, or pre-existing familiarity with solutions. A Git commit timestamp alone may be insufficient for higher-assurance provenance; independent custody or signed witnessing is preferable.

This tooling NEVER loads or executes candidate code; the only input is JSON data. Do not invoke a model, execute participants' programs, or call a hosted runner during seal/verify. An authorized sandboxed evaluation runner is a **future separate milestone** requiring its own threat analysis, review and explicit local opt-in. Do not run arbitrary candidate code in ordinary GitHub Actions CI.

### Reproducibility checks

```sh
node --test tests/hai001-holdout.test.mjs
node --check scripts/hai-001/holdout.mjs
node --check scripts/hai-001/holdout-core.mjs
```

CI tests only deliberately **SYNTHETIC** examples and does not contain, generate or publish any real hidden challenge sets. It cannot attest that a future holdout was properly administered.

**Current calibration count: 0. Experimental run count: 0.**

## Relationship to submission custody

The subsequent [submission custody protocol](HAI-001-SUBMISSION-CUSTODY.md) binds participant source bytes and declared conditions to a prior holdout commitment, so a later reveal can detect modified candidate files. The source custody mechanism still requires **independently witnessed chronological publication** of the challenge commitment and then each submission commitment before revealing private tests. Neither tool executes submitted code or provides research conclusions.
