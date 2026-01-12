import { useState, useCallback } from 'react'

type ChatState = {
  isLoading: boolean
  error: string | null
  retryCount: number
}

const MAX_RETRIES = 2

// In production (deployed), call local bridge directly
// In development, use relative URL (Vite proxies to localhost:3001)
const API_BASE = import.meta.env.PROD ? 'http://localhost:3001' : ''

export function useChat() {
  const [state, setState] = useState<ChatState>({
    isLoading: false,
    error: null,
    retryCount: 0
  })

  const generateCode = useCallback(async (
    prompt: string,
    currentCode?: string,
    errorToFix?: string
  ): Promise<string | null> => {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currentCode, errorToFix })
    })

    if (!response.ok) {
      throw new Error('Failed to generate pattern')
    }

    const data = await response.json() as { code: string }
    return data.code
  }, [])

  const sendMessage = useCallback(async (prompt: string, currentCode?: string) => {
    setState({ isLoading: true, error: null, retryCount: 0 })

    try {
      const code = await generateCode(prompt, currentCode)
      setState({ isLoading: false, error: null, retryCount: 0 })
      return code
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ isLoading: false, error: message, retryCount: 0 })
      return null
    }
  }, [generateCode])

  const fixCode = useCallback(async (
    code: string,
    errorMessage: string,
    originalPrompt: string
  ): Promise<string | null> => {
    setState(prev => ({
      isLoading: true,
      error: null,
      retryCount: prev.retryCount + 1
    }))

    try {
      const fixedCode = await generateCode(originalPrompt, code, errorMessage)
      setState(prev => ({ isLoading: false, error: null, retryCount: prev.retryCount }))
      return fixedCode
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ isLoading: false, error: message, retryCount: prev.retryCount }))
      return null
    }
  }, [generateCode])

  return {
    ...state,
    sendMessage,
    fixCode,
    canRetry: state.retryCount < MAX_RETRIES
  }
}
