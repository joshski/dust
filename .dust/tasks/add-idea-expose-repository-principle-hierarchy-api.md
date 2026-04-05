# Add Idea: Expose repository principle hierarchy API

Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Add a public API that returns a repository's local principle hierarchy using a ReadableFileSystem rather than relying on CLI-only rendering logic. The API should read principles from the repository's .dust/principles tree, parse their parent-child relationships, and return a structured hierarchy suitable for CLI, library, and remote consumers. It should mirror the shape and ergonomics of existing hierarchy helpers where practical, but operate against repository content instead of bundled core principles. Consider a small exported function such as getPrincipleHierarchy(fileSystem, rootPath?) or similar, document the returned node shape clearly, and ensure it handles missing or invalid principle references with actionable errors that fit existing repository principles around testability, decoupling, and reusable code.

## Task Type

capture

## Blocked By

(none)


## Definition of Done

- One or more idea files are created in `.dust/ideas/`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
