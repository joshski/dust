# Make bin/dust Tiny

Refactor `bin/dust` to be as minimal as possible by extracting logic into a library function.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- `bin/dust` contains only the minimal code needed to import and call a main function
- All command routing, help text, and filesystem adapter setup is moved into a library module
- The extracted code is covered by tests
