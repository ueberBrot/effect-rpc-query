## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-role triage vocabulary is used. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

### Testing

Don't write tests for what the type system already guarantees. Use compile-time fixtures to verify the published type contract; reserve runtime tests for behavior that can fail at runtime.
