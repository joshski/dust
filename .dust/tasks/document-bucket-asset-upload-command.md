# Document bucket asset upload command

Create a fact file documenting the `dust bucket asset upload` command, including its usage, constraints, and server API contract.

## Idea Description

Server implementations need concise documentation of the bucket asset upload command to understand the API contract and implement compatible endpoints.

## Principles

- [Easy Adoption](../principles/easy-adoption.md) - Clear documentation helps server implementers get started quickly

## Blocked By

(none)

## Definition of Done

- [ ] A new fact file exists at `.dust/facts/bucket-asset-upload.md`
- [ ] Documents the command usage: `dust bucket asset upload <file-path>`
- [ ] Documents authentication methods (env var, stored credential, browser flow)
- [ ] Documents file constraints (allowed extensions, max size)
- [ ] Documents the server API contract (endpoint, request format, response format)
