import { useState, useEffect } from 'react'

interface DiceProps {
  lastRoll: number | null
  rolling: boolean
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

export default function Dice({ lastRoll, rolling }: DiceProps) {
  const [displayFace, setDisplayFace] = useState(1)

  // While rolling, cycle through random faces rapidly
  useEffect(() => {
    if (!rolling) {
      if (lastRoll) setDisplayFace(lastRoll)
      return
    }
    const interval = setInterval(() => {
      setDisplayFace(Math.floor(Math.random() * 6) + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [rolling, lastRoll])

  return (
    <>
      <style>{`
        @keyframes spin-bounce {
          0%   { transform: translateY(0)     rotate(0deg);   }
          25%  { transform: translateY(-12px) rotate(90deg);  }
          50%  { transform: translateY(0)     rotate(180deg); }
          75%  { transform: translateY(-12px) rotate(270deg); }
          100% { transform: translateY(0)     rotate(360deg); }
        }
        .dice-rolling {
          animation: spin-bounce 1s linear infinite;
          display: inline-block;
        }
        .dice-idle {
          transition: transform 0.2s ease;
          display: inline-block;
        }
      `}</style>

      <div
        className={rolling ? 'dice-rolling' : 'dice-idle'}
        style={{ color: 'white', fontSize: '4.5rem', lineHeight: 1 }}
        dangerouslySetInnerHTML={{ __html: getDiceFace(displayFace) }}
      />
    </>
  )
}