import { useCallback, useState, useRef } from 'react'
import { useChat } from './hooks/useChat'
import { useHistory } from './hooks/useHistory'
import { Editor, StrudelEditorHandle } from './components/Editor'
import { Chat } from './components/Chat'
import { Controls } from './components/Controls'
import { Sessions } from './components/Sessions'
import { ExportDialog } from './components/ExportDialog'
import { Equalizer } from './components/Equalizer'
import { ExportManager, ExportProgress } from './lib/ExportManager'

export default function App() {
  const history = useHistory()
  const chat = useChat()
  const editorRef = useRef<StrudelEditorHandle | null>(null)
  const exportManagerRef = useRef<ExportManager | null>(null)
  const lastPromptRef = useRef<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

  const handleEditorReady = useCallback((editor: StrudelEditorHandle) => {
    editorRef.current = editor
  }, [])

  const handleToggle = useCallback(async () => {
    if (!editorRef.current) return

    if (isPlaying) {
      editorRef.current.stop()
      setIsPlaying(false)
    } else {
      await editorRef.current.evaluate()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleStop = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.stop()
      setIsPlaying(false)
    }
  }, [])

  const evaluateWithRetry = useCallback(async (code: string, prompt: string): Promise<boolean> => {
    if (!editorRef.current) return false

    // Update the editor and evaluate
    history.commitToHistory(code)
    await new Promise(resolve => setTimeout(resolve, 100))

    const result = await editorRef.current.evaluate()

    if (result.success) {
      setIsPlaying(true)
      return true
    }

    // If error and can retry, ask AI to fix it
    if (result.error && chat.canRetry) {
      console.log(`[Filo] Error detected, attempting fix (retry ${chat.retryCount + 1}/2):`, result.error)
      const fixedCode = await chat.fixCode(code, result.error, prompt)
      if (fixedCode) {
        return evaluateWithRetry(fixedCode, prompt)
      }
    }

    // Failed after retries
    console.error('[Filo] Could not fix code after retries')
    setIsPlaying(false)
    return false
  }, [history, chat])

  const handleSendMessage = useCallback(async (prompt: string) => {
    lastPromptRef.current = prompt
    const generatedCode = await chat.sendMessage(prompt, history.code)
    if (generatedCode) {
      await evaluateWithRetry(generatedCode, prompt)
    }
  }, [history, chat, evaluateWithRetry])

  const handleUndo = useCallback(() => {
    history.undo()
  }, [history])

  const handleRedo = useCallback(() => {
    history.redo()
  }, [history])

  const handleOpenExport = useCallback(() => {
    setShowExportDialog(true)
  }, [])

  const handleCloseExport = useCallback(() => {
    setShowExportDialog(false)
    setExportProgress(null)
  }, [])

  const handleExport = useCallback(async (cycles: number) => {
    if (!editorRef.current) return

    const audioContext = editorRef.current.getAudioContext()
    const scheduler = editorRef.current.getScheduler()

    if (!audioContext || !scheduler) {
      console.error('Audio context or scheduler not available')
      return
    }

    // Start recording - this patches AudioNode.connect to intercept audio
    const recordingDest = editorRef.current.startRecording()
    if (!recordingDest) {
      console.error('Failed to start recording')
      return
    }

    // Initialize export manager if needed
    if (!exportManagerRef.current) {
      exportManagerRef.current = new ExportManager(audioContext)
    }

    // Set the recording destination on the export manager
    exportManagerRef.current.setRecordingDestination(recordingDest)

    // Stop current playback and re-evaluate to route through recording
    editorRef.current.stop()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Re-evaluate pattern - new connections will be intercepted
    await editorRef.current.evaluate()
    setIsPlaying(true)

    try {
      const blob = await exportManagerRef.current.export(
        { cycles, sessionName: history.activeSession.name },
        scheduler,
        setExportProgress
      )

      // Stop recording
      editorRef.current.stopRecording()

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${history.activeSession.name || 'strudel'}-export.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Close dialog after a brief delay
      setTimeout(() => {
        setShowExportDialog(false)
        setExportProgress(null)
      }, 1000)
    } catch (err) {
      console.error('Export failed:', err)
      editorRef.current.stopRecording()
      setExportProgress(null)
    }
  }, [history.activeSession.name])

  return (
    <div className="h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-2xl h-full max-h-[800px] flex flex-col border border-[var(--color-border)] rounded-lg overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-12 px-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Equalizer isPlaying={isPlaying} />
            <Sessions
              sessions={history.sessions}
              activeSessionId={history.activeSession.id}
              onNew={history.newSession}
              onSwitch={history.switchSession}
              onDelete={history.deleteSession}
            />
          </div>
          <Controls
            isPlaying={isPlaying}
            onToggle={handleToggle}
            onStop={handleStop}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onExport={handleOpenExport}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            isExporting={exportProgress !== null}
          />
        </header>

        {/* Editor */}
        <main className="flex-1 min-h-0">
          <Editor
            value={history.code}
            onChange={history.setCode}
            onEditorReady={handleEditorReady}
            isPlaying={isPlaying}
          />
        </main>

        {/* Prompt input */}
        <Chat
          isLoading={chat.isLoading}
          onSend={handleSendMessage}
          hasCode={history.code.length > 20}
        />
      </div>

      {/* Export dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleCloseExport}
        onExport={handleExport}
        progress={exportProgress}
      />
    </div>
  )
}
