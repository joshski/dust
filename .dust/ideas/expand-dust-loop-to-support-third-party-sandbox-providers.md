# Expand dust loop to support third-party sandbox providers

Run each `dust loop` iteration in a cloud sandbox like Daytona or Sprites.dev.

## Motivation

Docker-based sandboxing (see `dust-loop-docker.md`) provides local isolation, but cloud sandbox providers offer additional benefits:

- **Zero local setup**: No Docker install required; sandboxes run remotely
- **Scalable resources**: Cloud sandboxes can offer more CPU/memory than the local machine
- **Pre-built environments**: Providers like Daytona support dev container specs and language-specific stacks out of the box
- **Collaboration-friendly**: Remote sandboxes can be shared or inspected by teammates

## Possible implementation

- Add a `--sandbox` flag (or similar) to `dust loop` that accepts a provider name (e.g., `dust loop --sandbox daytona`)
- Each provider would implement a common interface: create sandbox, run iteration, retrieve results, tear down
- Provider adapters could be plugged in, keeping the core loop logic provider-agnostic

## Open Questions

### Which providers should be supported first?

#### Daytona

Mature dev container support and open-source tooling make it a natural first target.

#### Sprites.dev

Cloud-native sandbox with fast spin-up times, good for quick iterations.

### How should authentication and billing be handled?

#### User-managed credentials

Users configure their own API keys per provider, keeping dust out of the billing relationship.

#### Integrated auth flow

Dust handles the OAuth/auth flow and proxies requests, simplifying setup at the cost of complexity.

### Should results be synced back to the local repo automatically, or reviewed first?

#### Auto-sync

Push results directly to the local branch for seamless workflow continuity.

#### Review first

Present a diff or PR for review before merging remote sandbox results into the local repo.

### Should Docker be treated as just another provider?

#### Yes, unify under provider interface

Refactor the Docker sandbox to implement the same provider interface, giving a consistent abstraction.

#### No, keep Docker separate

Docker is a local-first concern with different trade-offs; keep it as a distinct code path.
