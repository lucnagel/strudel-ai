import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import type { ExportProgress } from '../lib/ExportManager'

type ExportDialogProps = {
  isOpen: boolean
  onClose: () => void
  onExport: (cycles: number) => void
  progress: ExportProgress | null
}

export function ExportDialog({ isOpen, onClose, onExport, progress }: ExportDialogProps) {
  const [cycles, setCycles] = useState(4)

  const handleExport = useCallback(() => {
    onExport(cycles)
  }, [onExport, cycles])

  if (!isOpen) return null

  const isExporting = progress !== null && progress.phase !== 'complete'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={isExporting ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg w-80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-10 px-4 border-b border-[var(--color-border)]">
          <span className="text-sm">Export Audio</span>
          {!isExporting && (
            <button
              onClick={onClose}
              className="text-[var(--color-muted)] hover:text-white transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="p-4">
          {!isExporting ? (
            <>
              {/* Cycles input */}
              <div className="mb-4">
                <label className="block text-[10px] tracking-wider text-[var(--color-muted)] uppercase mb-2">
                  Cycles
                </label>
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={cycles}
                  onChange={(e) => setCycles(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                  className="w-full h-10 px-3 bg-transparent border border-[var(--color-border)] rounded text-sm outline-none focus:border-white transition-colors"
                />
                <p className="text-[10px] text-[var(--color-muted)] mt-2">
                  One cycle = one full pattern repetition
                </p>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                className="w-full h-10 text-sm bg-white text-black rounded hover:bg-gray-200 transition-colors"
              >
                Export
              </button>
            </>
          ) : (
            <>
              {/* Progress */}
              <div>
                <div className="flex justify-between text-[10px] text-[var(--color-muted)] mb-2 uppercase tracking-wider">
                  <span>
                    {progress.phase === 'preparing' && 'Preparing'}
                    {progress.phase === 'recording' && `Recording ${(progress.currentCycle ?? 0) + 1}/${progress.totalCycles}`}
                    {progress.phase === 'encoding' && 'Encoding'}
                    {progress.phase === 'complete' && 'Complete'}
                  </span>
                  <span>{Math.round(progress.progress)}%</span>
                </div>
                <div className="h-px bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
