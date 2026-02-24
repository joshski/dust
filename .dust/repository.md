# Dust

Dust is a planning and workflow tool for AI-assisted software development. It gives coding agents a structured way to manage the full lifecycle of ideas, tasks, and quality checks within a repository. The tagline is "flow state for AI coding agents".

## What It Does

Dust maintains a `.dust/` directory in a repository containing planning artifacts — principles, ideas, tasks, and facts — all as simple markdown files. A CLI (`dust`) lets agents and humans create, query, and act on these artifacts. The tool is installed as an npm package and invoked via `dust <command>`.

The core insight is that AI coding agents work best when they have structured context: clear goals, defined scope, quality gates, and background knowledge. Dust provides this structure while keeping everything human-readable and version-controlled.

## Planning Artifacts

Dust organises project knowledge into four artifact types that form a progression from stable and abstract to volatile and concrete:

### Principles

Principles are the team's documented values and standards. They express how the team wants to work — things like "decoupled code", "fast feedback", "actionable errors", or "reasonably DRY". Tasks and audits can reference principles to explain why certain work matters.

Principles are organised in a single-parent tree hierarchy with one root principle at the top. Higher-priority principles take precedence when they conflict. Each principle file declares its parent and sub-principles, forming a navigable tree. When a principle has significant secondary relationships beyond its parent, these are captured as prose notes rather than structural links.

### Ideas

Ideas are lightweight proposals for future work. They capture observations, improvement suggestions, or feature concepts without committing to implementation. An idea might be "add caching to the API" or "consolidate error handling patterns" — something worth considering but not yet scoped into work.

Ideas go through a lifecycle managed by workflow tasks. An idea can be refined (researched further), decomposed (broken into concrete tasks), or shelved (archived as no longer relevant). Each transition creates a dedicated task that guides the agent through the process. Ideas accumulate over time and are periodically reviewed for staleness via audits.

### Tasks

Tasks are concrete units of work with a defined scope and a "Definition of Done" checklist. Each task is a markdown file containing a description of what to do, which principles it supports, what other tasks block it, and a checklist of completion criteria.

Tasks support dependencies — one task can block another — and the system uses this to determine what's ready to work on next. The `dust next` command finds the highest-priority unblocked task. Tasks move through a lifecycle: they're created, picked up by an agent, implemented, verified by checks, and moved to a `done/` directory.

### Facts

Facts are verified statements about the current state of the codebase. They document technical decisions, implementation details, conventions, and architectural choices that agents need to know. Examples include "the project uses Bun as its runtime", "tests use Vitest", or "the CLI follows the Commander.js pattern".

Facts serve as a lightweight, always-current knowledge base. They're kept accurate as the project evolves — outdated facts are updated or removed. Unlike documentation that might go stale, facts are treated as living artifacts that are actively maintained.

## Audits

Audits are repeatable review templates that generate tasks when run. Each audit focuses on a specific quality concern — security vulnerabilities, test coverage gaps, dead code, error handling consistency, performance issues, terminology drift, and more.

Dust ships with a library of stock audits covering common concerns. Projects can also define custom audits by placing markdown files in `.dust/config/audits/`, which take precedence over stock audits with the same name. Running an audit creates a task file with a structured scope, analysis steps, and a completion checklist, which an agent then works through.

Audits are designed to be run periodically. They often generate ideas for improvement, which feed back into the planning cycle. Some audits review the dust artifacts themselves — checking whether facts are still accurate, whether ideas have gone stale, or whether principles are being followed.

## Agent Loop and Automation

Dust provides two levels of autonomous agent operation:

The `dust agent` command is the inner loop. It picks the next available task (respecting dependencies), presents it to the coding agent with full context, and lets the agent implement the changes. After implementation, checks run to verify correctness, and the agent commits the result.

