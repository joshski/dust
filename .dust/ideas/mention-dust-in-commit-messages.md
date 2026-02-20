# Mention dust in commit messages

Encourage agents to reference dust in commit messages to enable measurement of dust-aware sessions and distinguish unattended commits.

## Background

Currently, there is no easy way to identify whether a commit was made in a dust-aware session or as part of an unattended `dust loop` / `dust bucket` run. If agents mention dust in a recognizable way in their commit messages, commit history analysis tools can:

1. **Measure adoption**: Count how many commits across repositories were made in dust-aware sessions
2. **Distinguish unattended work**: Identify commits made by autonomous agents running via `dust loop` or `dust bucket`
3. **Enable commit log observations**: Support the existing [Commit Log Observations](commit-log-observations.md) idea by providing structured markers for pattern extraction
4. **Support history tools**: Facilitate the [History Tools](history-tools.md) idea by making agent-generated commits programmatically identifiable

### Relevant principles

- [Traceable Decisions](../principles/traceable-decisions.md) — Commit messages should capture intent and context; a dust reference adds traceability for agent involvement
- [Atomic Commits](../principles/atomic-commits.md) — Each commit tells a complete story; knowing it was agent-assisted is part of that story
- [Development Traceability](../principles/development-traceability.md) — Structured logging helps agents and humans understand system behavior

### Relevant code

- `lib/cli/commands/init.ts` — Generates CLAUDE.md and AGENTS.md content with dust instructions
- `lib/cli/commands/loop.ts` — Runs agents unattended with `DUST_UNATTENDED=1` environment variable
- `lib/cli/commands/focus.ts` — `buildImplementationInstructions()` generates the prompt sent to agents

### Related ideas

- [Commit Log Observations](commit-log-observations.md) — Extracting patterns from commit messages
- [Catch mistakes in commit history](catch-mistakes-in-commit-history.md) — Detecting suspicious changes in git history
- [History Tools](history-tools.md) — Traversing commit history to retrieve deleted tasks

## Possible approaches

### Approach 1: Add instruction to CLAUDE.md / AGENTS.md

Add a guideline in the agent instruction files encouraging agents to include a dust reference in commit messages. This works for interactive sessions but doesn't distinguish unattended runs.

### Approach 2: Inject into implementation instructions

Modify `buildImplementationInstructions()` in `focus.ts` to include commit message guidance. This targets task-focused sessions where commits are expected.

### Approach 3: Use environment variables for context

The loop already sets `DUST_UNATTENDED=1`. Agents could detect this and adjust commit message formatting accordingly. Would require agents to be instructed to check for this variable.

### Approach 4: Git commit trailers

Use [git trailers](https://git-scm.com/docs/git-interpret-trailers) (like `Dust-Session: loop`) which are machine-parseable and follow git conventions. Similar to `Co-Authored-By:` trailers.

## Open Questions

### What format should the dust mention use?

#### Option: Natural language mention

Include "using dust" or "with dust" somewhere in the commit message body. Human-readable but harder to parse reliably.

#### Option: Git trailer

Add a trailer like `Dust-Session: interactive` or `Dust-Session: loop`. Machine-parseable and follows git conventions, but may be unfamiliar to some users.

#### Option: Emoji or marker

Use a distinctive marker like `[dust]` or a specific emoji. Easy to grep but adds visual noise.

### Should the mention distinguish session types?

#### Option: Single marker for all dust sessions

Just indicate the commit was made in a dust-aware session, regardless of interactive or unattended mode.

#### Option: Distinguish interactive vs unattended

Use different markers like `Dust-Session: interactive` vs `Dust-Session: loop` or `Dust-Session: bucket` to enable separate metrics for autonomous work.

### Where should the instruction live?

#### Option: In agent instruction files (CLAUDE.md / AGENTS.md)

Always present when agents work in the repo. Works for all sessions but requires users to regenerate their instruction files.

#### Option: In implementation instructions (focus.ts)

Injected into task prompts. Only applies to focused task sessions, not general agent interactions.

#### Option: In both places

Cover both focused tasks and general agent work, but creates potential for inconsistency if they diverge.

### Should this be opt-in or default behavior?

#### Option: Default for all dust-initialized repos

New repos get this instruction automatically. Existing repos need to regenerate instruction files.

#### Option: Configurable via settings.json

Add a setting like `commitMessageMentionDust: true` that users can enable. More control but lower adoption.
