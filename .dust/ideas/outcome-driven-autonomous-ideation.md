# Outcome-Driven Autonomous Ideation

Introduce "outcomes" as a new artifact type representing what the project aims to achieve. Agents would periodically reflect on outcomes, principles, and facts to propose strategic ideas that bridge the gap between current state and desired outcomes — without requiring low-level human prompting.

Currently, principles define *how* to work but not *what to achieve*. Audits like "ideas from principles" are tactical (find violations) rather than strategic (propose direction). An outcome like "onboarding takes < 5 minutes" gives agents something to reason toward, generating ideas that are larger in scope and more architecturally significant than principle-violation fixes.

The idea refinement phase becomes the place for "big design up front" — ideas can span multiple sessions, accumulating depth through repeated refinement before being decomposed into single-commit tasks. This preserves lightweight planning at the task level while allowing ambitious planning at the idea level.

## Resolved Decisions

- **Artifact type name:** Outcomes (directory: `.dust/outcomes/`)
- **Hierarchy:** Flat list (no parent-child relationships)
- **Triggering strategize:** Periodically on a schedule during `dust loop`
- **Scope:** Dust CLI-level feature (not dustbucket-only)

## Relationship to Existing Artifacts

The current artifact progression is: principles (stable/abstract) → facts (current state) → ideas (proposals) → tasks (concrete work). Outcomes add a fifth level that represents *what we want to achieve* rather than *how we work*:

```
outcomes → principles → facts → ideas → tasks
```

This mirrors how the `ideas-from-principles` audit works today, but at a higher level. Where that audit finds principle violations and proposes tactical fixes, a "strategize" activity would read outcomes and propose strategic initiatives.

## Implementation Elements

1. **Outcome artifact type** — A new `.dust/outcomes/` directory with human-authored desired outcomes. Each outcome is a markdown file with a title, opening sentence (success criteria or measurable target), and optional elaboration. Follows the same pattern as facts (simplest artifact type: slug, title, content).

2. **`dust outcomes` command** — Lists outcomes similar to `dust principles` and `dust facts`.

3. **Strategize audit** — A new stock audit (`ideas-from-outcomes` or `strategize`) that reads outcomes + principles + facts and proposes ideas that would advance the project toward its outcomes. Added to `lib/audits/stock-audits.ts`.

4. **Periodic scheduling** — Configuration in `.dust/config/settings.json` to run strategize automatically during `dust loop` at a specified interval (e.g., `{ "strategizeIntervalIterations": 10 }`). The loop would create a strategize audit task after N completed task iterations.

5. **Idea-to-outcome tracing** — Ideas generated from strategize link back to the outcome(s) they serve, allowing humans to evaluate proposals in context. This could use a new `## Outcomes` section in idea files, following the existing `## Principles` pattern.

## Example Outcomes for Dust

These illustrate how outcomes differ from principles — they are measurable targets rather than working standards:

- **Onboarding under 5 minutes** — A developer can adopt dust in an existing repository and have an agent complete a task within 5 minutes of first contact.
- **Zero-configuration check pipeline** — Running `dust check` in any repository produces useful feedback without manual configuration.
- **Agent completes 80% of tasks autonomously** — Given a well-formed task, an agent succeeds without human intervention four out of five times.
- **Sub-second command latency** — All `dust` CLI commands complete in under one second for typical repositories.
- **Cross-agent compatibility** — Any LLM-based coding agent can use dust effectively with only the generic AGENTS.md instruction.

## Open Questions

### How should outcomes be authored and maintained?

#### Human-authored only

Outcomes are written and maintained exclusively by humans. This ensures outcomes reflect genuine project direction rather than agent speculation. The agent's role is to propose ideas that serve existing outcomes, not to propose outcomes themselves.

#### Agent can propose outcomes for human approval

Agents could propose new outcomes during strategize, which humans review and approve. This enables discovery of implicit goals the human hadn't articulated. However, it blurs the line between strategic direction (human domain) and tactical execution (agent domain).

### Should strategize run automatically or require explicit activation?

#### Auto-schedule during loop with config

Add a `strategizeIntervalIterations` setting. The loop creates a strategize task automatically every N completed task iterations. This follows the "periodically on a schedule" decision but requires implementation in the loop.

#### Manual audit command only

Keep strategize as a regular audit (`dust audit strategize`) that humans invoke when they want strategic ideation. Simpler to implement and avoids noise, but requires human prompting — which contradicts the "autonomous ideation" goal.

#### Both, with auto-scheduling off by default

Implement the config option but default it to disabled (or a very high interval like 100). Users who want autonomous strategizing can enable it. This preserves the audit pattern while allowing opt-in automation.

### What scope constraints should strategize have?

#### Single-commit scope

Proposed ideas should be achievable in a single commit, matching the existing task model. This keeps ideas tractable but may exclude larger initiatives.

#### Multi-commit scope allowed

Ideas can span multiple commits and require decomposition before execution. This enables ambitious proposals but means strategize output requires more processing before becoming work.

#### Tiered scope

Strategize proposes a mix: some single-commit improvements and some multi-commit initiatives. Ideas are tagged with scope (quick/medium/large) so humans can filter based on appetite.
