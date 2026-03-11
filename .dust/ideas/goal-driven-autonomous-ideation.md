# Goal-Driven Autonomous Ideation

Introduce a `goals` artifact type that sits above principles in the planning hierarchy, representing desired outcomes rather than working standards. Agents would periodically reflect on goals, principles, and facts to propose large-scope ideas that bridge the gap between current state and desired outcomes — without requiring low-level human prompting.

Currently, principles define *how* to work but not *what to achieve*. Audits like "ideas from principles" are tactical (find violations) rather than strategic (propose direction). A goal like "onboarding takes < 5 minutes" gives agents something to reason toward, generating ideas that are larger in scope and more architecturally significant than principle-violation fixes.

The idea refinement phase becomes the place for "big design up front" — ideas can span multiple sessions, accumulating depth through repeated refinement before being decomposed into single-commit tasks. This preserves lightweight planning at the task level while allowing ambitious planning at the idea level.

Key elements:
- `.dust/goals/` directory with human-authored goal artifacts (desired outcomes, success criteria)
- A "strategize" audit or periodic activity where the agent reads goals + principles + facts and proposes ideas
- Idea-to-goal tracing so humans can evaluate proposals in the context of what they serve
- Multi-session refinement as an explicit pattern for large ideas

## Open Questions

### Should goals be hierarchical like principles?

#### Yes, single-parent tree like principles

Allows goals to nest naturally (e.g., "reliable infrastructure" → "zero-downtime deploys" → "support 50 concurrent sessions"). Consistent with existing principle structure.

#### No, flat list

Simpler to manage. Goals are fewer in number than principles and may not need hierarchy. Relationships can be captured as prose.

### How does the agent decide when to strategize?

#### Periodically on a schedule

Run strategic ideation as part of `dust loop` at a configured interval (e.g., every N sessions or once per day). Predictable but may generate noise.

#### When the task queue is empty

Natural trigger point — the agent has nothing to do, so it reflects. But requires the queue to actually drain, which may not happen in active projects.

#### On explicit human request

A `dust strategize` command that humans invoke when they want the agent to think big. Lowest autonomy but highest signal.

### How do you prevent runaway scope?

#### Human approval gate before refinement

Ideas proposed by strategic ideation start in a "proposed" state. Humans approve before the agent invests in multi-session refinement. Clear but adds friction.

#### Agent proposes freely, humans prune

Let the agent generate ideas liberally. Humans shelve what they don't want. Lower friction but risks wasted agent effort and idea clutter.

### Should this be a dust feature or a dustbucket feature?

#### Dust (CLI-level)

Available to all dust users regardless of whether they use dustbucket. Strategic ideation runs locally against the current repo.

#### Dustbucket (platform-level)

Dustbucket has multi-session infrastructure and fleet visibility. Could reason across repositories and coordinate strategic ideation centrally.

#### Both, with different scopes

Dust handles single-repo strategic ideation. Dustbucket adds cross-repo awareness and scheduling.
