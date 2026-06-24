
import { useEffect, useRef } from 'react'

interface RollHistoryProps {
  history: { playerName: string; roll: number; event: 'snake' | 'ladder' | 'none' | 'overshoot' }[]
}

function getDiceFace(value: number): string {
  switch (value) {
    case 1: return '&#9856;'
    case 2: return '&#9857;'
    case 3: return '&#9858;'
    case 4: return '&#9859;'
    case 5: return '&#9860;'
    case 6: return '&#9861;'
    default: return '&#9856;'
  }
}

export default function RollHistory({ history }: RollHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new rolls come in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [history])

  if (history.length === 0) return null

  return (
    <div className="w-full max-w-xs">
      <div
        ref={containerRef}
        className="bg-white rounded-xl border border-gray-200 overflow-y-auto max-h-36 px-3 py-2"
      >
        <ul className="space-y-1">
          {history.map((entry, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
              <span className="text-gray-400 w-5 text-xs">{i + 1}.</span>
              <span className="font-medium text-gray-700">{entry.playerName}</span>
              <span className="text-2xl leading-none" dangerouslySetInnerHTML={{ __html: getDiceFace(entry.roll) }} />
              {entry.event === 'snake'  && <span className="text-red-500 text-xs">🐍</span>}
              {entry.event === 'ladder' && <span className="text-green-500 text-xs">🪜</span>}
              {entry.event === 'overshoot' && <span className="text-orange-500 text-xs">🎲 overshoot</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}