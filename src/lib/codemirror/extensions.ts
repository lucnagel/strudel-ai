import { javascript } from '@codemirror/lang-javascript'
import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import {
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  EditorView,
} from '@codemirror/view'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { monochromeTheme, monochromeHighlight } from './theme'
import { highlightField } from './highlight'

/**
 * Creates the full set of CodeMirror extensions for the Filo editor
 *
 * Includes:
 * - Line numbers and active line highlighting
 * - JavaScript syntax highlighting
 * - Monochrome dark theme
 * - Strudel event highlighting support
 * - Basic editing features (bracket matching, indentation)
 */
export function createExtensions() {
  return [
    // Line display
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),

    // Editing features
    bracketMatching(),
    indentOnInput(),
    rectangularSelection(),

    // Language support
    javascript(),

    // Keymaps
    keymap.of([...defaultKeymap, indentWithTab]),

    // Theme and styling
    monochromeTheme,
    monochromeHighlight,

    // Strudel highlighting
    highlightField,

    // Editor configuration
    EditorState.tabSize.of(2),
    EditorView.lineWrapping,
  ]
}

// Re-export types and utilities for convenience
export { highlightField, createHighlightController } from './highlight'
export type { HighlightController, StrudelScheduler } from './highlight'
