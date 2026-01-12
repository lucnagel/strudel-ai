import { useState, useEffect, FormEvent } from 'react'
import { CornerDownLeft } from 'lucide-react'

type ChatProps = {
  isLoading: boolean
  onSend: (prompt: string) => void
  hasCode?: boolean
}

const INITIAL_SUGGESTIONS = [
  // Genres
  'minimal techno beat',
  'ambient drone',
  'jungle breaks',
  'dub techno',
  'idm glitch',
  'deep house groove',
  'uk garage rhythm',
  'detroit techno',
  'breakcore chaos',
  'lo-fi hip hop',
  // Inspired by
  'inspired by aphex twin',
  'inspired by boards of canada',
  'inspired by autechre',
  'inspired by burial',
  'inspired by four tet',
  'like basic channel',
  'like plastikman',
]

const REMIX_SUGGESTIONS = [
  // Tempo & Structure
  'make it faster',
  'slow it down',
  'simplify it',
  'make it longer',
  'strip it back',
  'add variation',
  // Effects
  'add more reverb',
  'add delay',
  'add distortion',
  'make it lo-fi',
  'more space',
  // Filter
  'open the filter',
  'darker filter',
  'add filter sweep',
  'more resonance',
  // Mood & Character
  'make it darker',
  'make it brighter',
  'more aggressive',
  'more hypnotic',
  // Elements
  'add a melody',
  'add bass',
  'more percussion',
  'add hi-hats',
  'add a pad',
  'add arpeggios',
]

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      <span className="thinking-dot w-[4px] h-[4px] bg-[var(--color-muted)] rounded-full" style={{ animationDelay: '0ms' }} />
      <span className="thinking-dot w-[4px] h-[4px] bg-[var(--color-muted)] rounded-full" style={{ animationDelay: '150ms' }} />
      <span className="thinking-dot w-[4px] h-[4px] bg-[var(--color-muted)] rounded-full" style={{ animationDelay: '300ms' }} />
    </span>
  )
}

export function Chat({ isLoading, onSend, hasCode = false }: ChatProps) {
  const [input, setInput] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)

  const suggestions = hasCode ? REMIX_SUGGESTIONS : INITIAL_SUGGESTIONS

  // Rotate suggestions every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % suggestions.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [suggestions.length])

  // Reset index when suggestions change
  useEffect(() => {
    setSuggestionIndex(0)
  }, [hasCode])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    const text = input.trim() || placeholder
    onSend(text)
    setInput('')
  }

  const placeholder = suggestions[suggestionIndex]

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--color-border)]">
      <div className="flex items-center h-12 px-4">
        {isLoading ? (
          <div className="flex-1 flex items-center text-sm text-[var(--color-muted)]">
            <span>Generating</span>
            <ThinkingDots />
          </div>
        ) : (
          <>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
              autoFocus
            />
            {input.trim() && (
              <button
                type="submit"
                className="flex items-center gap-1 text-[var(--color-muted)] hover:text-white transition-colors ml-2"
              >
                <CornerDownLeft size={12} strokeWidth={1.5} />
              </button>
            )}
          </>
        )}
      </div>
    </form>
  )
}
