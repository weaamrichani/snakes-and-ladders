import { useState } from 'react'
import type { GameMode } from '../game/board'

interface NameEntryProps {
  mode: GameMode
  onStart: (names: string[]) => void
  onBack: () => void
}

export default function NameEntry({ mode, onStart, onBack }: NameEntryProps) {
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')

  const handleStart = () => {
    const names = mode === '1p'
      ? [name1.trim() || 'You']
      : [name1.trim() || 'Player 1', name2.trim() || 'Player 2']
    onStart(names)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-white/60 hover:text-white text-sm transition-colors"
      >
        ← Back
      </button>

      <p className="text-white/70 text-sm text-center">
        {mode === '1p' ? 'Enter your name' : 'Enter player names'}
      </p>

      {/* Player 1 input */}
      <div className="space-y-1">
        <input
          type="text"
          value={name1}
          onChange={e => setName1(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder={mode === '1p' ? 'Your name...' : 'Player 1...'}
          maxLength={16}
          className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:bg-white/20 transition-all"
        />
      </div>

      {/* Player 2 input — only for 2p mode */}
      {mode === '2p' && (
        <div className="space-y-1">
          <input
            type="text"
            value={name2}
            onChange={e => setName2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="Player 2..."
            maxLength={16}
            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-red-400 focus:bg-white/20 transition-all"
          />
        </div>
      )}

      <button
        onClick={handleStart}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-102 transition-all duration-200 shadow-lg"
      >
        Start Game 🎮
      </button>
    </div>
  )
}