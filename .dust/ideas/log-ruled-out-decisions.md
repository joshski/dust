# Log Ruled Out Decisions

There's no natural place to record decisions about what was considered and rejected.

## The Problem

When an agent (or human) decides NOT to do something, no action is taken, so:
- No code changes → no git commit
- WIP artifacts get deleted → no trace in `.dust/`
- The reasoning behind "we won't do X" is lost

## Examples of Ruled-Out Decisions

- "We considered adding caching but decided the complexity wasn't worth it"
- "We evaluated library X but rejected it due to licensing concerns"
- "We won't support feature Y because it conflicts with goal Z"
- "We ruled out approach A in favor of approach B" (where B was implemented, but the reasoning against A is valuable)

## Possible Solutions

1. **Decisions directory**: A `.dust/decisions/` folder for recording significant choices, including rejections. These would be permanent (not WIP).

2. **Decision log file**: A single `.dust/decisions.md` file that accumulates ruled-out choices over time.

3. **Task annotations**: Allow completed tasks to reference "alternatives considered" that link to brief explanations.

4. **Empty commits**: Create commits with no code changes, just commit messages explaining ruled-out decisions. (Awkward but uses existing git history.)

5. **Facts with negative framing**: Use facts like "We do not support X because Y" — though this muddies the distinction between "what is true" and "what was decided."

## Considerations

- How do we distinguish between "actively decided against" vs "never considered"?
- Should ruled-out decisions have expiration or review dates?
- How do we prevent this from becoming a dumping ground for random thoughts?
