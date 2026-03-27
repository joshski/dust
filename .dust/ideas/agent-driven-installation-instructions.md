# Agent-Driven Installation Instructions

Instead of telling humans to run shell commands, tell them to ask their agent to install dust.

## Context

The current installation instructions in the README (`README.md:11-14`) tell humans to run:

```bash
npm install @joshski/dust
npx dust init
```

This approach assumes the human will manually execute commands. However, dust exists specifically to enable AI coding agents (`agent-autonomy.md`), and users of dust are by definition already using an AI coding agent. The installation process could leverage this.

## Proposed Change

Replace the current installation instructions with:

```bash
claude "install dust as per https://github.com/joshski/dust"
```

Or similar patterns for other agents:

```bash
aider "install dust from https://github.com/joshski/dust"
cursor "set up dust in this project"
```

The GitHub URL provides the agent with full context (README, package.json, code structure) to understand what dust is and how to install it correctly.

## Benefits

1. **Aligned with principles**: Embraces [Agent Autonomy](../principles/agent-autonomy.md) by letting agents handle installation rather than humans
2. **Simpler for humans**: One natural-language command instead of multiple shell commands
3. **More resilient**: Agents can adapt to different environments (package managers, OS differences) without humans needing to know specifics
4. **Self-documenting**: The agent sees the full context from GitHub, including recent updates and best practices
5. **Consistent with usage**: Since dust is used via agents, starting with an agent command is more intuitive

## Risks

1. **Assumes agent capability**: Not all agents may handle installation commands equally well
2. **Less explicit**: Humans accustomed to explicit shell commands may find this unclear
3. **Debugging**: If installation fails, humans may struggle to understand what went wrong
4. **Package manager detection**: Agents need to correctly detect `bun`, `npm`, or `pnpm` - though dust already handles this (`agents-md-instruction.md`)

## Related Work

- [Could we run dust on repos without dust installed?](could-we-run-dust-on-repos-without-dust-installed.md) - explores running dust without local installation
- [Install dust bash alias in hook](install-dust-bash-alias-in-hook.md) - makes dust commands available without local installation
- [Self-Onboarding Task](self-onboarding-task.md) - agent-guided post-installation configuration
- [Easy Adoption](../principles/easy-adoption.md) - principle emphasizing minimal installation friction
- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md) - detecting and optimizing for specific agents

## Open Questions

### Should we provide both human and agent installation methods?

#### Agent-only (recommended)

Show only the agent-driven approach. This reinforces that dust is an agent-first tool and keeps the README focused.

Benefits: Cleaner documentation, reinforces agent-first philosophy, simpler mental model
Costs: May alienate users unfamiliar with agent-driven workflows

#### Dual approach

Provide both methods: "Quick start (with agent)" and "Manual installation". Let users choose based on comfort level.

Benefits: Accommodates different experience levels, provides fallback
Costs: More documentation to maintain, may confuse users about which to use

#### Agent-first with manual fallback

Lead with the agent approach but include a details/collapsible section for manual steps.

Benefits: Emphasizes agent workflow while keeping manual steps accessible
Costs: Slightly more complex documentation structure

### What URL should agents use?

#### GitHub repository URL

Use `https://github.com/joshski/dust` so the agent reads the README, sees examples, and understands context.

Benefits: Full context, includes examples and principles, stays current with main branch
Costs: Agent may be overwhelmed by repository size

#### npm package page

Use `https://www.npmjs.com/package/@joshski/dust` which shows installation commands directly.

Benefits: Focused on installation, already formatted for package managers
Costs: Less context about what dust does, may miss recent changes not yet published

#### Raw README URL

Use raw GitHub URL pointing directly to `README.md`.

Benefits: Focused content, no repository noise
Costs: Lacks surrounding context from codebase structure

### How should we phrase the instruction?

#### Direct command: "install dust"

```bash
claude "install dust as per https://github.com/joshski/dust"
```

Benefits: Specific and action-oriented, clear expectation
Costs: Assumes agent knows what "install" means in this context

#### Open-ended: "set up dust"

```bash
claude "set up dust in this project: https://github.com/joshski/dust"
```

Benefits: Gives agent freedom to interpret and adapt
Costs: May lead to inconsistent results across different agents

#### Detailed: "install and initialize"

```bash
claude "install and initialize dust from https://github.com/joshski/dust"
```

Benefits: Explicit about both steps (install + init)
Costs: Longer, prescriptive, assumes two-step process

### Should installation instructions mention specific agents?

#### Agent-agnostic (recommended)

Show one example (`claude`) with a note that other agents work similarly.

Benefits: Aligns with [Agent-Agnostic Design](../principles/agent-agnostic-design.md), simpler docs
Costs: Users of other agents may not realize it works for them

#### Multi-agent examples

Show examples for Claude, Aider, Cursor, and others.

Benefits: Inclusive, demonstrates compatibility, users see their preferred agent
Costs: Maintenance burden as new agents emerge, risk of appearing to favor certain agents

#### Generic syntax

Use a placeholder like `your-agent "install dust..."`.

Benefits: Truly agnostic, no favoritism
Costs: Less concrete, users may not understand how to adapt

### What should happen after installation?

#### Let the agent continue

The installation command naturally leads to the agent running `dust init` and potentially `dust agent`, setting up the repository fully.

Benefits: Seamless onboarding, leverages agent autonomy
Costs: May do more than user intended, less control

#### Explicit next steps

After showing installation, document what comes next: "After installation, run `claude 'implement the next task'`".

Benefits: Clear progression, user maintains control
Costs: Requires human to issue follow-up commands

#### Reference agent guidance

Point to the agent instructions added by `dust init` in `CLAUDE.md`/`AGENTS.md` as the source of truth for next steps.

Benefits: Single source of truth, self-documenting
Costs: Requires users to understand where to look
