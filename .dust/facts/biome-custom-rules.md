# Biome Custom Rules

Custom lint rules are written using [GritQL](https://docs.grit.io/tutorials/gritql), a declarative pattern matching language for code. Rules are stored in the `biome/` directory with the `.grit` extension.

Example: `biome/no-abbreviated-names.grit` enforces full variable names instead of abbreviations like `ctx`, `opts`, `err`.

## Key GritQL Concepts

- Backtick-enclosed patterns match code literally: `` `ctx` ``
- `register_diagnostic(span=$match, message="...")` reports violations
- `or { }` matches multiple patterns
- `$match` references the matched content
- `where { }` adds conditions to patterns

## Resources

- [Biome Plugin Configuration](https://biomejs.dev/linter/plugins/) - Configuring plugins in biome.json
- [Biome GritQL Reference](https://biomejs.dev/reference/gritql/) - Biome-specific GritQL docs
- [GritQL Tutorial](https://docs.grit.io/tutorials/gritql) - Getting started with GritQL
- [GritQL Patterns](https://docs.grit.io/language/patterns) - Pattern matching syntax
- [GritQL Syntax](https://docs.grit.io/language/syntax) - Full syntax reference
