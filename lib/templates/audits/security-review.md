# Security Review

Review the codebase for common security vulnerabilities and misconfigurations. Review existing ideas in `./.ideas/` and the recent history of `./.dust/ideas` to understand what has been proposed or considered historically, then create new idea files in `./.ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Hardcoded secrets** - API keys, passwords, tokens in source code
2. **Injection vulnerabilities** - SQL injection, command injection, XSS
3. **Authentication issues** - Weak password handling, missing auth checks
4. **Sensitive data exposure** - Logging sensitive data, insecure storage
5. **Dependency vulnerabilities** - Known CVEs in dependencies

## Blocked By

(none)

## Definition of Done

- [ ] Searched for hardcoded secrets (API keys, passwords, tokens)
- [ ] Reviewed input validation and sanitization
- [ ] Checked authentication and authorization logic
- [ ] Verified sensitive data is not logged or exposed
- [ ] Ran dependency audit for known vulnerabilities
- [ ] Documented any findings with severity ratings
- [ ] Proposed ideas for any security issues found
