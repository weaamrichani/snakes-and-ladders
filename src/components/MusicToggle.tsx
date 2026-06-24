
import { useState } from 'react'

interface MusicToggleProps {
  onToggle: () => boolean  // returns new muted state
}

export default function MusicToggle({ onToggle }: MusicToggleProps) {
  const [musicOn, setMusicOn] = useState(true)

  const handleClick = () => {
    const isNowOn = onToggle()
    setMusicOn(isNowOn)
  }

  return (
    <button
      onClick={handleClick}
      title={musicOn ? 'Mute music' : 'Unmute music'}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition ${
        musicOn
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          : 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}
    >
      <span className="text-lg">{musicOn ? '🎵' : '🔇'}</span>
      <span>{musicOn ? 'Music on' : 'Music off'}</span>
    </button>
  )
}