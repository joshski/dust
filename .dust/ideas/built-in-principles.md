# Built-in principles

Make it easy for downstream users of dust to use dust's own principles as their own.

## Context

Dust ships with a comprehensive set of principles in `.dust/principles/` that guide development practices. These principles cover topics like:

- **Agent-AI collaboration**: Context-optimised code, agent autonomy, agent context inference
- **Code quality**: Small units, atomic commits, lint everything, co-located tests
- **Development workflow**: Fast feedback loops, lightweight planning, trunk-based development
- **Testing**: Comprehensive test coverage, test isolation, stubs over mocks

When users run `dust init` (`lib/cli/commands/init.ts:58-191`), the command creates an empty `.dust/principles/` directory. Users must then define their own principles from scratch, even though many of dust's principles are universally applicable.

Dust's principles are available in the dust repository but are not included in the npm package (`package.json:38-43` shows only `dist`, `bin`, and selected library files are published). There is no mechanism for downstream users to import or reference these principles.

## Proposed Solution

Provide a mechanism for downstream users to easily adopt dust's principles (in whole or in part) without manually copying files or maintaining a fork.

### Benefits

1. **Reduced friction**: New users get a curated set of battle-tested principles immediately
2. **Community alignment**: Teams using dust share a common vocabulary and set of expectations
3. **Principle evolution**: As dust's principles are refined, adopters benefit from improvements
4. **Customization**: Users can extend or override built-in principles as needed

### Considerations

The principle hierarchy design (`lib/artifacts/principles.ts:70-101`) uses relative markdown links to connect parent and child principles, which assume principles are local files. Any solution involving remote or built-in principles must handle these references.

## Open Questions

### How should built-in principles be distributed?

#### Option: Include in npm package

Add the `.dust/principles/` directory to the `files` array in `package.json`. Users could then reference or copy principles from `node_modules/@joshski/dust/.dust/principles/`.

Pros: Principles are always available locally, no network requests needed, version-locked to dust version.

Cons: Increases package size, principles are buried in `node_modules`, unclear how to "activate" them.

#### Option: Remote fetch on demand

Keep principles in the dust repository. Add a command (e.g., `dust init --with-principles` or `dust add-principles`) that fetches them from GitHub.

Pros: Package stays small, always gets latest principles, explicit user action.

Cons: Requires network access, version mismatch between dust CLI and fetched principles, GitHub rate limits.

#### Option: Symbolic reference system

Allow `.dust/principles/` to contain a marker file (e.g., `_uses_builtin_principles.json`) that tells dust to include built-in principles when listing or validating. Local principles override built-ins with the same slug.

Pros: Minimal storage, seamless integration, clear override semantics.

Cons: More complex implementation, principles don't appear in user's filesystem for browsing, may confuse agents reading the directory.

### Which principles should be available as built-ins?

#### Option: All dust principles

Export the entire principle tree. Users inherit the full hierarchy and can locally override any principle they disagree with.

Pros: Comprehensive, no curation needed, consistent with dust's own development.

Cons: Some principles are dust-specific (e.g., "VCS Independence", "Cross-Platform Compatibility") and may not apply to all projects.

#### Option: Curated subset

Identify principles that are universally applicable (testing, code quality, workflow) and exclude dust-specific ones.

Pros: Cleaner default experience, less noise for users.

Cons: Requires ongoing curation, subjective decisions about what's "universal".

#### Option: Categorized bundles

Create principle bundles (e.g., "testing", "agent-friendly", "code-quality") that users can selectively adopt.

Pros: Users pick what's relevant, modular adoption.

Cons: More complex UX, requires designing a bundle system.

### How should users customize or extend built-in principles?

#### Option: Override by slug

If a user creates `.dust/principles/atomic-commits.md`, it replaces the built-in `atomic-commits` principle entirely.

Pros: Simple mental model, familiar from CSS/configuration layering.

Cons: All-or-nothing replacement, no way to extend a principle.

#### Option: Extend via linking

Allow local principles to reference built-in parents. A user's custom principle could declare `## Parent Principle` as `builtin:atomic-commits`.

Pros: Enables extension without replacement, maintains hierarchy integrity.

Cons: New link syntax, more complex resolution logic.

#### Option: No customization of built-ins

Built-in principles are read-only. Users can add new principles but not modify built-ins. To customize, users must "eject" (copy to local) first.

Pros: Clear separation, built-in integrity preserved.

Cons: Less flexible, friction for users who want minor modifications.

### Should `dust init` automatically include built-in principles?

#### Option: Opt-in flag

`dust init` creates an empty principles directory by default. Users run `dust init --with-built-in-principles` or a separate command to adopt them.

Pros: Doesn't surprise existing users, explicit choice.

Cons: Many users won't discover the feature.

#### Option: Interactive prompt

During `dust init`, ask: "Would you like to use dust's built-in principles? (y/n)"

Pros: Discoverable, user makes conscious choice.

Cons: Adds friction, doesn't work with autonomous agents.

#### Option: Default to built-in

`dust init` automatically enables built-in principles. Users can opt out via `dust init --no-built-in-principles` or by removing the configuration.

Pros: Best practices by default, consistent with "make the right thing easy".

Cons: May surprise users who expect a blank slate.
