import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, Plus, X } from 'lucide-react'

type Session = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

type SessionsProps = {
  sessions: Session[]
  activeSessionId: string
  onNew: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
}

export function Sessions({ sessions, activeSessionId, onNew, onSwitch, onDelete }: SessionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-2 hover:bg-[var(--color-hover)] transition-colors"
        title="Sessions"
      >
        <LayoutGrid size={14} strokeWidth={1.5} />
        <span className="text-sm">{activeSession?.name || 'Session'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md z-20 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[10px] tracking-wider text-[var(--color-muted)] uppercase">Sessions</span>
            <button
              onClick={() => {
                onNew()
                setIsOpen(false)
              }}
              className="flex items-center gap-1 text-[10px] tracking-wider text-[var(--color-muted)] hover:text-white transition-colors uppercase"
              title="New session"
            >
              <Plus size={10} strokeWidth={2} />
              New
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`flex items-center justify-between px-3 py-2 hover:bg-[var(--color-hover)] cursor-pointer group ${
                  session.id === activeSessionId ? 'bg-[var(--color-surface)]' : ''
                }`}
                onClick={() => {
                  onSwitch(session.id)
                  setIsOpen(false)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{session.name}</div>
                  <div className="text-[10px] text-[var(--color-muted)]">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 text-[var(--color-muted)] hover:text-white transition-all"
                    title="Delete session"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
