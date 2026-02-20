# Add Naming Matters Principle

Create a new principle `naming-matters.md` that articulates why clear and consistent naming reduces waste in software development.

## Background

The codebase currently has two naming-related principles in different parts of the hierarchy:
- `consistent-naming.md` (under Repository Hygiene) - following conventions
- `clarity-over-brevity.md` (under Maintainable Codebase) - descriptive names

A unifying "Naming Matters" principle can serve as a parent for both, capturing the broader truth: good naming reduces waste by eliminating confusion, reducing misunderstandings, and making code self-documenting.

## Implementation

1. Create `.dust/principles/naming-matters.md` with:
   - Title: "Naming Matters"
   - Description emphasizing waste reduction: poor names cause rework, bugs, and communication overhead
   - Parent Principle: Maintainable Codebase
   - Sub-Principles: Consistent Naming, Clarity Over Brevity

2. Update `.dust/principles/consistent-naming.md`:
   - Change Parent Principle from Repository Hygiene to Naming Matters

3. Update `.dust/principles/clarity-over-brevity.md`:
   - Change Parent Principle from Maintainable Codebase to Naming Matters

4. Update `.dust/principles/maintainable-codebase.md`:
   - Remove Clarity Over Brevity from Sub-Principles
   - Add Naming Matters to Sub-Principles

5. Update `.dust/principles/repository-hygiene.md`:
   - Remove Consistent Naming from Sub-Principles

## Principles

- [Maintainable Codebase](../principles/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] New `naming-matters.md` principle exists with proper structure
- [ ] `consistent-naming.md` has Naming Matters as parent
- [ ] `clarity-over-brevity.md` has Naming Matters as parent
- [ ] `maintainable-codebase.md` lists Naming Matters as sub-principle
- [ ] `repository-hygiene.md` no longer lists Consistent Naming
- [ ] `bin/dust check` passes
- [ ] Principle hierarchy displays correctly in `bin/dust principles`
