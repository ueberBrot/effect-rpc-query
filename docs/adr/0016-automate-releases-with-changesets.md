# Automate releases with Changesets

Status: Accepted.

## Context

Versioning, changelog generation, and publication need one auditable path.

## Decision

Changesets and a split GitHub Actions workflow version, build, pack, and publish the root package
through npm trusted publishing with provenance. The generated changelog keeps pull-request and
commit links. Private examples remain outside versioning, and releases run only in CI.

## Consequences

Changes to published behavior, types, exports, dependency ranges, or installation metadata require
a real changeset. Documentation, examples, tests, internal tooling, and CI require none. Empty
changesets do not serve as process markers. Any bootstrap token is removed after trusted publishing
is configured.

## Installation identity

The installation name changes from `effect-rpc-query` to `effect-api-query` at version `0.0.0`.
The root package remains the single public artifact. The
[package rename inventory](../package-rename.md) assigns the remaining migration batches and records
intentional historical names.
