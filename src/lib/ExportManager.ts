/**
 * ExportManager - Orchestrates audio export from Strudel patterns
 * Uses MediaRecorder to capture real-time audio playback
 */

import JSZip from 'jszip'
import { encodeWav } from './wavEncoder'

export interface ExportSettings {
  cycles: number
  sessionName: string
}

export interface ExportProgress {
  phase: 'preparing' | 'recording' | 'encoding' | 'complete'
  progress: number // 0-100
  currentCycle?: number
  totalCycles?: number
}

type ProgressCallback = (progress: ExportProgress) => void

export interface StrudelScheduler {
  cps: number
  now: () => number
}

export class ExportManager {
  private context: AudioContext
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  constructor(context: AudioContext) {
    this.context = context
  }

  /**
   * Set the recording destination (created externally via startRecording)
   */
  setRecordingDestination(dest: MediaStreamAudioDestinationNode): void {
    this.mediaStreamDest = dest
  }

  /**
   * Export audio for the specified number of cycles
   * Pattern must already be playing through the tap node
   */
  async export(
    settings: ExportSettings,
    scheduler: StrudelScheduler,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    const { cycles, sessionName } = settings

    onProgress?.({ phase: 'preparing', progress: 0 })

    if (!this.mediaStreamDest) {
      throw new Error('Recording tap not set up. Call setupRecordingTap() first.')
    }

    // Calculate duration based on CPS
    const cps = scheduler.cps || 0.5 // Default to 0.5 cycles per second
    const cycleDuration = 1 / cps
    const totalDuration = cycles * cycleDuration

    // Set up MediaRecorder
    this.chunks = []

    console.log('[Export] Setting up MediaRecorder:', {
      streamTracks: this.mediaStreamDest.stream.getAudioTracks().length,
      streamActive: this.mediaStreamDest.stream.active
    })

    this.recorder = new MediaRecorder(this.mediaStreamDest.stream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    this.recorder.ondataavailable = (e) => {
      console.log('[Export] Data available:', e.data.size, 'bytes')
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    this.recorder.onerror = (e) => {
      console.error('[Export] MediaRecorder error:', e)
    }

    // Wait for next cycle boundary
    const currentCycle = scheduler.now()
    const nextCycle = Math.ceil(currentCycle)
    const waitTime = (nextCycle - currentCycle) * cycleDuration

    await this.wait(Math.max(0, waitTime * 1000))

    // Start recording
    onProgress?.({ phase: 'recording', progress: 0, currentCycle: 0, totalCycles: cycles })
    this.recorder.start(100) // Collect data every 100ms

    // Wait for the specified duration, updating progress
    const startTime = Date.now()
    const durationMs = totalDuration * 1000

    await new Promise<void>((resolve) => {
      const checkProgress = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(100, (elapsed / durationMs) * 100)
        const currentCycle = Math.floor((elapsed / durationMs) * cycles)

        onProgress?.({
          phase: 'recording',
          progress,
          currentCycle,
          totalCycles: cycles
        })

        if (elapsed >= durationMs) {
          resolve()
        } else {
          requestAnimationFrame(checkProgress)
        }
      }
      checkProgress()
    })

    // Stop recording and wait for data
    const audioBuffer = await this.stopRecording()

    onProgress?.({ phase: 'encoding', progress: 50 })

    if (!audioBuffer) {
      throw new Error('No audio recorded')
    }

    // Encode to WAV
    const wavData = encodeWav(audioBuffer)

    onProgress?.({ phase: 'encoding', progress: 80 })

    // Create ZIP bundle
    const zip = new JSZip()
    const folder = zip.folder(this.sanitizeName(sessionName))

    if (!folder) {
      throw new Error('Failed to create ZIP folder')
    }

    folder.file('mix.wav', wavData)

    onProgress?.({ phase: 'complete', progress: 100 })

    // Generate ZIP blob
    return zip.generateAsync({ type: 'blob' })
  }

  private stopRecording(): Promise<AudioBuffer | null> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        console.log('[Export] Recorder already inactive')
        resolve(null)
        return
      }

      this.recorder.onstop = async () => {
        console.log('[Export] Recording stopped, chunks:', this.chunks.length)

        if (this.chunks.length === 0) {
          console.error('[Export] No chunks recorded!')
          resolve(null)
          return
        }

        // Convert chunks to audio buffer
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        console.log('[Export] Created blob:', blob.size, 'bytes')

        const audioBuffer = await this.blobToAudioBuffer(blob)
        console.log('[Export] Decoded audio buffer:', audioBuffer ? `${audioBuffer.duration}s` : 'null')

        resolve(audioBuffer)
      }

      this.recorder.stop()
    })
  }

  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer | null> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (err) {
      console.error('Failed to decode audio:', err)
      return null
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50) || 'export'
  }

  dispose(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop()
    }
    this.mediaStreamDest = null
    this.recorder = null
    this.chunks = []
  }
}
