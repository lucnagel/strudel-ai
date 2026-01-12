import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'

/**
 * Strudel Scheduler interface
 * Extended to include pattern access for highlighting
 */
export interface StrudelScheduler {
  cps: number
  now: () => number
  pattern?: StrudelPattern
}

/**
 * Strudel Pattern interface for querying active events
 */
interface StrudelPattern {
  queryArc: (begin: number, end: number) => StrudelHap[]
}

/**
 * Strudel Hap (event) interface
 */
interface StrudelHap {
  whole: { begin: number; end: number } | null
  part: { begin: number; end: number }
  value: unknown
  context: {
    locations?: Array<{ start: number; end: number } | [number, number]>
  }
  hasOnset: () => boolean
  endClipped: number
}

/**
 * StateEffect to update highlight ranges
 * Maps positions through document changes
 */
export const setHighlights = StateEffect.define<{ from: number; to: number }[]>({
  map: (ranges, change) =>
    ranges
      .map(({ from, to }) => ({
        from: change.mapPos(from, 1),
        to: change.mapPos(to, -1),
      }))
      .filter(({ from, to }) => from < to),
})

/**
 * Mark decoration for active events (bright flash)
 */
const flashMark = Decoration.mark({ class: 'cm-strudel-flash' })

/**
 * StateField tracking active highlight decorations
 * Updates on setHighlights effect or document changes
 */
export const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    // Map existing decorations through document changes
    decorations = decorations.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(setHighlights)) {
        // Replace all decorations with new highlight ranges
        const docLength = tr.newDoc.length
        const marks = effect.value
          .filter(({ from, to }) => from >= 0 && to <= docLength && from < to)
          .sort((a, b) => a.from - b.from)
          .map(({ from, to }) => flashMark.range(from, to))

        decorations = Decoration.set(marks, true)
      }
    }
    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

/**
 * Controller interface for managing highlights
 */
export type HighlightController = {
  start: (scheduler: StrudelScheduler) => void
  stop: () => void
  invalidate: () => void
}

/**
 * Creates a highlight controller that syncs CodeMirror decorations
 * with active Strudel pattern events
 *
 * Uses requestAnimationFrame to query the scheduler pattern each frame
 * and update decorations for currently playing events
 */
export function createHighlightController(view: EditorView): HighlightController {
  let scheduler: StrudelScheduler | null = null
  let animationFrameId: number | null = null
  let isRunning = false

  /**
   * Normalize location format from Strudel
   * Locations can be { start, end } objects or [start, end] arrays
   */
  const normalizeLocation = (
    loc: { start: number; end: number } | [number, number]
  ): { from: number; to: number } | null => {
    if (Array.isArray(loc)) {
      return { from: loc[0], to: loc[1] }
    }
    if (typeof loc.start === 'number' && typeof loc.end === 'number') {
      return { from: loc.start, to: loc.end }
    }
    return null
  }

  /**
   * Animation frame callback
   * Queries pattern for active events and updates decorations
   */
  const updateHighlights = () => {
    if (!isRunning || !scheduler?.pattern) {
      animationFrameId = null
      return
    }

    try {
      const now = scheduler.now()

      // Query for events in a small window around current time
      // Small lookahead helps catch events slightly early for visual sync
      const haps = scheduler.pattern.queryArc(now - 0.05, now + 0.1)

      // Filter for events that are currently active
      const activeHaps = haps.filter((hap) => {
        if (!hap.hasOnset()) return false
        if (!hap.whole) return false
        // Event is active if we're between its start and end
        return hap.whole.begin <= now && hap.endClipped >= now
      })

      // Extract and normalize locations from active events
      const locations: { from: number; to: number }[] = []
      for (const hap of activeHaps) {
        const locs = hap.context?.locations || []
        for (const loc of locs) {
          const normalized = normalizeLocation(loc)
          if (normalized) {
            locations.push(normalized)
          }
        }
      }

      // Dispatch effect to update decorations
      view.dispatch({
        effects: setHighlights.of(locations),
      })
    } catch (err) {
      console.warn('[Highlight] Error updating highlights:', err)
    }

    // Schedule next frame
    if (isRunning) {
      animationFrameId = requestAnimationFrame(updateHighlights)
    }
  }

  return {
    /**
     * Start the highlight animation loop
     */
    start(sched: StrudelScheduler) {
      scheduler = sched
      isRunning = true

      // Start animation loop
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(updateHighlights)
      }
    },

    /**
     * Stop the highlight animation loop and clear decorations
     */
    stop() {
      isRunning = false

      // Cancel pending animation frame
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }

      // Clear all highlights
      view.dispatch({
        effects: setHighlights.of([]),
      })
    },

    /**
     * Force an immediate highlight update
     * Useful after pattern changes
     */
    invalidate() {
      if (isRunning && scheduler?.pattern) {
        // Cancel pending frame and update immediately
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId)
        }
        animationFrameId = requestAnimationFrame(updateHighlights)
      }
    },
  }
}
