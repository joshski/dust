// __DUST_VERSION__ is replaced with a string literal at build time (scripts/build.ts).
declare const __DUST_VERSION__: string | undefined

export const DUST_VERSION: string =
  typeof __DUST_VERSION__ !== 'undefined' ? __DUST_VERSION__ : 'unknown'
