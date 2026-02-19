# Context Window Efficiency

Dust should be designed with short attention spans in mind.

AI agents operate within limited context windows. Every token consumed by planning artifacts is a token unavailable for reasoning about code. Dust keeps artifacts concise and scannable so agents can quickly understand what needs to be done without wading through verbose documentation.

This means favoring brevity over completeness, using consistent structures that are fast to parse, and avoiding redundant information across files.

## Parent Principle

- [Agent Autonomy](agent-autonomy.md)

## Sub-Principles

- [Progressive Disclosure](progressive-disclosure.md)
