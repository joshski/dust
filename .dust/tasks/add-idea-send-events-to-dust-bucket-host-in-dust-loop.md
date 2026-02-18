# Add Idea: Send events to dust bucket host in `dust loop`

Research this idea thoroughly, then create an idea file at `.dust/ideas/send-events-to-dust-bucket-host-in-dust-loop.md`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

When running `dust loop claude` or `dust loop codex` we should 1) check whether there is a token for the bucket service (supporting env.DUST_BUCKET_HOST) 
2) if not, prompt them to choose whether they want to send events to a bucket (using a hand-rolled terminal UI menu)
3) if they have a bucket configured, send events without asking
4) use the configured token in the HTTP auth header

We should remove the DUST_EVENTS_URL env var and eventsUrl configuration setting

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at .dust/ideas/send-events-to-dust-bucket-host-in-dust-loop.md
- [ ] Idea file has an H1 title matching "Send events to dust bucket host in `dust loop`"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
