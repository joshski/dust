# Hierarchical Dust Directories

The current advice that `.dust/` subdirectories should be flat may be too restrictive. Allowing hierarchy within `goals/`, `ideas/`, `tasks/`, and `facts/` directories would enable better organization for repositories with multiple concerns.

For example, this repository serves dual purposes:
- Defining the dust planning system itself
- Being used as a tool by downstream repositories

Goals for the dust system (like "simple flat-file format") differ from goals for users of dust (like "effective AI collaboration"). Hierarchy allows this:

```
.dust/
├── goals/
│   ├── dust-system/      # Goals for dust itself
│   └── downstream/       # Goals for users of dust tools
├── ideas/
│   ├── dust-system/
│   └── downstream/
```

This separation makes it clearer which artifacts belong to which concern, and prevents confusion when a repository has multiple stakeholder perspectives.

Note: The flat directory rule is currently mentioned in several places including the README and the `dust-directory-structure` fact. These would need to be updated to reflect any relaxation of this constraint.
