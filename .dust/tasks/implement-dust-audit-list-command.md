# Implement dust audit list command

Implement the `dust audit` command (with no arguments) that lists available audit templates. The command should display audits from two sources:

1. **User-configured audits** in `.dust/config/audits/*.md` (takes precedence)
2. **Stock audits** from a hardcoded list in the codebase

Output format should follow the existing list command style:

```
🔍 Audits

Audits are canned tasks that help maintain project health.

# security-review
Check for common security issues in the codebase.
→ stock

# test-coverage
Identify areas with missing test coverage.
→ .dust/config/audits/test-coverage.md
```

The arrow indicates whether the audit comes from stock (bundled) or from user configuration. If a user-configured audit has the same name as a stock audit, the user version takes precedence and is shown.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust audit` command is registered in `lib/cli/main.ts`
- [ ] Command reads user audits from `.dust/config/audits/*.md`
- [ ] Command reads stock audits from a hardcoded list in the codebase
- [ ] User audits take precedence over stock audits with the same name
- [ ] Output displays each audit's name, description, and source
- [ ] Unit tests cover user audits, stock audits, and precedence behavior
