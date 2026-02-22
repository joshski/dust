# Allow audits with ad-hoc details

Allow users to specify additional context when creating an audit task, such as specific files, directories, or commits to focus on.

## Context

The current audit command (`lib/cli/commands/audit.ts:33-80`) creates audit tasks from templates. The `addAudit` function takes only the audit name:

```typescript
async function addAudit(
  auditName: string,
  dependencies: CommandDependencies
): Promise<CommandResult>
```

Audit templates are predefined in `lib/audits/stock-audits.ts` or configured by users in `.dust/config/audits/`. These templates have fixed scope, typically instructing the agent to review the entire codebase or specific well-known paths (e.g., `.dust/facts/`, `.dust/principles/`).

However, users often want to run audits with a narrower focus:
- Review security for changes introduced in a specific commit or branch
- Check test coverage for a particular module or directory
- Verify facts related to a specific feature area
- Analyze performance of code touched by recent work

Without ad-hoc details, users must either:
1. Edit the generated task file manually after creation
2. Create custom audit templates for each specific use case
3. Include scope instructions directly in the audit template, making it less reusable

## Proposed Behavior

Extend `dust audit <name>` to accept additional context that gets appended to the generated task file. The exact mechanism is an open question (see below).

## Open Questions

### How should ad-hoc details be provided to the command?

#### Option: Trailing arguments

```bash
dust audit security-review -- lib/auth src/api
```

Everything after `--` becomes the ad-hoc focus. Simple and familiar from other CLI tools. Limits complexity but may not handle all use cases (e.g., commit ranges).

#### Option: Named flags

```bash
dust audit security-review --files "lib/auth/**" --commits "abc123..HEAD"
```

More explicit and supports multiple types of context. Requires defining a schema for valid context types, but provides better discoverability through `--help`.

#### Option: Interactive prompt

After `dust audit security-review`, prompt the user for optional additional context. Friendlier for discovery but breaks scripting use cases and doesn't work well with autonomous agents.

#### Option: Free-form string

```bash
dust audit security-review "Focus on authentication changes from last week"
```

A single positional argument after the audit name. Maximum flexibility since any context can be expressed. Simple implementation. The agent interprets the string as natural language instructions.

### Where should ad-hoc details appear in the generated task file?

#### Option: New "Ad-hoc Scope" section

Add a dedicated section between the description and the fixed scope:

```markdown
# Audit: Security Review

Review the codebase for common security vulnerabilities...

## Ad-hoc Scope

Focus on: lib/auth, src/api

## Scope

Focus on these areas:
...
```

Clear separation between template content and user-provided context. Easy to identify what was customized.

#### Option: Prepend to existing "Scope" section

Inject the ad-hoc details at the top of the Scope section:

```markdown
## Scope

**Additional context:** Focus on lib/auth, src/api

Focus on these areas:
...
```

Keeps all scope information together. May be clearer for agents that process sections sequentially.

#### Option: Append to description

Add the details immediately after the opening description paragraph:

```markdown
# Audit: Security Review

Review the codebase for common security vulnerabilities and misconfigurations. Focus on: lib/auth, src/api.

## Scope
...
```

Minimal structural change. The additional context becomes part of the natural reading flow.

### Should the audit template support placeholders for ad-hoc content?

#### Option: No placeholders, always append

Keep templates simple. Ad-hoc details are always added in a consistent location regardless of the template. Templates don't need modification to support this feature.

#### Option: Optional placeholder syntax

Templates can include a marker like `{{ad-hoc}}` where user-provided details should be inserted. If no placeholder exists, details are appended at a default location. Gives template authors control over placement without breaking existing templates.

### Should ad-hoc details be validated?

#### Option: No validation

Accept any string and pass it through. The agent will interpret the instructions. Simplest implementation. Handles natural language, file paths, commit references, and anything else users might provide.

#### Option: File path validation

If the input looks like a file path (contains `/` or ends with known extensions), verify the path exists. Warns if paths don't exist, which could indicate typos. May reject valid patterns (globs, future files).

#### Option: Commit validation

If the input looks like a commit reference, verify it exists using `git rev-parse`. Catches typos in commit hashes but requires git access during command execution.
