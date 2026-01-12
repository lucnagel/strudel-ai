type EqualizerProps = {
  isPlaying: boolean
}

export function Equalizer({ isPlaying }: EqualizerProps) {
  return (
    <div className="flex items-end gap-[2px] h-4 w-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-[3px] bg-white rounded-sm transition-all duration-150 ${
            isPlaying ? 'eq-bar' : 'h-[2px] opacity-30'
          }`}
          style={{
            animationDelay: isPlaying ? `${i * 150}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}
