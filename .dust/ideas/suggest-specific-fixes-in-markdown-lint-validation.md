# Suggest specific fixes in markdown lint validation

Enhance lint violation messages to include specific fix suggestions, so users (and AI agents) can resolve issues without consulting documentation.

Currently, most validation errors describe what's wrong but not how to fix it. For example, `Missing required heading: "## Goals"` tells you what's missing but not where to put it or what format the section should have. The one exception is the Open Questions bullet-point violation, which already suggests running `dust new idea` to see the expected format.

This idea aligns with the [Actionable Errors](../principles/actionable-errors.md) goal: error messages should provide specific guidance on how to fix the problem.

## Candidates for Fix Suggestions

### Validators that currently lack fix guidance

- **`validateFilename`** — Could show the expected filename derived from the title, or explain slug-style rules (lowercase, hyphens, no spaces).
- **`validateOpeningSentence`** — Could explain what a valid opening sentence looks like (plain text, ends with `.`/`?`/`!`, appears after the H1).
- **`validateImperativeOpeningSentence`** — Already includes an example (`"Add X" not "This adds X"`), but could suggest a rewrite based on the actual first word found.
- **`validateTaskHeadings`** — Could show a minimal valid task file skeleton with the missing heading(s).
- **`validateGoalHierarchySections`** — Could show a minimal valid goal file skeleton.
- **`validateLinks`** (broken links) — Could list similar filenames in the target directory as "did you mean?" suggestions.
- **`validateSemanticLinks`** — Could explain the expected link format (e.g., relative path to a file in the correct directory).
- **`validateBidirectionalLinks`** — Could show the exact line to add in the other file.
- **`validateIdeaOpenQuestions`** (question has no options) — Could show the expected structure with `####` option headings beneath the question.

### Validators that already have decent guidance

- **`validateOpeningSentenceLength`** — Already suggests splitting into multiple sentences.
- **`validateIdeaOpenQuestions`** (bullet points) — Already references `dust new idea`.
- **`validateIdeaOpenQuestions`** (question mark) — Already shows an example question format.

## Open Questions

### Should fix suggestions be inline in the message or printed separately?

#### Inline in the violation message

Keep everything in the `message` field of the `Violation` struct. Simpler implementation, and the fix context appears right next to the error. May make messages long.

#### Add a separate `fix` field to the Violation struct

Add an optional `fix: string` field to `Violation`. The formatter can then display it distinctly (e.g., indented or prefixed with "Fix:"). Cleaner separation of concern, but requires changing the Violation interface and the output formatter.

### How specific should "did you mean?" suggestions be for broken links?

#### Fuzzy match against existing filenames

Search the target directory for similar filenames using edit distance or substring matching. More helpful but adds complexity and a potential performance cost.

#### Just show the directory listing

Print the available files in the target directory so the user can pick the right one. Simpler but noisier for directories with many files.

#### No "did you mean?" — just clarify the expected path format

Explain the path convention (e.g., relative paths from the current file) without guessing. Keeps it simple and avoids false suggestions.

### Should we generate fixable patches or just textual suggestions?

#### Textual suggestions only

Just improve the error messages with human-readable fix guidance. Simplest approach and sufficient for both humans and AI agents.

#### Generate code-fixable patches

Return structured fix data (e.g., line number, replacement text) that could power an auto-fix command. More powerful but significantly more complex, and may be premature.
