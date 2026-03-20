# Batteries Included

Dust should provide everything that is required (within reason) for an agent to be productive in an arbitrary codebase.

An agent working autonomously should not be blocked because a tool or configuration is missing. For example, dust should ship custom lint rules for different linters, even though those linters are not dependencies of dust itself. If an agent needs a capability to do its job well in a typical codebase, dust should provide it out of the box.

This means accepting some breadth of scope — bundling configs, rules, and utilities that target external tools — in exchange for agents that can start producing useful work immediately without manual setup.

## Applicability

Internal

## Parent Principle

- [Agent Autonomy](agent-autonomy.md)

## Sub-Principles
