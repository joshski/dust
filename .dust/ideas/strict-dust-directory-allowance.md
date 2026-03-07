# Strict .dust directory allowance

Restrict `.dust/` to an explicit allowlist so arbitrary files fail built-in lint.

Current lint behavior only partially enforces this:

- `validateDirectoryStructure` in `lib/lint/validators/directory-validator.ts` rejects unexpected directories at `.dust/` root, but it ignores non-directory entries in the same location.
- `validateContentDirectoryFiles` enforces flat markdown-only content under `principles/`, `facts/`, `ideas/`, and `tasks/`.
- `extraDirectories` in `.dust/config/settings.json` intentionally allows custom root directories, which conflicts with a fully strict policy.
- Existing features rely on specific non-artifact paths under `.dust/`, including `.dust/config/audits/*.md`, `.dust/config/hints/*.md`, optional `.dust/config/agents/*.md`, and optional `.dust/Dockerfile`.

This idea proposes extending `dust lint` so `.dust/` accepts only approved paths (files and directories) and reports violations for everything else. The rule should remain actionable, listing what is allowed and how to fix violations.

Likely implementation shape:

- Introduce a path-level allowlist validator (not only root-directory checks).
- Validate both root files and nested files under known directories.
- Keep errors deterministic and compatible with `dust check` (which runs built-in lint first).
- Add focused unit coverage in `lib/cli/commands/lint-markdown.test.ts` and patch-validation coverage in `lib/validation/validation.test.ts`.

## Open Questions

### Should `extraDirectories` continue to allow arbitrary directories under `.dust/`?

#### Option: Keep `extraDirectories` as an explicit escape hatch

Preserves extensibility for teams with custom `.dust` workflows, but weakens strictness guarantees.

#### Option: Deprecate `extraDirectories` for lint allowlisting

Maximizes repository hygiene and predictability, but is a breaking change for users with custom directories.

### Should `.dust/Dockerfile` be part of the built-in allowlist?

#### Option: Yes, treat `.dust/Dockerfile` as a first-class allowed file

Aligns lint with existing Docker agent mode behavior in `dust loop`.

#### Option: No, require Docker config to move under `.dust/config/`

Creates a cleaner directory contract long-term, but requires migration work and backward-compat handling.

### How strict should validation be for `.dust/config/` contents?

#### Option: Approve known files and known subdirectories only

Provides strong guarantees and catches drift, but requires maintaining an explicit allowlist as features evolve.

#### Option: Approve known top-level config entries, allow freeform files in known subdirectories

Reduces maintenance burden while still preventing most accidental clutter, but leaves room for arbitrary files.
