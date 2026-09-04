# Quarantine new dependency releases for seven days

Status: Accepted.

## Context

Immediate dependency upgrades provide too little time to observe supply-chain incidents.

## Decision

pnpm enforces a strict seven-day minimum release age, frozen lockfiles in CI, and explicit
lifecycle-script permissions.

## Consequences

A fresh Effect release candidate or another intentionally evaluated tool may receive one reviewed,
exact-version exception after its release, provenance, scripts, and lockfile changes are checked.
Package-wide exemptions remain forbidden. Each exception expires with the quarantine.
