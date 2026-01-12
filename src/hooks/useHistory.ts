import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'strudel-sessions-v1'
const MAX_HISTORY = 50

type Session = {
  id: string
  name: string
  code: string
  history: string[]
  historyIndex: number
  createdAt: number
  updatedAt: number
}

type SessionsState = {
  sessions: Session[]
  activeSessionId: string
}

function createSession(name?: string): Session {
  const id = crypto.randomUUID()
  const now = Date.now()
  return {
    id,
    name: name || `Session ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    code: 's("bd sd")',
    history: ['s("bd sd")'],
    historyIndex: 0,
    createdAt: now,
    updatedAt: now
  }
}

function loadSessions(): SessionsState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SessionsState
      if (parsed.sessions?.length > 0) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }

  const initial = createSession()
  return {
    sessions: [initial],
    activeSessionId: initial.id
  }
}

function saveSessions(state: SessionsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

export function useHistory() {
  const [state, setState] = useState<SessionsState>(loadSessions)

  // Save to localStorage on change
  useEffect(() => {
    saveSessions(state)
  }, [state])

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0]

  const setCode = useCallback((newCode: string) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(session =>
        session.id === s.activeSessionId
          ? { ...session, code: newCode, updatedAt: Date.now() }
          : session
      )
    }))
  }, [])

  const commitToHistory = useCallback((code: string) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(session => {
        if (session.id !== s.activeSessionId) return session

        // Don't add duplicate entries
        if (session.history[session.historyIndex] === code) {
          return { ...session, code, updatedAt: Date.now() }
        }

        // Truncate future history if we're not at the end
        const newHistory = session.history.slice(0, session.historyIndex + 1)
        newHistory.push(code)

        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift()
        }

        return {
          ...session,
          code,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          updatedAt: Date.now()
        }
      })
    }))
  }, [])

  const undo = useCallback(() => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(session => {
        if (session.id !== s.activeSessionId) return session
        if (session.historyIndex <= 0) return session
        const newIndex = session.historyIndex - 1
        return {
          ...session,
          code: session.history[newIndex],
          historyIndex: newIndex
        }
      })
    }))
  }, [])

  const redo = useCallback(() => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(session => {
        if (session.id !== s.activeSessionId) return session
        if (session.historyIndex >= session.history.length - 1) return session
        const newIndex = session.historyIndex + 1
        return {
          ...session,
          code: session.history[newIndex],
          historyIndex: newIndex
        }
      })
    }))
  }, [])

  const newSession = useCallback((name?: string) => {
    const session = createSession(name)
    setState(s => ({
      sessions: [session, ...s.sessions],
      activeSessionId: session.id
    }))
  }, [])

  const switchSession = useCallback((sessionId: string) => {
    setState(s => ({
      ...s,
      activeSessionId: sessionId
    }))
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setState(s => {
      const remaining = s.sessions.filter(session => session.id !== sessionId)
      // Ensure at least one session exists
      if (remaining.length === 0) {
        const newSess = createSession()
        return {
          sessions: [newSess],
          activeSessionId: newSess.id
        }
      }
      return {
        sessions: remaining,
        activeSessionId: s.activeSessionId === sessionId ? remaining[0].id : s.activeSessionId
      }
    })
  }, [])

  const renameSession = useCallback((sessionId: string, name: string) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? { ...session, name }
          : session
      )
    }))
  }, [])

  const canUndo = activeSession.historyIndex > 0
  const canRedo = activeSession.historyIndex < activeSession.history.length - 1

  return {
    code: activeSession.code,
    setCode,
    commitToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    // Session management
    sessions: state.sessions,
    activeSession,
    newSession,
    switchSession,
    deleteSession,
    renameSession
  }
}
