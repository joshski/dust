# Dust Personality

Give dust a configurable "personality" or tone of voice that shapes how it communicates.

## Context

Dust personality manifests in two distinct dimensions:

**Agent-facing**: CLI output that agents read — greetings, help text, status messages, and error output. The agent greeting says "🤖 Hello ${agentName}, welcome to dust!" and help text announces "✨ dust - Flow state for AI coding agents."

**Human-facing**: The artifacts themselves — principles, facts, ideas, and tasks. These are what humans primarily read and write. The tone of artifact templates, example content, and scaffold text shapes how a team's dust directory feels.

Since developers might work with dust all day, the character of these interactions matters. A tool's personality affects user experience in subtle ways - it can make mundane tasks feel more engaging or help establish a team's culture around AI-assisted development.

### Current Output Locations

User-facing messages flow through several places:

- **Agent greeting** (`lib/cli/commands/agent.ts:16-50`): Welcome message and command routing
- **Help text** (`lib/cli/commands/help.ts:8-50`): Command reference and agent guide
- **List commands** (`lib/cli/commands/list.ts`): Task, idea, principle, and fact listings
- **Event formatting** (`lib/agent-events.ts:54-73`): Session started/ended messages
- **Focus output** (`lib/cli/commands/focus.ts`): Current objective confirmation
- **Error messages**: Various commands produce failure messages

Each location uses emojis (🤖, ✨, 🎯, 📋, 💡) and consistent but neutral phrasing.

### Human-Facing Artifact Personality

When `dust init` creates a new repository, it scaffolds example artifacts. When `dust new task` creates a task, it generates a template. These templates and examples establish a voice:

- **Principle templates**: How are guiding values expressed? Formal statements or conversational explanations?
- **Task templates**: How are work items described? Bullet-point checklists or narrative descriptions?
- **Fact templates**: How is system state documented? Technical reference or explanatory prose?
- **Idea templates**: How are proposals framed? Problem-focused or solution-focused?

The current templates use a neutral, documentation-style voice. Teams might prefer different approaches: some want terse technical notes, others want expressive prose that captures intent and context.

### Configuration Entry Point

The existing settings system in `.dust/config/settings.json` handles `dustCommand`, `installCommand`, `checks`, `eventsUrl`, and `extraDirectories`. A `personality` setting would fit naturally here.

Agent-specific instructions already support customization through `.dust/config/agents/{agent-type}.md` files, which are appended to the agent greeting. This demonstrates the pattern for per-agent customization.

### Relevant Principles

- [Enable Flow State](../principles/enable-flow-state.md): Personality affects whether interactions feel engaging or draining
- [Easy Adoption](../principles/easy-adoption.md): Default personality should work for most users without configuration
- [Unsurprising UX](../principles/unsurprising-ux.md): Whatever personality is active should remain consistent across all messages
- [Progressive Disclosure](../principles/progressive-disclosure.md): Personality configuration should be optional and discoverable

## How it could work

A `personality` setting in `.dust/config/settings.json` would select from built-in presets or allow custom configuration:

```json
{
  "personality": "professional"
}
```

Each preset would define variations for greetings, confirmations, status messages, and error handling. The personality would apply consistently across all output locations.

### Example Presets

**professional** (default): Clear, direct communication
- Greeting: "Hello Claude, welcome to dust."
- Task complete: "Task completed successfully."

**friendly**: Warm, casual tone
- Greeting: "Hey Claude! Good to see you."
- Task complete: "Nice work, all done!"

**minimal**: Terse, information-dense
- Greeting: "dust ready."
- Task complete: "Done."

**playful**: Light-hearted, encouraging
- Greeting: "Ahoy, Claude! Ready to make some magic?"
- Task complete: "Boom! Another one bites the dust."

### Custom Personality

For teams with specific preferences, a custom mode could allow per-message overrides:

```json
{
  "personality": {
    "greeting": "Welcome back, {agentName}. Let's ship some code.",
    "taskComplete": "Shipped.",
    "emoji": false
  }
}
```

## Open Questions

### Should emojis be part of personality or separate?

#### Part of personality

Each personality preset decides whether and which emojis to use. "minimal" might use no emojis while "playful" uses many.

Pros: Emojis are a tone signal; including them in personality keeps configuration unified
Cons: Some users want minimal text with emojis, or verbose text without them

#### Separate setting

A dedicated `emoji: boolean` or `emoji: "full" | "minimal" | "none"` setting controls emoji usage independently from tone.

Pros: More flexibility; respects that emoji preference is often about accessibility or terminal rendering
Cons: More configuration options; personality presets become less cohesive

### What level of customization should be exposed?

#### Presets only

Users pick from a small set of built-in personalities. No custom configuration beyond selection.

Pros: Simple; avoids feature creep; presets can be refined over time
Cons: Teams with specific tone needs cannot customize

#### Presets with overrides

Presets are the base, but individual messages can be overridden in settings.

Pros: Balance of simplicity and power; most users use presets, power users customize
Cons: Overrides add complexity; hard to document all customizable messages

#### Full template system

All messages are templates with consistent variables. Users can override any message.

Pros: Maximum flexibility; teams own their voice completely
Cons: Maintenance burden; more surface area for bugs; users must understand the template system

### How should personality affect agent behavior beyond messages?

#### Messages only

Personality only changes output text. It doesn't affect instructions to agents or how commands work.

Pros: Clear scope; easy to implement; low risk
Cons: Personality feels superficial if the underlying interaction style doesn't match

#### Extended to instructions

The personality could influence how instructions are phrased to agents - a "minimal" personality might produce terser task instructions.

Pros: Consistent experience; personality permeates the whole tool
Cons: Risk of affecting agent behavior negatively; harder to test; more complex implementation

### What should the default personality be?

#### Current behavior (neutral/professional)

Keep the existing tone as the default. Only users who configure personality see different output.

Pros: No breaking changes; conservative approach
Cons: Misses opportunity to have an opinion about what makes dust enjoyable

#### A new default with character

Make the default personality distinctive and memorable, reflecting dust's nature as a flow-state tool.

Pros: Stronger product identity; differentiation from generic tooling
Cons: Subjective; may not suit all users; harder to get right

### Should artifact templates reflect personality settings?

#### CLI output only

Personality settings only affect CLI output (agent greetings, help text, status messages). Artifact templates remain neutral and consistent across all installations.

Pros: Artifacts are portable between teams; simpler implementation; artifacts focus on content not style
Cons: Personality feels incomplete; the most-read content (artifacts) doesn't reflect the configured voice

#### Artifacts follow personality

When `dust new task` runs, the generated template matches the configured personality. A "minimal" personality produces terse templates; a "friendly" personality produces warmer prose.

Pros: Consistent voice throughout the tool; artifacts feel cohesive with CLI experience
Cons: Existing artifacts won't match new ones if personality changes; harder to maintain template variants

#### Artifacts have separate style guide

A separate `artifactStyle` setting controls artifact templates independently from CLI personality. Teams might want minimal CLI output but expressive artifacts, or vice versa.

Pros: Maximum flexibility; respects that artifact authorship is different from reading CLI output
Cons: Configuration complexity; two personality dimensions to reason about
