/**
 * Biome path export
 *
 * Provides the path to the biome directory containing custom GritQL lint rules.
 * Downstream users can reference this path in their biome.json plugins array.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * Absolute path to the biome directory containing custom GritQL lint rules.
 *
 * @example
 * ```typescript
 * import { biomePath } from "@joshski/dust/biome";
 * // Returns: "/path/to/node_modules/@joshski/dust/biome"
 * ```
 */
export const biomePath = join(currentDir, '..', 'biome')
