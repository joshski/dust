# Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

## Parent Principle

- [Maintainable Codebase](maintainable-codebase.md)

## Sub-Principles

- (none)
