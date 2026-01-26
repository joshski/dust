# Lint typescript

Use the latest version of biome.js with configuration something like this:

```
{
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "**",
      "!node_modules",
    ]
  },
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error"
      },
      "style": {
        "noParameterAssign": "error",
        "useAsConstAssertion": "error",
        "useDefaultParameterLast": "error",
        "useEnumInitializers": "error",
        "useSelfClosingElements": "error",
        "useSingleVarDeclarator": "error",
        "noUnusedTemplateLiteral": "error",
        "useNumberNamespace": "error",
        "noInferrableTypes": "error",
        "noUselessElse": "error"
      }
    }
  },
  "overrides": [
  ],
  "formatter": {
    "enabled": true,
    "useEditorconfig": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80,
    "attributePosition": "auto",
    "bracketSpacing": true
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "asNeeded",
      "arrowParentheses": "asNeeded",
      "bracketSameLine": false,
      "quoteStyle": "single",
      "attributePosition": "auto",
      "bracketSpacing": true
    }
  }
}
```

We will need to reformat the code accordingly, and add integrate biome into .dust/hooks/check

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- Biome.js is installed and configured for TypeScript linting
- Code is reformatted according to biome configuration
- Biome check is integrated into .dust/hooks/check
