import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Monochrome dark theme for Filo editor
 * Matches the existing CSS variables in globals.css
 */
export const monochromeTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      fontSize: '14px',
      lineHeight: '1.6',
      caretColor: 'var(--color-fg)',
      padding: '0',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-fg)',
      borderLeftWidth: '2px',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid var(--color-border)',
      color: 'var(--color-muted)',
      paddingRight: '4px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 4px 0 8px',
      minWidth: '20px',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--color-surface)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-surface)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#333',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#222',
    },
    // Strudel highlight classes
    '.cm-strudel-flash': {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '2px',
    },
    '.cm-strudel-highlight': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
  },
  { dark: true }
)

/**
 * Monochrome syntax highlighting
 * Uses grayscale palette for minimal visual noise
 */
export const monochromeHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: '#888' },
    { tag: tags.string, color: '#fff' },
    { tag: tags.number, color: '#aaa' },
    { tag: tags.comment, color: '#555', fontStyle: 'italic' },
    { tag: tags.operator, color: '#777' },
    { tag: tags.function(tags.variableName), color: '#fff' },
    { tag: tags.variableName, color: '#ccc' },
    { tag: tags.propertyName, color: '#999' },
    { tag: tags.bracket, color: '#666' },
    { tag: tags.punctuation, color: '#666' },
    { tag: tags.definition(tags.variableName), color: '#fff' },
    { tag: tags.bool, color: '#aaa' },
    { tag: tags.null, color: '#888' },
    { tag: tags.regexp, color: '#999' },
  ])
)
