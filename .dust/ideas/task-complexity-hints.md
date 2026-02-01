# Task Complexity Hints

Include optional complexity metadata in task files to help agents self-select appropriate work.

## Problem

Not all tasks are equal. Some require deep codebase knowledge, others are simple additions. Agents may pick tasks beyond their effective context window or skill level, leading to incomplete or incorrect work.

## Concept

Tasks could include optional frontmatter or a section indicating:

```markdown
## Complexity

- **Scope**: single-file | multi-file | cross-module
- **Context needed**: minimal | moderate | extensive
- **Risk**: low | medium | high
```

Agents or the `dust pick` command could use this to match work to capability.

## Alignment with Goals

- **Agent Autonomy** - Agents can make informed decisions about what to attempt
- **Small Units** - Encourages breaking complex work into simpler pieces
- **Context Window Efficiency** - Avoids context overload on complex tasks

## Implementation Considerations

- Keep optional to maintain Lightweight Planning
- Could be inferred rather than explicit (e.g., count files touched by similar past tasks)
- Human task authors may not accurately estimate complexity
