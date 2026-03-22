# Audit: Ubiquitous Language

Verify terminology consistency across code, documentation, and user interface.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication. Do not modify source code - create ideas instead.

## Scope

Focus on these areas:

1. **Terminology drift** - Do recent changes introduce terms that deviate from established vocabulary?
2. **Code-to-docs alignment** - Are variables, functions, and types named consistently with documentation?
3. **User interface consistency** - Do UI labels and messages match the terms used in code and docs?
4. **Glossary adherence** - If a glossary exists, is it being followed?
5. **Acronym and abbreviation usage** - Are shortened forms used consistently?

## Factory/Constructor Naming

A specific case of terminology consistency: factory and constructor naming patterns.

Focus on high-confidence inconsistencies where equivalent creation APIs use different naming variants:
- `build*`, `create*`, `make*`, or `new*` prefixes for the same creation concept
- Cases where names differ but behavior and role clearly indicate the same concept

For each factory naming inconsistency, document:
- **Locations** - File paths and line numbers where inconsistent names appear
- **Inconsistent term set** - The observed naming variants (e.g., `createWidget`, `buildWidget`)
- **Canonical proposal** - The recommended canonical name and rationale
- **Migration strategy** - Incremental (aliases then cleanup) or one-shot (coordinated rename)

## Analysis Steps

1. Identify key domain terms from documentation, README, or existing glossary
2. Review recent commits for new terminology or naming choices
3. Compare code identifiers against documented terminology
4. Check user-facing strings for consistency with technical naming
5. Flag deviations where the same concept uses different names
6. Identify factory/constructor APIs using `build*`, `create*`, `make*`, or `new*` with equivalent behavior
7. Group factory naming findings by shared creation concept

## Output

For each terminology issue identified, provide:
- **Term in question** - The inconsistent or unclear term
- **Where found** - File paths and locations where the term appears
- **Recommended action** - Standardize on existing term, or propose a new canonical name

## Blocked By

(none)

## Definition of Done

- Identified key domain terms from project documentation
- Reviewed recent commits for terminology consistency
- Compared code naming against documentation vocabulary
- Checked user-facing text for alignment with code terms
- Reviewed factory/constructor naming for `build*`, `create*`, `make*`, `new*` consistency
- Documented any terminology drift or inconsistencies found
- Proposed ideas for standardizing inconsistent terminology
- No changes to files outside `.dust/`