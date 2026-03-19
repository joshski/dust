# Test Tool Execution Forwarding

Add unit tests for `forwardToolExecution` in `bucket-worker.ts` to verify request construction and response handling.

## Context

The `forwardToolExecution` function (lines 1182-1276) builds tool execution requests and handles responses. It's excluded from coverage because testing requires a connected WebSocket. However, the function contains significant logic:

- Converting positional arguments to named arguments using tool definitions
- Reading files and encoding them as base64 for file-type parameters
- Handling timeout and error cases
- Mapping wire protocol results to proxy result format

This logic can be tested by injecting a stub WebSocket.

## Implementation

1. Extract the argument conversion logic into a testable pure function
2. Create a WebSocket stub that captures sent messages and emits responses
3. Write tests that verify:
   - Positional-to-named argument conversion
   - File parameter handling (base64 encoding)
   - Timeout behavior
   - Error case handling (WebSocket not connected, send failure)
   - Response type mapping (success, tool-not-found, error)

## Out of Scope

- Actual WebSocket communication
- Server-side tool execution
- The tool result callback wiring (lines 1315-1380)

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- Argument conversion logic is extracted and tested
- `forwardToolExecution` is testable with stubbed WebSocket
- Coverage exclusion removed or reduced for tool execution code
- `bin/dust check` passes
