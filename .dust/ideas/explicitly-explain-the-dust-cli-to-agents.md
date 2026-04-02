# Explicitly explain the dust CLI to agents

Agent prompts reference `dust` commands without explaining what dust is or how to invoke it. When agents receive task instructions in `dust agent`, `dust loop`, or `dust bucket worker` contexts, the prompts reference `dust` commands but don't explain what the dust CLI is or how to invoke it in different environments.

## Current Behavior

Task prompts include instructions like:

- "Run `dust check` to verify the project is in a good state"
- "Run `dust facts` if needed"
- The `DUST_QUICK_REFERENCE` section lists commands: `dust ideas`, `dust principles`, `dust facts`, `dust help`

However, the prompts don't explain that:

1. `dust` is a CLI tool that might not be globally installed
2. Agents may need to prefix commands with `bunx` or `npx` depending on the environment
3. The specific invocation method is determined by the `.dust/config/settings.json` `dustCommand` setting

## Impact

When agents see instructions to run `dust ...` commands, they may:

- Try to run `dust` directly, which fails if it's not in PATH
- Not understand that they should use `bunx dust` or `npx dust` instead
- Waste time debugging why the `dust` command isn't found
- Not recognize that suggestions in documentation to "run `dust ...`" need to be adapted to their environment

## Relevant Context

From codebase exploration:

- **Agent prompts are constructed in**: `lib/loop/iteration.ts:buildTaskPrompt()`, `lib/loop/iteration.ts:buildCheckFixPrompt()`, `lib/loop/iteration.ts:buildGitConflictPrompt()`, and `lib/cli/commands/focus.ts:buildImplementationInstructions()`
- **DUST_QUICK_REFERENCE constant**: Defined in `lib/loop/iteration.ts:33` and included in task prompts
- **`dustCommand` setting**: Available via `settings.dustCommand` (from `.dust/config/settings.json`) - this is the actual command the agent should use
- **Agent greeting**: `lib/cli/commands/agent.ts:agentGreeting()` already uses `${vars.bin}` template variable throughout

All prompts already have access to `settings.dustCommand` (or equivalent `bin` template variable), which contains the correct invocation method for the current environment.

## Proposed Solution

Add a brief explanation about the dust CLI to agent prompts, positioned near the beginning of task instructions. The explanation should:

1. State what dust is (a CLI tool for managing development workflows)
2. Clarify how to invoke it in the current environment (using the `dustCommand`/`bin` value)
3. Mention that when documentation or prompts suggest "run `dust ...`", agents should use the prefix shown

Example placement:

```
## About the dust CLI

Dust is a CLI tool for managing software development workflows through markdown artifacts. In this environment, run dust commands using: `${dustCommand}`

When you see suggestions to run `dust ...` commands (in documentation or elsewhere), prefix them with the invocation method shown above. For example, if instructed to run `dust check`, you should run `${dustCommand} check`.
```

This could be:

- Added to `DUST_QUICK_REFERENCE` (used in task prompts from loops/bucket)
- Added to `buildImplementationInstructions()` (used in `dust focus` and task prompts)
- Or both, to ensure consistency across all agent contexts

## Open Questions

### Where should the explanation appear?

#### Option: In DUST_QUICK_REFERENCE constant

Add the explanation to the existing `DUST_QUICK_REFERENCE` constant in `lib/loop/iteration.ts`, which is already included in task prompts from `dust loop` and `dust bucket worker`.

**Pros:**
- Single change affects all loop/bucket task prompts
- Keeps dust-related context grouped together
- Natural placement before the command list

**Cons:**
- Doesn't affect `dust agent` greeting or `dust focus` output
- Requires passing `dustCommand` to the constant (currently static)

#### Option: In buildImplementationInstructions()

Add the explanation to the instructions built by `buildImplementationInstructions()` in `lib/cli/commands/focus.ts`, which generates step-by-step guidance for implementing tasks.

**Pros:**
- Appears in both `dust focus` and loop/bucket task prompts
- Already has access to `bin` parameter
- Natural placement among implementation steps

**Cons:**
- Doesn't affect the `DUST_QUICK_REFERENCE` section
- Less visible if agents scroll past instructions to task content

#### Option: Both locations

Add explanations in both `DUST_QUICK_REFERENCE` and `buildImplementationInstructions()` with slightly different wording to avoid redundancy.

**Pros:**
- Comprehensive coverage across all agent contexts
- Reinforces the message in different parts of the prompt

**Cons:**
- Duplication could feel redundant
- More code to maintain

### Should the explanation mention specific runners (bunx/npx)?

#### Option: Mention bunx/npx explicitly

Include text like: "This might be `dust`, `bunx dust`, `npx dust`, or another prefix depending on how dust is installed."

**Pros:**
- Helps agents understand the variety of invocation methods
- Provides concrete examples

**Cons:**
- Could confuse agents who should just use the provided `dustCommand` value
- Adds noise to the prompt

#### Option: Keep it abstract

Only mention that agents should use the provided prefix, without listing alternatives.

**Pros:**
- Simpler, less verbose
- Focuses agents on the correct invocation for their environment

**Cons:**
- Agents might not understand why the prefix differs from bare `dust` in documentation

### How verbose should the explanation be?

#### Option: Minimal (1-2 sentences)

Brief statement that dust is a CLI tool and commands should use the shown prefix.

**Pros:**
- Minimal token usage
- Quick to read
- Sufficient for most agents to understand

**Cons:**
- Might not fully clarify the issue for confused agents

#### Option: Moderate (3-4 sentences)

Include what dust is, how to invoke it, and why the prefix matters.

**Pros:**
- Balances clarity with brevity
- Addresses common confusion points

**Cons:**
- Slightly more verbose

#### Option: Detailed (5+ sentences)

Comprehensive explanation including examples, environment context, and edge cases.

**Pros:**
- Maximally clear
- Prevents all possible confusion

**Cons:**
- Takes up significant prompt space
- Most agents won't need this level of detail
