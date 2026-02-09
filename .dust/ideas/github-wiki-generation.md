# GitHub Wiki Generation

A command to synchronize `.dust/` content to a repository's GitHub wiki, suitable for GitHub Actions.

## How GitHub Wikis Work

GitHub wikis are separate git repositories that can be cloned and pushed to programmatically:

```bash
git clone https://github.com/owner/repo.wiki.git
```

Key constraints:
- The wiki must be initialized first (create at least one page via the GitHub web UI)
- Wiki repos use the `.wiki.git` suffix on the main repo URL
- Markdown files in the wiki repo become wiki pages
- `Home.md` is the wiki landing page

## Implementation Approach

The command would:

1. Clone the wiki repository to a temporary directory
2. Transform `.dust/` content into wiki-friendly format:
   - Generate `Home.md` as an index/table of contents
   - Convert goals, facts, ideas, and tasks into linked wiki pages
   - Preserve or generate meaningful sidebar navigation (`_Sidebar.md`)
3. Commit and push changes to the wiki repo

## GitHub Actions Integration

Example workflow:

```yaml
name: Update Wiki
on:
  push:
    paths:
      - '.dust/**'
    branches: [main]

jobs:
  wiki:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - run: npx @joshski/dust generate github wiki
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `GITHUB_TOKEN` has sufficient permissions when `contents: write` is set.

## Existing Solutions

The [Update Wiki](https://github.com/marketplace/actions/update-wiki) GitHub Action already syncs a directory to a wiki, but requires the wiki to be cloned into the repo. A `dust generate github wiki` command could either:

- Generate files for use with that action
- Handle the full clone/transform/push workflow itself

## Open Questions

### Should the command support incremental updates or always regenerate?

#### Incremental updates

Only regenerate pages whose source files have changed. Faster for large projects but adds complexity tracking what changed.

#### Always regenerate

Simple and predictable. Regenerate all wiki pages on every run. Acceptable if the wiki is small.

### How should cross-references between dust files be handled?

#### Convert to wiki links

Transform internal markdown links to GitHub wiki link format so pages link to each other within the wiki.

#### Strip internal links

Remove or leave internal links as plain text, avoiding broken references.

### Should there be options to customize the generated structure?

#### Yes, via configuration

Allow users to configure which sections appear, page naming conventions, and sidebar layout.

#### No, use a fixed structure

Keep it simple with a single opinionated layout. Users can fork or post-process if needed.

### How to handle repos where the wiki hasn't been initialized?

#### Error with instructions

Detect the uninitialized state and print clear instructions for the user to create the first wiki page manually.

#### Auto-initialize

Attempt to create the wiki repository automatically if possible.
