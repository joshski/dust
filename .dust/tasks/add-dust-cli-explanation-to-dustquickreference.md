# Add dust CLI explanation to DUST_QUICK_REFERENCE

Add a brief explanation to the `DUST_QUICK_REFERENCE` constant in `lib/loop/iteration.ts` that clarifies what dust is and how to invoke it. The explanation should appear before the command list and help agents understand that when they see `dust ...` commands in documentation, they should use the appropriate invocation method (like `bunx dust` or `npx dust`).

## Principles

- [Context Window Efficiency](../principles/context-window-efficiency.md): Dust should be designed with short attention spans in mind. AI agents operate within limited context windows. Every token consumed by planning artifacts is a token unavailable for reasoning about code. Dust keeps artifacts concise and scannable so agents can quickly understand what needs to be done without wading through verbose documentation. This means favoring brevity over completeness, using consistent structures that are fast to parse, and avoiding redundant information across files.

- [Ideal Agent Developer Experience](../principles/ideal-agent-developer-experience.md): The agent is the developer. The human is the CEO. Dust is the PM. With today's AI coding assistants, the human is stuck in a tight loop with agents — constantly directing, reviewing, and course-correcting. Dust is designed to relieve humans from this tight loop. Like an assistant to a CEO, dust predominantly brings fully-researched questions and well-prepared work to the human, rather than expecting the human to drive every decision. The human checks in less frequently, and when they do, they make high-leverage strategic calls rather than micromanaging implementation. For this to work, the agent's development environment must be excellent. The agent reads the code, writes changes, runs the checks, and iterates until the task is done. Everything about the codebase and its tooling either helps or hinders that process.

- [Actionable Errors](../principles/actionable-errors.md): Error messages should tell you what to do next, not just what went wrong. When something fails, the message should provide: a clear description of the problem, specific guidance on how to fix it, and context needed to take the next step. This is especially important for AI agents, who need concrete instructions to recover autonomously. A good error message turns a dead end into a signpost.

## Task Type

implement

## Blocked By

(none)

## Guidance

Based on the resolved questions in the decompose task:

1. **Location**: Add the explanation to the `DUST_QUICK_REFERENCE` constant in `lib/loop/iteration.ts`
2. **Verbosity**: Keep it minimal (1-2 sentences) per the context-window-efficiency principle
3. **Mention runners**: Explicitly mention bunx/npx to help agents understand the variety of invocation methods
4. **Template variable**: Use the `${dustCommand}` template variable that's already available in the prompt context

The current `DUST_QUICK_REFERENCE` is a static string. You'll need to convert it to a function that accepts `dustCommand` as a parameter so it can be interpolated into the explanation.

## Implementation Notes

Files to modify:
- `lib/loop/iteration.ts:33` - Update DUST_QUICK_REFERENCE from a constant to a function
- `lib/loop/iteration.ts` - Update all callsites that use DUST_QUICK_REFERENCE to pass the dustCommand value

The explanation should:
- Appear before the existing command list
- State that dust is a CLI tool for managing development workflows
- Show how to invoke it in the current environment using the dustCommand value
- Mention that invocation might be `dust`, `bunx dust`, `npx dust`, or similar

Example wording (adjust as appropriate):
```
Dust is a CLI tool for managing development workflows through markdown artifacts. In this environment, run dust commands using: \`${dustCommand}\` (this might be \`dust\`, \`bunx dust\`, \`npx dust\`, or another prefix depending on how dust is installed).
```

## Definition of Done

- The `DUST_QUICK_REFERENCE` constant is converted to a function that accepts `dustCommand` parameter
- A 1-2 sentence explanation about dust CLI invocation is added before the command list
- The explanation uses the `${dustCommand}` template variable
- The explanation mentions bunx/npx as examples
- All callsites of `DUST_QUICK_REFERENCE` are updated to pass the dustCommand value
- Tests pass
- `dust check` passes
