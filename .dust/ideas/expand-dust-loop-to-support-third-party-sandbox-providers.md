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

## Open questions

- Which providers should be supported first?
- How should authentication and billing be handled?
- Should results be synced back to the local repo automatically, or reviewed first?
- How does this relate to the existing Docker sandbox idea — should Docker be treated as just another provider?
