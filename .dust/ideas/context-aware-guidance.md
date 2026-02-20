# Context aware guidance

Agents need more guidance when working in repositories with few established features or on ambitious scope.

## Context

The dust system currently treats all ideas and tasks uniformly regardless of repository maturity or feature scope. An agent working in a fresh repository with no established patterns has the same instructions as one working in a mature codebase with hundreds of files. Similarly, an ambitious multi-feature request gets the same treatment as a small bug fix.

The existing `createCaptureIdeaTask` function in `lib/artifacts/workflow-tasks.ts:274-350` generates task content that instructs agents to "research this idea thoroughly" but doesn't vary its guidance based on:
- Repository maturity (new vs established)
- Feature scope (ambitious vs incremental)
- Existing patterns (presence or absence of tech stack decisions)

The [Lightweight Planning](../principles/lightweight-planning.md) principle states that "Ideas are intentionally vague until implementation is imminent" and the [Small Units](../principles/small-units.md) principle emphasizes discrete, fine-grained artifacts. However, there's a gap: when an agent receives an ambitious prompt like "Make a roguelike game" in an empty repository, nothing currently prevents it from making sweeping decisions about tech stack, architecture, and implementation details without consulting the human.

Related ideas:
- [Allow "analysis depth" when adding an idea](allow-analysis-depth-when-adding-an-idea.md) explores varying research depth based on a parameter
- [Capture "Complexity Estimate" in tasks](capture-complexity-estimate-in-tasks.md) considers adding metadata to inform model selection
- [Abandon tasks that are too hard](abandon-tasks-that-are-too-hard.md) addresses what happens when a task exceeds agent capacity

## How it could work

When an agent encounters an ambitious feature request in a repository with limited established context, the agent instructions would guide it to:

1. Create an idea file that captures the request
2. Add leading questions to establish human preferences before implementation
3. Identify a minimal initial step that can be built immediately
4. Defer larger scope decisions until preferences are established

The key insight is that "context awareness" could mean either:
- The dust system automatically detecting maturity/scope and adjusting behavior
- Agent instructions that teach agents to recognize these situations and respond appropriately
- A combination where dust surfaces context signals and agents interpret them

## Open Questions

### How should repository maturity be detected?

#### File count and structure analysis

The system could count files, check for package.json/config files, analyze directory structure depth, or look for established patterns. A repository with 5 files is treated differently than one with 500 files.

Pros: Objective, automatable
Cons: File count is a crude proxy; a repo could have many files but no clear patterns, or few files with strong conventions

#### Presence of dust artifacts

Maturity could be measured by the number of existing principles, facts, and ideas. A repository with 20 principles has established conventions; one with 2 is still finding its shape.

Pros: Directly relevant to dust workflow; already structured
Cons: Doesn't capture patterns outside dust artifacts (e.g., code style, test conventions)

#### Let the agent assess maturity

Rather than algorithmic detection, agent instructions could guide the agent to assess maturity through codebase exploration and adjust its approach accordingly.

Pros: Flexible, captures nuance that heuristics miss
Cons: Depends on agent judgment; may be inconsistent

### Should ambitious features be detected or declared?

#### Automatic scope detection

The system analyzes the idea description to estimate scope (e.g., keyword matching for "build a complete...", "implement full...", presence of multiple features in one description).

Pros: No friction for users; works automatically
Cons: Hard to get right; may misclassify simple requests as ambitious or vice versa

#### Explicit flag when adding an idea

Users or agents declare scope explicitly when creating an idea, similar to the `buildItNow` flag or the proposed `analysisDepth` in [Allow "analysis depth" when adding an idea](allow-analysis-depth-when-adding-an-idea.md).

Pros: Explicit intent; user controls the workflow
Cons: Adds friction; users may not know how to classify their request

#### Agent assessment during research

The agent determines scope during the research phase and adjusts its approach. If research reveals the feature is ambitious, the agent switches to a questioning/scoping mode.

Pros: Natural workflow; scope becomes clear through exploration
Cons: Agent may have already started down an implementation path before recognizing scope

### What does "leading questions" mean concretely?

#### Open questions in the idea file

The agent creates an idea file with an `## Open Questions` section that asks about tech stack, architecture, and user preferences. This matches the existing pattern for ambiguity.

Pros: Consistent with current dust conventions; humans can answer via decompose workflow
Cons: Questions live in a file that requires workflow steps to resolve

#### Inline questions in the agent's response

The agent asks questions directly in its response to the user, getting immediate feedback before creating any files.

Pros: Interactive; fast feedback loop
Cons: Not captured in dust artifacts; loses traceability

#### A new "scope discovery" task type

A new workflow task type specifically for establishing scope on ambitious features. The task's definition of done includes establishing key preferences before decomposition.

Pros: Explicit workflow step; clear purpose
Cons: Adds complexity; may feel like bureaucracy for simple cases

### Where should this guidance live?

#### In agent instructions (dust agent output)

The `dust agent` command's output would include guidance about assessing repository maturity and feature scope, teaching agents to recognize these situations.

Pros: Applies to all agents; no code changes to task creation
Cons: Instructions can be ignored; adds to instruction length

#### In task file templates

The task templates in `lib/artifacts/workflow-tasks.ts` would include conditional guidance based on detected context signals.

Pros: Guidance is directly in the task the agent is working on
Cons: Requires passing context signals through the task creation pipeline

#### Separate guidance documents

New principles or facts that describe how to handle immature repositories and ambitious features. Agents reference these during their work.

Pros: Follows existing dust patterns; easy to evolve
Cons: Agents may not consult these documents proactively
