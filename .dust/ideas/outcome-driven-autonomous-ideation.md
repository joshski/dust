# Outcome-Driven Autonomous Ideation

Introduce a new artifact type that sits above principles in the planning hierarchy, representing desired outcomes rather than working standards. Agents would periodically reflect on these outcomes, principles, and facts to propose large-scope ideas that bridge the gap between current state and desired outcomes — without requiring low-level human prompting.

Currently, principles define *how* to work but not *what to achieve*. Audits like "ideas from principles" are tactical (find violations) rather than strategic (propose direction). An outcome like "onboarding takes < 5 minutes" gives agents something to reason toward, generating ideas that are larger in scope and more architecturally significant than principle-violation fixes.

The idea refinement phase becomes the place for "big design up front" — ideas can span multiple sessions, accumulating depth through repeated refinement before being decomposed into single-commit tasks. This preserves lightweight planning at the task level while allowing ambitious planning at the idea level.

## Relationship to Existing Artifacts

The current artifact progression is: principles (stable/abstract) → facts (current state) → ideas (proposals) → tasks (concrete work). This new artifact type would sit above principles, adding a fifth level that represents *what we want to achieve* rather than *how we work*:

```
outcomes → principles → facts → ideas → tasks
```

This mirrors how the `ideas-from-principles` audit works today, but at a higher level. Where that audit finds principle violations and proposes tactical fixes, a "strategize" activity would read outcomes and propose strategic initiatives.

## Key Elements

- A new artifact directory (name TBD) with human-authored desired outcomes and success criteria
- A "strategize" audit or periodic activity where the agent reads outcomes + principles + facts and proposes ideas
- Idea-to-outcome tracing so humans can evaluate proposals in the context of what they serve
- Multi-session refinement as an explicit pattern for large ideas

## Open Questions

### What should this artifact type be called?

#### Outcomes

Emphasizes measurable results. "The project outcome is fast onboarding" reads naturally. The term "goal" conflicts with agents' existing concept of a "goal" (the task they're working on), so "outcomes" avoids that collision. However, "outcomes" might be confused with task completion outcomes.

#### Objectives

Familiar from OKR frameworks. "Project objectives" is well-understood business terminology. The directory would be `.dust/objectives/`. Avoids collision with agent "goals".

#### Targets

Clear and measurable connotation. "The project targets sub-5-minute onboarding" is precise. May feel too metrics-focused for qualitative goals. The directory would be `.dust/targets/`.

#### Aspirations

Emphasizes the forward-looking nature. Less commonly used in software, which could reduce terminology conflicts. The directory would be `.dust/aspirations/`.

### Should this artifact type be hierarchical like principles?

#### Yes, single-parent tree like principles

Allows nesting naturally (e.g., "reliable infrastructure" → "zero-downtime deploys" → "support 50 concurrent sessions"). Consistent with existing principle structure. Principles use a single-parent tree to force prioritization.

#### No, flat list

Simpler to manage. These artifacts are likely fewer in number than principles and may not need hierarchy. Relationships can be captured as prose notes, following the same workaround used for secondary principle relationships.

### How does the agent decide when to strategize?

#### Periodically on a schedule

Run strategic ideation as part of `dust loop` at a configured interval (e.g., every N sessions or once per day). Predictable but may generate noise. Could be configured in `.dust/config/settings.json`.

#### When the task queue is empty

Natural trigger point — the agent has nothing to do, so it reflects. The loop already has idle behaviour (sleeping between iterations), so this fits naturally. However, requires the queue to actually drain, which may not happen in active projects.

#### On explicit human request

A `dust strategize` command that humans invoke when they want the agent to think big. Lowest autonomy but highest signal. Fits the existing audit pattern where `dust audit <name>` creates a task.

### How do you prevent runaway scope?

#### Human approval gate before refinement

Ideas proposed by strategic ideation start in a "proposed" state. Humans approve before the agent invests in multi-session refinement. This mirrors how the existing idea workflow requires explicit "Refine Idea" or "Decompose Idea" tasks to progress ideas. Clear but adds friction.

#### Agent proposes freely, humans prune

Let the agent generate ideas liberally. Humans shelve what they don't want using the existing "Shelve Idea" workflow task. Lower friction but risks wasted agent effort and idea clutter. The `stale-ideas` audit already handles periodic review of accumulated ideas.

### Should this be a dust feature or a dustbucket feature?

#### Dust (CLI-level)

Available to all dust users regardless of whether they use dustbucket. Strategic ideation runs locally against the current repo. This follows the existing pattern where audits are CLI commands (`dust audit <name>`).

#### Dustbucket (platform-level)

Dustbucket has multi-session infrastructure and fleet visibility. Could reason across repositories and coordinate strategic ideation centrally. However, this would make the feature unavailable to most dust users.

#### Both, with different scopes

Dust handles single-repo strategic ideation (the core feature). Dustbucket adds cross-repo awareness and scheduling (enhanced orchestration). This mirrors how `dust loop` works locally while `dust bucket` adds remote coordination.
