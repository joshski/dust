# Validate .dust directory

Extend `dust lint markdown` to validate the entire `.dust/` directory structure, not just markdown content.

## Background

Currently, `dust lint markdown` validates:
- Markdown file content (links, headings, opening sentences)
- Task file structure (required sections, semantic links)
- Goal hierarchy (parent/child relationships, cycles)
- Idea file format (open questions structure)

However, it does not validate:
- Whether only expected directories exist under `.dust/`
- Whether `.dust/config/settings.json` is valid JSON with a correct schema
- Whether unexpected files exist in `.dust/config/`
- Whether non-markdown files exist in content directories

## Motivation

An invalid `.dust/` directory can cause subtle issues:
- A typo in a directory name (e.g., `.dust/task/` instead of `.dust/tasks/`) means tasks won't be discovered
- An invalid `settings.json` causes silent fallback to defaults
- Extra files in `.dust/` may confuse agents or cause unexpected behavior

Catching these issues early through linting aligns with the [Lint Everything](../goals/lint-everything.md) goal.

## Proposed Validations

### Directory structure validation
- Only expected directories exist: `goals`, `ideas`, `tasks`, `facts`, `config`
- No subdirectories within content directories (they should be flat)
- No unexpected files at the `.dust/` root level

### Config directory validation
- Only `settings.json` exists in `.dust/config/`
- `settings.json` is valid JSON
- `settings.json` conforms to expected schema (known keys only)
- `checks` array entries have required `name` and `command` fields

### Content directory validation
- Only `.md` files exist in `goals/`, `ideas/`, `tasks/`, `facts/`
- No hidden files (`.DS_Store`, etc.)

## Implementation Approach

The validation could be:
1. **Integrated into `lint-markdown.ts`** - Add new validation functions alongside existing ones
2. **A separate `validate-structure` command** - Keep markdown validation separate from structure validation
3. **A new `validate-dust-dir` module** - Called from `lint-markdown` but organized separately

## Open Questions

### Should this be a separate command or part of `lint markdown`?

#### Extend `lint markdown` (Recommended)

Add structure validation to the existing command since both validate `.dust/` correctness. The command name is somewhat misleading but avoids command proliferation.

#### Create `dust lint structure`

A separate command for structure vs content validation. More precise naming but adds another command to remember.

#### Rename to `dust lint` with subcommands

`dust lint markdown` and `dust lint structure`, or just `dust lint` that does both. This is the cleanest separation but requires more changes.

### How strict should config validation be?

#### Strict - reject unknown keys

Any key not in the expected schema causes a violation. Catches typos like `check` instead of `checks` but may break forward compatibility.

#### Lenient - warn on unknown keys

Unknown keys generate warnings rather than errors. More forgiving but may miss issues.

#### Schema-based

Use a JSON schema for full validation. More robust but adds complexity.

### What about non-standard directories that users intentionally add?

#### Reject by default, allow opt-in

Unknown directories are violations unless explicitly allowed in `settings.json` (e.g., `"extraDirs": ["templates"]`).

#### Warn but don't fail

Output a warning for unexpected directories but don't fail validation. Users can ignore the warning if intentional.

#### Ignore specific patterns

Allow a `.dustignore` or similar mechanism to exclude certain paths from validation.
