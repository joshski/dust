# Enforce strict .dust config allowlist and Dockerfile migration

Enforce a known-files-and-known-subdirectories-only policy for `.dust/config/` and reject `.dust/Dockerfile` with a migration-oriented lint message.

## Principles

- [Intuitive Directory Structure](../principles/intuitive-directory-structure.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Relevant Facts

- [Configuration System](../facts/configuration-system.md)
- [Docker Agent Mode](../facts/docker-agent-mode.md)
- [Dust Directory Structure](../facts/dust-directory-structure.md)

## Blocked By

- [Implement strict .dust root allowlist validation](./implement-strict-dust-root-allowlist-validation.md)

## Definition of Done

- [ ] `dust lint` rejects unknown files/subdirectories inside `.dust/config/` while allowing known entries (`settings.json`, `audits/`, `hints/`, `agents/`).
- [ ] `dust lint` rejects `.dust/Dockerfile` and the error explains that Docker-related configuration must live under `.dust/config/`.
- [ ] Tests cover pass/fail cases for `.dust/config/` allowlisting and `.dust/Dockerfile` rejection with stable error messages.
