# Configuration Builder Pattern

Unify configuration loading from multiple sources using a builder pattern for clearer composition and precedence.

## Current State

Configuration is loaded from multiple sources with logic scattered across files:

```typescript
// lib/env-config.ts — environment variables
export function readEnvConfig(env: NodeJS.ProcessEnv): EnvConfig { ... }

// lib/config/settings.ts — file-based + detection
export function detectDustCommand(...): string { ... }
export function detectInstallCommand(...): string | null { ... }
export function detectTestCommand(...): string | null { ... }
export function loadSettings(...): Promise<DustSettings> { ... }
```

`loadSettings` in [`lib/config/settings.ts`](../../lib/config/settings.ts) has three code paths with duplication:
1. No settings file — builds defaults, applies env override
2. Settings file parsed — merges config, applies env override
3. ENOENT during read — builds defaults (identical to path 1), applies env override

The env override logic (`DUST_EVENTS_URL`) is duplicated at lines 359, 389, and 403.

## Proposed Pattern

Use a builder pattern for configuration composition:

```typescript
class ConfigBuilder {
  private config: Partial<RuntimeConfig> = {}

  withDefaults(): this {
    this.config = { ...defaultConfig }
    return this
  }

  fromSettingsFile(path: string, fileSystem: FileSystem): this {
    const settings = readSettingsFile(path, fileSystem)
    if (settings) {
      this.config = { ...this.config, ...settings }
    }
    return this
  }

  fromEnv(env: NodeJS.ProcessEnv): this {
    const envConfig = readEnvConfig(env)
    // Env overrides file settings
    if (envConfig.eventsUrl) {
      this.config.eventsUrl = envConfig.eventsUrl
    }
    return this
  }

  withAutoDetection(cwd: string, fileSystem: FileSystem): this {
    this.config.dustCommand ??= detectDustCommand(cwd, fileSystem)
    this.config.installCommand ??= detectInstallCommand(cwd, fileSystem)
    return this
  }

  build(): RuntimeConfig {
    return this.config as RuntimeConfig
  }
}

// Usage
const config = new ConfigBuilder()
  .withDefaults()
  .fromSettingsFile(settingsPath, fileSystem)
  .fromEnv(process.env)
  .withAutoDetection(cwd, fileSystem)
  .build()
```

## Trade-offs

### Benefits

- **Clear precedence** — builder chain shows override order explicitly
- **Eliminates duplication** — each source handled once
- **Testability** — each step can be tested independently
- **Flexibility** — easy to add new config sources (CLI flags, remote config)
- **Self-documenting** — builder chain reads as configuration recipe

### Costs

- **New abstraction** — adds a class where functions existed
- **Migration effort** — needs refactoring of `loadSettings` callers
- **Builder overhead** — more verbose than direct object construction

## Open Questions

### Should the builder be a class or functional composition?

#### Option: Class-based builder

Traditional builder with `this` chaining. Clear pattern, good IDE support, familiar to most developers.

#### Option: Functional pipeline

Use function composition: `pipe(defaults, fromFile(path), fromEnv(env), autoDetect(cwd))`. More functional style, potentially cleaner.

### How should validation be integrated?

#### Option: Validate in build()

Builder collects all configuration, validates at the end in `build()`. Single validation pass, clear error location.

#### Option: Validate each step

Each builder method validates its own input. Fails fast but may have redundant validation.
