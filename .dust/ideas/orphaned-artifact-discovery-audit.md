# Orphaned artifact discovery audit

Audit `.dust/` for artifacts that nothing else links to. Unreferenced documentation is rarely discovered by agents and effectively does not exist.

## Background

[Augment Code's research on AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) measured documentation discovery rates: `AGENTS.md` is found 100% of the time, files explicitly referenced from it 90%+, same-directory `README.md` ~80%, nested `README` ~40%, and orphaned `_docs/` folders under 10%. Discovery, not authorship, is the bottleneck for agent-facing documentation.

Dust artifacts are addressable through `dust principles`, `dust facts`, etc., so they are not orphaned in the same way as unrelated documentation. But individual artifacts vary in how connected they are. Some facts and principles cross-link extensively; others sit alone with no inbound references. An agent navigating by following links will never reach the latter even though `dust facts` lists them.

Existing ideas like [audit-quality-audit](./audit-quality-audit.md) check audit-template references for stale paths. This idea is the inverse: find artifacts that have no inbound references at all.

## Proposed Solution

Add a stock audit (e.g., `orphaned-artifacts`) that builds an inbound-reference graph across `.dust/principles/`, `.dust/facts/`, and the repository's `AGENTS.md` / `CLAUDE.md` and any markdown in `.dust/config/`. For each artifact, count inbound markdown links and `dust <noun> <slug>`-style command references. Flag artifacts with zero inbound references.

The audit produces an idea per orphaned artifact suggesting one of three remedies:

1. Reference it from the most relevant principle, fact, or agent entry file.
2. Inline its content into a related artifact and delete the orphan.
3. Mark it as intentionally standalone (perhaps via a frontmatter flag) to suppress the warning.

## Principle Alignment

- [Repository Hygiene](../principles/repository-hygiene.md) — orphaned artifacts are a form of clutter
- [Context Window Efficiency](../principles/context-window-efficiency.md) — agents waste cycles searching when reachable artifacts are unconnected
- [Broken Windows](../principles/broken-windows.md) — once one artifact is orphaned, more drift in unnoticed

## Open Questions

### Should artifacts indexed by `dust facts` / `dust principles` be considered "referenced"?

#### Yes — being indexed counts

Every artifact is reachable via `dust facts` etc., so technically nothing is orphaned. The audit only flags artifacts with no *cross-artifact* links. Aligns with how dust commands work today.

#### No — only inter-artifact references count

The article's discovery numbers describe agents that follow links, not agents that run index commands. Treat indexing as table stakes; an artifact still needs at least one inbound link to be considered "discovered." Stricter, more aligned with the research.

### What kinds of links should count as inbound references?

#### Relative markdown links only

A link in the body of one artifact pointing at another file path. Simple and unambiguous.

#### Markdown links plus `dust <noun> <slug>` mentions

A fact saying "see `dust principle stop-the-line`" is a real reference, even if it isn't a markdown link. More representative but harder to parse reliably.

#### Markdown links, command mentions, plus plain-text title mentions

Even mentioning the title of another artifact suggests connection. Maximum recall but high false-positive rate.
