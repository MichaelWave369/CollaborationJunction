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
