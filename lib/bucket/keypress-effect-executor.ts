/**
 * Keypress effect executor - imperative shell for keypress effects.
 *
 * This module executes the effects returned by the pure handleKeypress function.
 * The UIEffectTarget interface allows testing without coupling to TerminalUIState.
 */

import type { Effect } from './bucket-state'

/**
 * Minimal interface for UI operations that the keypress executor needs.
 * This allows testing without coupling to the concrete TerminalUIState.
 */
export interface UIEffectTarget {
  /** Select the next repository tab */
  selectNext(): void
  /** Select the previous repository tab */
  selectPrevious(): void
  /** Reset scroll to bottom and enable auto-scroll */
  resetScroll(): void
  /** Scroll up by the given number of lines */
  scrollUp(lines: number): void
  /** Scroll down by the given number of lines */
  scrollDown(lines: number): void
  /** Scroll to the top of the log view */
  scrollToTop(): void
  /** Scroll to the bottom of the log view */
  scrollToBottom(): void
  /** Get the height of the log area for page scrolling */
  getLogAreaHeight(): number
}

/**
 * Options for the keypress effect executor.
 */
interface KeypressEffectExecutorOptions {
  /** Callback to open a URL in the browser */
  openBrowser?: (url: string) => void
}

/**
 * Execute keypress effects on a UI effect target.
 * This is the imperative shell that interprets pure handler results.
 */
export function executeKeypressEffects(
  target: UIEffectTarget,
  effects: Effect[],
  onQuit: () => void,
  options?: KeypressEffectExecutorOptions
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'quit':
        onQuit()
        break
      case 'openBrowser':
        if (options?.openBrowser) {
          options.openBrowser(effect.url)
        }
        break
      case 'selectNext':
        target.selectNext()
        target.resetScroll()
        break
      case 'selectPrevious':
        target.selectPrevious()
        target.resetScroll()
        break
      case 'scroll':
        switch (effect.direction) {
          case 'up':
            target.scrollUp(1)
            break
          case 'down':
            target.scrollDown(1)
            break
          case 'pageUp':
            target.scrollUp(target.getLogAreaHeight())
            break
          case 'pageDown':
            target.scrollDown(target.getLogAreaHeight())
            break
          case 'top':
            target.scrollToTop()
            break
          case 'bottom':
            target.scrollToBottom()
            break
        }
        break
    }
  }
}
