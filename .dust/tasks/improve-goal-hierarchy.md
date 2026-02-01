# Improve Goal Hierarchy

Reorganize the goal hierarchy to better reflect the logical relationships between goals. The current structure has several placements that don't align with the actual content and purpose of the goals.

## Changes

### 1. Move Atomic Commits from Lightweight Planning to Repository Hygiene

**Why:** The "Atomic Commits" goal describes clean commit history, archaeology, and self-documenting repository state. These are fundamentally about Repository Hygiene, not Lightweight Planning. The current placement is tangential at best.

**Files to update:**
- `.dust/goals/atomic-commits.md`: Change Parent Goal from `Lightweight Planning` to `Repository Hygiene`
- `.dust/goals/lightweight-planning.md`: Remove `Atomic Commits` from Sub-Goals section
- `.dust/goals/repository-hygiene.md`: Add `Atomic Commits` to Sub-Goals section

### 2. Move Clarity Over Brevity from Intuitive Directory Structure to Maintainable Codebase

**Why:** The "Clarity Over Brevity" goal content discusses naming conventions for variables and code (`ctx`, `deps`, `fs`, `args`), not directory structure. This principle applies across the entire codebase, not just directory names. It deserves to be elevated as a direct sub-goal of Maintainable Codebase.

**Files to update:**
- `.dust/goals/clarity-over-brevity.md`: Change Parent Goal from `Intuitive Directory Structure` to `Maintainable Codebase`
- `.dust/goals/intuitive-directory-structure.md`: Remove `Clarity Over Brevity` from Sub-Goals section (change to `(none)`)
- `.dust/goals/maintainable-codebase.md`: Add `Clarity Over Brevity` to Sub-Goals section

### 3. Add cross-reference note in Small Units for Lightweight Planning

**Why:** The "Small Units" goal directly supports Lightweight Planning (which explicitly mentions "Tasks are small and completable in single commits"). While the system uses single-parent hierarchy, adding a note about this relationship provides valuable context.

**Files to update:**
- `.dust/goals/small-units.md`: Add a note mentioning the relationship to Lightweight Planning

### 4. Add cross-reference note in Agent Agnostic for Easy Adoption

**Why:** Supporting multiple agents directly contributes to easy adoption since teams can use their preferred agent tools. This relationship deserves acknowledgment.

**Files to update:**
- `.dust/goals/agent-agnostic.md`: Add a note mentioning the relationship to Easy Adoption

## Goals

- [Maintainable Codebase](../goals/maintainable-codebase.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] Atomic Commits goal has Repository Hygiene as its parent
- [ ] Lightweight Planning no longer lists Atomic Commits as a sub-goal
- [ ] Repository Hygiene lists Atomic Commits as a sub-goal
- [ ] Clarity Over Brevity goal has Maintainable Codebase as its parent
- [ ] Intuitive Directory Structure no longer lists Clarity Over Brevity as a sub-goal
- [ ] Maintainable Codebase lists Clarity Over Brevity as a sub-goal
- [ ] Small Units contains a note about its relationship to Lightweight Planning
- [ ] Agent Agnostic contains a note about its relationship to Easy Adoption
- [ ] `bin/dust goals` shows the updated hierarchy
- [ ] `bin/dust lint markdown` passes
