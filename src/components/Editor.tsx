import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createExtensions, createHighlightController } from '../lib/codemirror/extensions'
import type { HighlightController, StrudelScheduler as HighlightScheduler } from '../lib/codemirror/highlight'

type EditorProps = {
  value: string
  onChange: (value: string) => void
  error?: string | null
  onEditorReady?: (editor: StrudelEditorHandle) => void
  isPlaying?: boolean
}

export interface StrudelScheduler {
  cps: number
  now: () => number
  pattern?: unknown
}

export type EvaluateResult = {
  success: boolean
  error?: string
}

export type StrudelEditorHandle = {
  evaluate: () => Promise<EvaluateResult>
  stop: () => void
  setCode: (code: string) => void
  getAudioContext: () => AudioContext | null
  getScheduler: () => StrudelScheduler | null
  // Recording support
  startRecording: () => MediaStreamAudioDestinationNode | null
  stopRecording: () => void
}

type StrudelRepl = {
  evaluate: (code: string) => Promise<unknown>
  stop: () => void
  scheduler?: StrudelScheduler
}

// Recording state
let recordingDestination: MediaStreamAudioDestinationNode | null = null
let isRecordingActive = false

// Store audio context reference
let audioContextRef: AudioContext | null = null

// Patch AudioNode.connect to intercept audio going to destination
let originalConnect: typeof AudioNode.prototype.connect | null = null

function patchAudioConnect() {
  if (originalConnect) return // Already patched

  originalConnect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (
    destination: AudioNode | AudioParam,
    outputIndex?: number,
    inputIndex?: number
  ): AudioNode {
    // Call original connect
    const result = originalConnect!.call(this, destination, outputIndex, inputIndex)

    // Debug: Log all connections when recording is active
    if (isRecordingActive && audioContextRef) {
      const isDestination = destination === audioContextRef.destination
      console.log('[Recording] AudioNode.connect called:', {
        source: this.constructor.name,
        destination: destination instanceof AudioNode ? destination.constructor.name : 'AudioParam',
        isDestination,
        hasRecordingDest: !!recordingDestination,
      })
    }

    // If connecting to AudioContext.destination and recording is active,
    // also connect to the recording destination
    if (
      isRecordingActive &&
      recordingDestination &&
      audioContextRef &&
      destination === audioContextRef.destination
    ) {
      try {
        console.log('[Recording] Routing to recording destination')
        originalConnect!.call(this, recordingDestination)
      } catch (e) {
        console.error('[Recording] Failed to route:', e)
      }
    }

    return result
  } as typeof AudioNode.prototype.connect
}

// Create evaluation context with Strudel's repl
async function createEvalContext(): Promise<StrudelRepl> {
  const { initStrudel, samples } = await import('@strudel/web')
  const { initAudioOnFirstClick, getAudioContext } = await import('@strudel/webaudio')

  initAudioOnFirstClick()

  // Initialize Strudel with samples - returns repl with evaluate function
  const repl = await initStrudel({
    prebake: async () => {
      const doughSamples = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'
      // Load dirt-samples (breaks, bass, percussion, etc.)
      await samples('github:tidalcycles/dirt-samples')
      // Load drum machines (RolandTR808, RolandTR909, etc.)
      await samples(`${doughSamples}/tidal-drum-machines.json`)
      console.log('[Filo] Sample libraries loaded: dirt-samples, tidal-drum-machines')
    },
  })

  // Store audio context reference
  audioContextRef = getAudioContext()

  return repl as StrudelRepl
}

export function getStrudelAudioContext(): AudioContext | null {
  return audioContextRef
}

export function Editor({ value, onChange, error, onEditorReady, isPlaying = false }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const highlightControllerRef = useRef<HighlightController | null>(null)
  const strudelRef = useRef<StrudelRepl | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Track if we're updating from external source to avoid feedback loops
  const isExternalUpdate = useRef(false)

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        createExtensions(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdate.current) {
            onChange(update.state.doc.toString())
          }
        }),
        // Placeholder extension
        EditorView.contentAttributes.of({
          'aria-label': isReady ? 'Enter Strudel pattern...' : 'Loading Strudel...',
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    // Create highlight controller
    highlightControllerRef.current = createHighlightController(view)

    return () => {
      highlightControllerRef.current?.stop()
      view.destroy()
    }
  }, []) // Only on mount

  // Sync external value changes to CodeMirror
  useEffect(() => {
    const view = viewRef.current
    if (view && value !== view.state.doc.toString()) {
      isExternalUpdate.current = true
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
      isExternalUpdate.current = false
    }
  }, [value])

  // Initialize Strudel
  useEffect(() => {
    let mounted = true

    createEvalContext()
      .then((ctx) => {
        if (mounted) {
          strudelRef.current = ctx
          setIsReady(true)

          if (onEditorReady) {
            onEditorReady({
              evaluate: async (): Promise<EvaluateResult> => {
                if (strudelRef.current && viewRef.current) {
                  const code = viewRef.current.state.doc.toString()
                  try {
                    // Use Strudel's built-in evaluate function
                    await strudelRef.current.evaluate(code)

                    // Start highlighting after successful evaluation
                    const scheduler = strudelRef.current.scheduler
                    if (scheduler && highlightControllerRef.current) {
                      highlightControllerRef.current.start(scheduler as HighlightScheduler)
                    }

                    return { success: true }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err)
                    console.error('Evaluation error:', errorMessage)
                    return { success: false, error: errorMessage }
                  }
                }
                return { success: false, error: 'Editor not ready' }
              },
              stop: () => {
                strudelRef.current?.stop?.()
                highlightControllerRef.current?.stop()
              },
              setCode: (code: string) => {
                if (viewRef.current) {
                  isExternalUpdate.current = true
                  viewRef.current.dispatch({
                    changes: { from: 0, to: viewRef.current.state.doc.length, insert: code },
                  })
                  isExternalUpdate.current = false
                  onChange(code)
                }
              },
              getAudioContext: () => audioContextRef,
              getScheduler: () => strudelRef.current?.scheduler ?? null,
              startRecording: () => {
                if (!audioContextRef) {
                  console.error('[Recording] No audio context')
                  return null
                }

                console.log('[Recording] Starting recording setup...')

                // Create recording destination
                recordingDestination = audioContextRef.createMediaStreamDestination()
                isRecordingActive = true

                // Patch connect to intercept audio
                patchAudioConnect()

                console.log('[Recording] Recording active, destination created:', {
                  isActive: isRecordingActive,
                  hasDest: !!recordingDestination,
                  streamTracks: recordingDestination.stream.getAudioTracks().length,
                })

                return recordingDestination
              },
              stopRecording: () => {
                isRecordingActive = false
                recordingDestination = null
                // Note: We don't unpatch because it would break existing connections
                // The patch only routes audio when isRecordingActive is true
              },
            })
          }
        }
      })
      .catch((err) => {
        console.error('Failed to init Strudel:', err)
      })

    return () => {
      mounted = false
    }
  }, [onEditorReady, onChange])

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Activity indicator bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-300 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent activity-pulse" />
      </div>

      {/* CodeMirror container */}
      <div ref={containerRef} className="flex-1 min-h-0 p-4 strudel-editor overflow-hidden" />

      {/* Loading placeholder */}
      {!isReady && (
        <div className="absolute inset-0 flex items-start p-4 pointer-events-none">
          <span className="text-[var(--color-muted)] text-sm font-mono">// Loading Strudel...</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-red-400 text-xs border-t border-[var(--color-border)]">
          {error}
        </div>
      )}
    </div>
  )
}
