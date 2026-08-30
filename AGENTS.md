## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-role triage vocabulary is used. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

### Vite+

Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

### Testing

Don't write tests for what the type system already guarantees. Use compile-time fixtures to verify the published type contract; reserve runtime tests for behavior that can fail at runtime.

## Learning more about Effect

This repository uses the Effect TypeScript library.

Before writing any Effect code, read `node_modules/effect/AGENTS.md` completely and follow its links when required.

If a particular Effect API or concept is not covered there, search the source in `node_modules/effect/src`.
