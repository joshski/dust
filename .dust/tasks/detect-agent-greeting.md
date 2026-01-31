# Detect agent and update greeting

Detect which agent is running and update the agent greeting accordingly. The system should identify:

- Claude Code Web
- Claude Code
- Codex
- Otherwise fall back to "Agent"

The greeting in `lib/templates/agent-greeting.txt` currently says "Hello Agent". This should be dynamically updated based on detection of the running agent environment.

## Implementation approach

1. Create a detection function that identifies the running agent based on environment variables
2. Update the greeting template system to interpolate the detected agent name
3. Change "Hello Agent" to "Hello Claude Code Web", "Hello Claude Code", "Hello Codex", etc. based on detection

## Detection methods (validated)

### Claude Code Web

Claude Code Web sets these environment variables (validated January 2026):

- `CLAUDECODE=1` - Indicates Claude Code environment
- `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE=cloud_default` - **Key indicator for Web**
- `CLAUDE_CODE_ENTRYPOINT=remote` - Alternative Web indicator
- `CLAUDE_CODE_CONTAINER_ID` - Container identifier (present in Web)

```typescript
if (process.env.CLAUDECODE && process.env.CLAUDE_CODE_ENTRYPOINT === 'remote') {
  // Running inside Claude Code Web
}
```

### Claude Code (CLI)

Claude Code CLI sets `CLAUDECODE=1` but does NOT set the remote environment variables:

```typescript
if (process.env.CLAUDECODE && !process.env.CLAUDE_CODE_ENTRYPOINT) {
  // Running inside Claude Code CLI (not Web)
}
```

### Codex CLI

No official `CODEX` environment variable is documented. Potential detection approaches:

- Check for `CODEX_HOME` environment variable (defaults to `~/.codex` but may be set explicitly)
- Check for existence of `~/.codex/config.toml`
- Check for Codex-specific environment patterns

### Detection priority

Recommended detection order:

1. Check `CLAUDECODE` + `CLAUDE_CODE_ENTRYPOINT=remote` → "Claude Code Web"
2. Check `CLAUDECODE` alone → "Claude Code"
3. Check `CODEX_HOME` or `~/.codex` existence → "Codex"
4. Fall back to "Agent"

### Example implementation

```typescript
function detectAgent(): string {
  if (process.env.CLAUDECODE) {
    if (process.env.CLAUDE_CODE_ENTRYPOINT === 'remote') {
      return 'Claude Code Web';
    }
    return 'Claude Code';
  }
  if (process.env.CODEX_HOME) {
    return 'Codex';
  }
  return 'Agent';
}
```

### References

- [Claude Code CLAUDECODE env var (GitHub #531)](https://github.com/anthropics/claude-code/issues/531)
- [Codex CLI Configuration](https://developers.openai.com/codex/config-advanced/)

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)

## Blocked by

(none)

## Definition of done

- [ ] Agent detection function identifies Claude Code Web, Claude Code, Codex, or falls back to "Agent"
- [ ] Agent greeting displays the detected agent name (e.g., "Hello Claude Code Web")
- [ ] Tests cover all detection scenarios
- [ ] Existing tests updated to account for dynamic greeting
