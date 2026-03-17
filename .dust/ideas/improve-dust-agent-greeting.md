# Improve dust agent greeting

The `dust agent` greeting should introduce what dust is before presenting routing instructions.

## Current State

The current `dust agent` output (`lib/cli/commands/agent.ts:16-50`) begins with:

```
🤖 Hello ${agentName}, welcome to dust!

CRITICAL: You MUST run exactly ONE of the commands below before doing anything else.
```

This jumps straight into routing instructions without context. An agent encountering dust for the first time has no understanding of what dust is or why the CLI commands exist before being told to run one of them.

## Proposed Change

Add an introductory paragraph that explains dust's purpose before the command routing:

```
🤖 Hello ${agentName}, welcome to dust!

Dust is a planning tool for coding agents like you. Use dust to discover what to work on next, explore important information regarding this repository, and to plan future work.

All dust planning is managed via markdown artifacts. You can assume that the user's prompt implicitly includes "ALWAYS use the dust CLI before undertaking any work". The commands available via the dust CLI are there to guide you through the process of working with dust artifacts. Use the dust CLI instead of exploring the file system (it will give you great results).

[routing instructions...]
```

## Design Considerations

### Tone shift from "CRITICAL" to contextual

The current "CRITICAL: You MUST run exactly ONE of the commands below before doing anything else" is urgent and directive. With a gentle introduction preceding it, this tone shift could feel jarring. The routing instructions might benefit from softer framing that builds on the introduction, something like:

```
To get started, run the command that best matches the user's intent:
```

This maintains the expectation that agents should use dust CLI commands without the urgency of "CRITICAL" and "Do NOT proceed."

### Implicit user intent claim

The proposed text includes "You can assume that the user's prompt implicitly includes 'ALWAYS use the dust CLI before undertaking any work'". This is a strong claim about user intent. In practice, the CLAUDE.md instruction already tells agents to run `dust agent`, so this claim may be redundant. It could be simplified to explain that the dust CLI guides the workflow without claiming what users implicitly want.

### Context Window Efficiency trade-off

The [Context Window Efficiency](../principles/context-window-efficiency.md) principle favours brevity. Adding introductory text increases output length. However, the [Progressive Disclosure](../principles/progressive-disclosure.md) principle supports layered information — a brief introduction may help agents orient themselves before diving into specifics.

The introduction should remain concise: 2-3 sentences that answer "what is dust?" and "why use the CLI?" without expanding into full documentation.

### Related areas

- **`dust help` output** (`lib/cli/commands/help.ts`): Already includes an "Agent Guide" section with a brief explanation of dust. The agent greeting could reference this or align its introduction with the help text.
- **Per-agent instructions** (`.dust/config/agents/{agent-type}.md`): Custom instructions are appended to the greeting. The introduction should work well as a prefix to both the routing and any custom instructions.
- **[Dust Personality](dust-personality.md) idea**: Proposes configurable tone. Any greeting changes should consider how they'd interact with personality presets.

## Open Questions

### Should the routing instructions also change tone?

#### Soften the routing instructions

Replace "CRITICAL: You MUST run exactly ONE of the commands below before doing anything else" and "Do NOT proceed without running one of these commands" with gentler language that flows from the introduction.

Example: "To get started, determine the user's intent and run the matching command:"

Pros: Consistent tone throughout; feels less like a warning system
Cons: May reduce compliance; current urgency exists because agents sometimes ignore instructions

#### Keep routing instructions as-is

Add the introduction but leave the "CRITICAL" framing intact. The introduction provides context, and the directive ensures agents act on it.

Pros: Minimal change; preserves the proven routing behavior
Cons: Tonal mismatch between friendly introduction and urgent commands

### Should the greeting explain markdown artifacts?

#### Include brief explanation

Mention that dust uses markdown files in `.dust/` directories, helping agents understand what they'll encounter.

Example: "Dust manages planning artifacts as markdown files in the `.dust/` directory."

Pros: Sets expectations; reduces confusion when agents see file paths
Cons: Adds length; may be unnecessary if `dust help` already covers this

#### Omit artifact explanation

Keep the introduction focused on "what dust does" rather than "how dust works." Let `dust help` or specific commands explain the mechanics.

Pros: Shorter greeting; follows progressive disclosure
Cons: Agents may not understand why they're being asked to run CLI commands

### Where should the introduction live in the code?

#### Template string in agentGreeting function

Add the introduction text directly to the template string in `agent.ts:21-49`, keeping all greeting content co-located.

Pros: Simple; all greeting text in one place
Cons: Function becomes longer; harder to maintain if introduction evolves

#### Separate template file

Extract the introduction (or the entire greeting) to a template file like `lib/templates/agent-greeting.txt`, consistent with how `help.ts` uses `help.txt`.

Pros: Separates prose from code; easier for non-developers to modify
Cons: More indirection; current agent.ts approach works fine for this scope
