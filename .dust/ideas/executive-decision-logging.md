# Executive Decision Logging

Encourage agents to log "executive decisions" — anything that wasn't spelled out specifically in the requirements. These are choices the agent made autonomously when the requirements were ambiguous or incomplete.

## Problem

When an agent implements a task, it makes dozens of small choices that aren't prescribed by the task description. Which function name to use. Whether to handle a particular edge case. Whether to split a module or keep it together. How to structure error messages. These choices are invisible — they're baked into the code but the reasoning behind them is lost.

This matters because:

- **Reviewers can't distinguish intent from accident.** When a reviewer sees code, they don't know whether a particular pattern was a deliberate choice or something the agent fell into. Was this naming convention intentional, or did the agent just pick the first thing that came to mind?
- **Mistakes compound silently.** If an agent misinterprets a requirement, subsequent agents build on that misinterpretation. Without a record of the original reasoning, no one knows where the divergence started.
- **Knowledge doesn't accumulate.** An agent might make a good decision about error handling in one task, but that reasoning is lost when the next agent starts fresh. If decisions were recorded, they could inform future work — either as conventions or as facts.

## Examples of executive decisions

- Choosing between multiple valid implementation approaches ("used a Map instead of a plain object for O(1) lookup by key")
- Deciding on naming conventions when not specified ("named the module `event-parser` to match the existing `event-*` pattern")
- Selecting which edge cases to handle ("added validation for empty strings because the upstream API returns them for missing fields")
- Picking a library or tool when options weren't prescribed ("used `zod` for schema validation since it's already a dependency")
- Scoping decisions ("only applied the fix to the `loop` command since other commands don't have this issue yet")
- Interpreting ambiguous requirements ("the task said 'support multiple formats' — implemented JSON and CSV as these are the most common; YAML could be added later")

## How it works

Agents include an "Executive Decisions" section in their commit messages when they've made choices not dictated by the task. The format is structured enough to be machine-parseable but readable as plain text:

```
feat: implement event streaming for loop command

Implements task: event-streaming-support

Executive Decisions:
- Used Server-Sent Events instead of WebSockets — simpler for
  unidirectional flow and works through proxies
- Set default retry interval to 5 seconds — balances responsiveness
  with server load; made configurable via settings
- Events are fire-and-forget — guaranteed delivery would require a
  local queue, which is out of scope for this task
```

## Relationship to Commit Log Observations

Executive Decision Logging and Commit Log Observations are complementary:

- **Executive Decisions** are forward-looking: "here's what I chose and why"
- **Commit Log Observations** are backward-looking: "here's what I noticed while working"

Together, they make commit messages a rich record of agent cognition. The `dust scan commits` idea from Commit Log Observations could also scan for executive decisions, surfacing patterns like "agents keep choosing X over Y — should we make that a convention?"

## Relationship to Log Ruled Out Decisions

The "Log Ruled Out Decisions" idea focuses on recording what was considered and rejected. Executive Decision Logging is broader — it captures what was chosen, not just what was rejected. The two ideas could converge into a single convention where agents document the decision, the alternatives they considered, and why they chose what they did. But the executive decision format is intentionally lightweight — a few bullet points per commit, not a full decision record.

## Open Questions

### Where should executive decisions be recorded?

#### Commit messages only

Decisions live in the commit message as a structured section. This is zero-overhead — agents already write commit messages, and adding a section is trivial. The decisions are preserved in git history forever and are discoverable via `git log`. The downside is that commit messages are write-once — you can't update or annotate a decision after the fact without rewriting history. They're also hard to search across unless you build tooling to parse them out.

#### A dedicated decisions file per task

Each task gets a companion `.dust/decisions/task-slug.md` file that records the executive decisions made during implementation. The file is committed alongside the implementation. This makes decisions first-class artifacts that can be browsed, searched, and linked to. The cost is file proliferation — every task generates another file, and decisions for deleted tasks need their own lifecycle. It also separates the decision from the code change, making it harder to see them together.

#### Inline code comments with a convention

Decisions are recorded as comments in the source code at the point where the choice was made, using a conventional tag like `// DECISION: used Map for O(1) lookup`. This colocates the decision with the code it affects, making it visible during code review and future maintenance. The downside is comment clutter — over time, decision comments accumulate and become noise. They also don't survive refactoring well (code moves, comments get orphaned).

### How should agents be prompted to log decisions?

#### Template in task implementation instructions

The `dust implement task` prompt includes a reminder to document executive decisions in the commit message. This is the simplest approach — it's just a prompt change. The risk is that agents treat it as boilerplate and either skip it or produce low-quality entries. Effectiveness depends on how well the agent model responds to the instruction.

#### Structured commit message format enforced by lint

`dust lint markdown` or `dust check` validates that commit messages for task implementations include an "Executive Decisions" section. This enforces the practice but may produce cargo-cult compliance — agents include the section but fill it with trivial or obvious entries to pass the check. Enforcement works best when combined with examples of good decisions.

#### Agent self-reflection step before committing

After implementing a task but before committing, the agent runs a self-reflection step: "What choices did I make that weren't specified in the task?" This is a separate prompt that encourages genuine introspection rather than afterthought documentation. The cost is additional token usage per task and added latency. The quality of output depends on whether the model can meaningfully distinguish prescribed from inferred behavior.

### Should executive decisions feed back into the project's conventions?

#### No feedback loop, decisions are purely documentation

Decisions are recorded and that's it. Humans or agents who read the history can learn from them, but there's no automated process to extract conventions. This is simple and low-risk. The cost is that good decisions stay buried in commit history rather than becoming shared knowledge.

#### Periodic extraction into facts

A `dust extract conventions` command scans recent executive decisions for patterns. If agents keep making the same choice (e.g. "always use Maps for lookup tables"), the command proposes a new fact documenting the convention. This closes the feedback loop — individual decisions become team knowledge. The risk is premature standardization: a pattern that appeared 3 times might not deserve to be a convention, and the extraction heuristic needs careful tuning.

#### Decisions become input to future task prompts

When an agent picks up a new task, it receives relevant executive decisions from recent related tasks as context. For example, if a prior task decided "use zod for validation," the next task in the same area sees that decision. This enables continuity without formal conventions. The complexity cost is retrieval — the system needs to determine which past decisions are relevant to a new task, which is a fuzzy matching problem.
