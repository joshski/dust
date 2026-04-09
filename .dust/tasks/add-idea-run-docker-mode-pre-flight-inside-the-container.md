# Add Idea: Run docker-mode pre-flight inside the container

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Docker-mode pre-flight should execute install steps and checks inside the same container environment used for the coding agent. Today the loop prepares docker configuration for the agent process but still runs pre-flight install and `dust check` on the host, which makes docker mode inconsistent and can hide container-only failures or require host dependencies that docker mode is meant to avoid. Update the loop so that when docker mode is enabled, the pre-flight phase uses the container runner with the same image, mounts, working directory, environment handling, and dependency context as the agent invocation. Preserve current host execution for non-docker runs, keep failure reporting actionable, and clarify the behavior in relevant docs or facts so users understand that docker mode validates work entirely inside the container.

## Task Type

capture

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
