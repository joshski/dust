# Audit: Agent Developer Experience

Review the codebase to ensure agents have everything they need to operate effectively.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Context window efficiency** - Are files small and well-organized?
2. **Test coverage** - Can agents verify correctness through tests?
3. **Feedback loop speed** - How fast are checks and tests?
4. **Debugging tools** - Can agents diagnose issues without trial and error?
5. **Structured logging** - Is system behavior observable through logs?

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Reviewed file sizes and organization for context window fit
- [ ] Verified test coverage is sufficient for agent verification
- [ ] Measured feedback loop speed (time from change to check result)
- [ ] Confirmed debugging tools and structured logging are in place
- [ ] Proposed ideas for any improvements identified