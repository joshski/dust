# Resolve .dust/Dockerfile vs .dust/config contract

Define and implement one canonical Docker configuration contract. The runtime still has `.dust/Dockerfile`-based behavior while migration direction points to `.dust/config/`.

This task is immediate and can be breaking if needed.

## Definition of Done

- Pick one canonical contract for Docker configuration and document it clearly.
- Update runtime detection/build logic to use the canonical contract only.
- Remove or intentionally migrate contradictory behavior and messages.
- Update linting rules and tests to match the canonical contract.
- Add a short migration note in docs/changelog.

## Blocked By

(none)
