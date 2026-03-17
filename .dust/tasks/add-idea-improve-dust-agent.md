# Add Idea: Improve `dust agent`

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

The `dust agent` command generates output like this:

```
 🤖 Hello ${vars.agentName}, welcome to dust!

    CRITICAL: You MUST run exactly ONE of the commands below before doing anything else.

    Determine the user's intent and run the matching command NOW:
```

But it feels like it should gently introduce what dust is, in a more general sense, before saying anything critical. Something like:

```
🤖 Hello ${vars.agentName}, welcome to dust!

Dust is a planning tool for coding agents like you. Use dust to discover what to work on next, explore important information regarding this repository, and to plan future work.

All dust planning is managed via markdown artifacts. You can assume that the user's prompt implicitly includes "ALWAYS use the dust CLI before undertaking any work". The commands available via the dust CLI are there to guide you through the process of working with dust artifacts. Use the dust CLI instead of exploring the file system (it will give you great results).

[...]
```

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
