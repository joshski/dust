# Interactive Task Refinement

A guided workflow that helps transform vague ideas into well-structured tasks through interactive questioning.

## Concept

When a human has a rough idea but isn't sure how to structure it as an actionable task, they could run `bin/dust refine idea` to start a conversation that:

1. Asks clarifying questions about scope and intent
2. Identifies which goals the work aligns with
3. Helps define clear completion criteria
4. Suggests potential dependencies or blockers
5. Produces a well-formed task file

## Why This Matters

- **Easy Adoption**: Lowers the barrier for humans new to dust
- **Agent Context Inference**: Results in tasks that give agents better starting context
- **Lightweight Planning**: Quick path from "I have an idea" to "here's what to do"

## Possible Approaches

- Interactive CLI prompts (like `npm init`)
- Agent-assisted refinement (use an LLM to ask smart follow-up questions)
- Template-based scaffolding with fill-in-the-blank sections
