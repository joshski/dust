# Implement Link Validator

Create a validator that checks all relative links across all Dust markdown files.

## Goals

- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

A script or program exists that:
- Finds all markdown files in `.dust/` directories
- Extracts all relative markdown links from each file
- Validates each link resolves to an existing file
- Reports broken links with file and line number
- Exits with non-zero status if any broken links are found
