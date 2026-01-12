import { useEffect, useRef, useCallback, useState } from 'react'

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
  AudioNode.prototype.connect = function(
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
        hasRecordingDest: !!recordingDestination
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

function unpatchAudioConnect() {
  if (originalConnect) {
    AudioNode.prototype.connect = originalConnect
    originalConnect = null
  }
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
    }
  })

  // Store audio context reference
  audioContextRef = getAudioContext()

  return repl as StrudelRepl
}

export function getStrudelAudioContext(): AudioContext | null {
  return audioContextRef
}

export function Editor({ value, onChange, error, onEditorReady, isPlaying = false }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const strudelRef = useRef<Awaited<ReturnType<typeof createEvalContext>> | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize Strudel
  useEffect(() => {
    let mounted = true

    createEvalContext().then(ctx => {
      if (mounted) {
        strudelRef.current = ctx
        setIsReady(true)

        if (onEditorReady) {
          onEditorReady({
            evaluate: async (): Promise<EvaluateResult> => {
              if (strudelRef.current && textareaRef.current) {
                const code = textareaRef.current.value
                try {
                  // Use Strudel's built-in evaluate function
                  await strudelRef.current.evaluate(code)
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
            },
            setCode: (code: string) => {
              if (textareaRef.current) {
                textareaRef.current.value = code
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
                streamTracks: recordingDestination.stream.getAudioTracks().length
              })

              return recordingDestination
            },
            stopRecording: () => {
              isRecordingActive = false
              recordingDestination = null
              // Note: We don't unpatch because it would break existing connections
              // The patch only routes audio when isRecordingActive is true
            }
          })
        }
      }
    }).catch(err => {
      console.error('Failed to init Strudel:', err)
    })

    return () => { mounted = false }
  }, [onEditorReady, onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }, [value, onChange])

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Activity indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-300 ${
        isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent activity-pulse" />
      </div>

      <div className="flex-1 min-h-0 p-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-white text-sm resize-none outline-none leading-relaxed overflow-y-auto"
          spellCheck={false}
          placeholder={isReady ? "// Enter Strudel pattern..." : "// Loading Strudel..."}
        />
      </div>
      {error && (
        <div className="px-4 py-2 text-red-400 text-xs border-t border-[var(--color-border)]">
          {error}
        </div>
      )}
    </div>
  )
}