The `dust loop` command is the outer loop. It runs the agent repeatedly, pulling from git between iterations, picking up tasks, and sleeping when no work is available. This enables continuous, hands-off progress on a backlog of well-defined tasks. The loop supports both Claude Code and OpenAI Codex as agent backends.

Because autonomous agents can modify files and execute code, dust recommends running loops in sandboxed environments.

## Checks and Quality Gates

Projects configure checks in `.dust/config/settings.json` — typically test suites, linters, type-checkers, and build commands. Each check has a name, a shell command, and optional failure hints that help agents diagnose issues.

Checks run in parallel before a task is considered complete, ensuring that agent-produced changes meet the project's quality bar. The built-in `dust lint` command also runs as part of checks, validating that all dust artifacts follow the expected structure (correct headings, valid cross-references, proper naming conventions). The `dust pre-push` command can run checks as a git hook.

## Focus Mode

The `dust focus` command generates a context document scoped to a specific task. It pulls together the task description, relevant principles, related facts, and other artifacts into a single document. This gives an agent a focused starting point — everything it needs to understand the work without exploring the entire codebase from scratch.

## Idea Workflow

Ideas have a structured workflow for transitioning them into action. When an idea is ready to be acted on, dust can create workflow tasks to:

- **Refine** an idea — research it further, gather more context, clarify scope
- **Decompose** an idea — break it into one or more concrete, implementable tasks
- **Shelve** an idea — archive it with a rationale when it's no longer relevant

Each workflow task links back to the original idea and includes structured guidance for the agent performing the transition. The system tracks which ideas already have workflow tasks to prevent duplication.

## Bucket (Remote Orchestration)

The `dust bucket` command connects to a remote server (dustbucket) via WebSocket, enabling centralised management of multiple repositories. The server sends repository lists and task notifications; the client clones repositories, starts agent loops, and reports progress back via events.

This supports a scenario where a team manages many repositories from a central dashboard, with agents autonomously working on tasks across the fleet. The protocol includes authentication via browser-based OAuth, automatic reconnection with backoff, and real-time event streaming.

## Eval Framework

Dust includes an eval framework for testing whether AI agents respond correctly to prompts in dust-managed projects. Each eval defines a prompt, a setup script that creates an isolated test environment, and an expectation of what the agent should do.

Evals are semantically evaluated — a smaller model judges whether the agent's behaviour matched the intent, rather than checking for exact string matches. This validates that changes to agent prompts and workflows don't break expected behaviour.

## Artifact Validation

Dust validates its own artifacts through a linting system. The `dust lint` command checks that all markdown files in `.dust/` follow the expected structure: tasks have required headings, links resolve to real files, principles maintain valid parent-child relationships, and naming conventions are followed.

A patch validation API is also available for external integrations. It can validate proposed artifact changes against existing content before they're applied, catching structural issues early.

## How It Fits Into a Workflow

A typical cycle looks like: capture ideas → run audits to find more ideas → refine ideas into tasks → prioritise → implement tasks with agent assistance → verify with checks → commit. Dust provides the scaffolding for each of these steps, keeping planning artifacts version-controlled alongside the code they describe.

The system is designed to be self-improving. Audits surface issues, which become ideas, which become tasks, which improve the codebase — and the next round of audits reflects that progress.

## Design Philosophy

- **Markdown-first** — all artifacts are human-readable markdown files, no databases or proprietary formats
- **Agent-friendly** — designed for AI coding agents to consume and produce, with structured formats that are easy to parse
- **Convention over configuration** — sensible defaults with optional customisation via `.dust/config/`
- **Incremental adoption** — `dust init` bootstraps the directory structure, individual features are opt-in
- **Version-controlled planning** — planning artifacts live alongside code in git, so they evolve together and have full history
- **Self-improving** — audits and reviews feed back into the planning cycle, creating a continuous improvement loop
- **Artifact progression** — principles (stable, abstract) → facts (current state) → ideas (proposals) → tasks (concrete work) forms a natural flow from values to action
