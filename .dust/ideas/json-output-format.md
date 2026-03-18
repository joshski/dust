# JSON Output Format

Add JSON output option to list commands for programmatic access.

## Background

The [Progressive Disclosure](../principles/progressive-disclosure.md) principle suggests revealing details progressively, and the [Unsurprising UX](../principles/unsurprising-ux.md) principle calls for interfaces that match user expectations.

Many CLI tools support `--json` flags for machine-readable output. Currently, dust commands only output human-readable formatted text. Agents parsing this output must use regex or string manipulation to extract structured data.

## The Gap

Current output from `dust ideas`:

```
💡 Ideas

# Agent context inference tooling
Help agents infer the correct files and context from brief human instructions.
→ .dust/ideas/agent-context-inference-tooling.md

# Codebase overview command
Add a `dust overview` command that helps agents...
→ .dust/ideas/codebase-overview-command.md
```

To programmatically access idea titles and paths, agents must parse this text format.

## Proposed Solution

Add `--json` flag to list commands:

```
$ dust ideas --json
[
  {
    "title": "Agent context inference tooling",
    "summary": "Help agents infer the correct files and context from brief human instructions.",
    "path": ".dust/ideas/agent-context-inference-tooling.md"
  },
  {
    "title": "Codebase overview command",
    "summary": "Add a `dust overview` command that helps agents...",
    "path": ".dust/ideas/codebase-overview-command.md"
  }
]
```

Apply to commands: `dust ideas`, `dust tasks`, `dust principles`, `dust facts`, `dust pick task`.

## Benefits

- **Programmatic access**: Scripts and agents can consume output directly
- **Reliability**: No regex parsing of formatted text
- **Composability**: Pipe JSON to jq or other tools
- **Convention**: Matches behavior of gh, docker, kubectl, and other CLIs

## Principle Alignment

- [Unsurprising UX](../principles/unsurprising-ux.md) - `--json` is a common CLI pattern
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents can process output without parsing help
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Choose detail level via format

## Open Questions

### Should JSON be the default in non-TTY contexts?

#### Explicit flag only

Always require `--json` to get JSON output. Predictable but requires flag.

#### Auto-detect

Output JSON when stdout is not a TTY (piped or redirected). Matches some tools but may surprise users.

### What fields should be included?

#### Minimal schema

Only essential fields: title, path, and maybe summary. Small output, easy to parse.

#### Full artifact data

Include all parsed fields (sections, blocked-by, etc.). Complete but verbose. Could add `--json=full` for this.

### How should this interact with filtering/sorting?

#### Filtering in the command

Add `--filter` and `--sort` flags that work with both text and JSON output.

#### Leave filtering to jq

Keep dust output simple. Users pipe JSON to jq for filtering. Unix philosophy.
