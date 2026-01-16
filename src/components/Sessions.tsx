import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, Plus, X, ChevronRight, Star } from 'lucide-react'

type Favorite = {
  id: string
  name: string
  createdAt: number
}

type Session = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  favorites: Favorite[]
}

type SessionsProps = {
  sessions: Session[]
  activeSessionId: string
  onNew: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onRestoreFavorite: (favoriteId: string) => void
  onDeleteFavorite: (favoriteId: string) => void
}

export function Sessions({ sessions, activeSessionId, onNew, onSwitch, onDelete, onRestoreFavorite, onDeleteFavorite }: SessionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
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
          <div className="max-h-80 overflow-y-auto">
            {sessions.map(session => (
              <div key={session.id}>
                <div
                  className={`flex items-center justify-between px-3 py-2 hover:bg-[var(--color-hover)] cursor-pointer group ${
                    session.id === activeSessionId ? 'bg-[var(--color-surface)]' : ''
                  }`}
                  onClick={() => {
                    onSwitch(session.id)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {session.favorites.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedSessionId(expandedSessionId === session.id ? null : session.id)
                        }}
                        className="text-[var(--color-muted)] hover:text-white"
                      >
                        <ChevronRight
                          size={12}
                          className={`transition-transform ${expandedSessionId === session.id ? 'rotate-90' : ''}`}
                        />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{session.name}</div>
                      <div className="text-[10px] text-[var(--color-muted)]">
                        {new Date(session.updatedAt).toLocaleDateString()}
                        {session.favorites.length > 0 && (
                          <span className="ml-2">
                            <Star size={8} className="inline mr-0.5" />
                            {session.favorites.length}
                          </span>
                        )}
                      </div>
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

                {expandedSessionId === session.id && session.favorites.length > 0 && (
                  <div className="border-l border-[var(--color-border)] ml-5">
                    {session.favorites.map(favorite => (
                      <div
                        key={favorite.id}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-[var(--color-hover)] cursor-pointer group"
                        onClick={() => {
                          onRestoreFavorite(favorite.id)
                          setIsOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Star size={10} className="text-[var(--color-muted)]" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate">{favorite.name}</div>
                            <div className="text-[9px] text-[var(--color-muted)]">
                              {new Date(favorite.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteFavorite(favorite.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[var(--color-muted)] hover:text-white transition-all"
                          title="Remove favorite"
                        >
                          <X size={10} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
