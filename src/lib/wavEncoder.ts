/**
 * Pure TypeScript WAV encoder
 * Converts AudioBuffer to WAV ArrayBuffer (16-bit PCM)
 */

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function floatTo16BitPCM(view: DataView, offset: number, samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

function interleaveChannels(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const interleaved = new Float32Array(length * numChannels)

  if (numChannels === 1) {
    interleaved.set(audioBuffer.getChannelData(0))
  } else {
    const channels: Float32Array[] = []
    for (let c = 0; c < numChannels; c++) {
      channels.push(audioBuffer.getChannelData(c))
    }
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        interleaved[i * numChannels + c] = channels[c][i]
      }
    }
  }

  return interleaved
}

export function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8

  const interleaved = interleaveChannels(audioBuffer)
  const dataSize = interleaved.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true) // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true) // block align
  view.setUint16(34, bitDepth, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write samples
  floatTo16BitPCM(view, 44, interleaved)

  return buffer
}

export function createAudioBuffer(
  context: AudioContext,
  leftChannel: Float32Array,
  rightChannel: Float32Array
): AudioBuffer {
  const length = leftChannel.length
  const buffer = context.createBuffer(2, length, context.sampleRate)
  buffer.copyToChannel(leftChannel, 0)
  buffer.copyToChannel(rightChannel, 1)
  return buffer
}
