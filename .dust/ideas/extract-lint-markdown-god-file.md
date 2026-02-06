# Extract lint-markdown god file

`lib/cli/commands/lint-markdown.ts` is 682 lines with 15 exports. It mixes three architectural layers: domain logic, data transformation, and CLI command orchestration.

Splitting it would look like:

- `lib/markdown/validators/filename-validator.ts` - titleToFilename, validateFilename
- `lib/markdown/validators/content-validator.ts` - validateTaskHeadings, validateOpeningSentence, validateOpeningSentenceLength
- `lib/markdown/validators/link-validator.ts` - validateLinks, validateSemanticLinks
- `lib/markdown/validators/goal-hierarchy.ts` - extractGoalRelationships, validateBidirectionalLinks, validateNoCycles, validateGoalHierarchySections, validateGoalHierarchyLinks

Then `lint-markdown.ts` becomes pure CLI orchestration (~150 lines).
