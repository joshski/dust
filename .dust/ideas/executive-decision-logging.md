# Executive Decision Logging

Encourage agents to log "executive decisions" — anything that wasn't spelled out specifically in the requirements. These are choices the agent made autonomously when the requirements were ambiguous or incomplete.

Examples of executive decisions:
- Choosing between multiple valid implementation approaches
- Deciding on naming conventions when not specified
- Selecting which edge cases to handle
- Picking a library or tool when options weren't prescribed

These decisions should form part of the commit message, making it clear what was explicitly requested versus what was inferred or decided by the agent. This transparency helps reviewers understand the agent's reasoning and catch cases where the agent's interpretation differs from the intended requirement.
