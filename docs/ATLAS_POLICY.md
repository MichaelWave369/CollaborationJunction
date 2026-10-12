# AI Presence Atlas · evidence policy

**Status:** v0.1.0, 2026-10-12

## What a row proves

A row states that a specific primary source documents AI in a named feature. It **does not** prove that every function of the product uses AI, that the system is generative, that its output is correct, or that we inspected proprietary internals.

## Required fields

Each record has a stable ID, product/feature, domain, mechanism, summary, source IDs, evidence tier, review date, and limitation. Sources are stored in `site/data/sources.json`. URLs must be HTTP(S) and primary when available.

## Quality gates

- No sourced claim without a link.
- No generalization from a feature to an entire platform.
- A regulator's list is evidence of authorized classifications, not proof of universal safety.
- A product help page documenting a recommendation algorithm is not necessarily proof that it uses a particular neural-network architecture.
- Link rot and changes to product implementations are possible; keep reviewed dates.
- Record contrary evidence and correct entries without erasing a prior public revision.

## Planned upgrades

Add source quotation boundaries, machine-checkable snapshots and timestamps, archive hashes where redistribution permits, independent observations, explicit version histories and disputes.
