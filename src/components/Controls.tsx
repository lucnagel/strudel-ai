import { Play, Pause, Square, Undo2, Redo2, Download } from 'lucide-react'

type ControlsProps = {
  isPlaying: boolean
  onToggle: () => void
  onStop: () => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  canUndo: boolean
  canRedo: boolean
  isExporting: boolean
}

export function Controls({
  isPlaying,
  onToggle,
  onStop,
  onUndo,
  onRedo,
  onExport,
  canUndo,
  canRedo,
  isExporting
}: ControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        title="Undo"
      >
        <Undo2 size={14} strokeWidth={1.5} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        title="Redo"
      >
        <Redo2 size={14} strokeWidth={1.5} />
      </button>

      <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

      <button
        onClick={onToggle}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={14} strokeWidth={1.5} />
        ) : (
          <Play size={14} strokeWidth={1.5} />
        )}
      </button>
      <button
        onClick={onStop}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors"
        title="Stop"
      >
        <Square size={12} strokeWidth={1.5} />
      </button>

      <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        title="Export audio"
      >
        <Download size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}
