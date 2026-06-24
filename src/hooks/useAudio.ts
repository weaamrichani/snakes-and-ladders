import { useRef } from 'react'
import { Howl } from 'howler'

const sounds = {
  background: new Howl({ src: ['/sounds/main.mp3'], loop: true, volume: 0.35 }),
  dice:       new Howl({ src: ['/sounds/dice_roll.mp3'], volume: 0.30 }),
  snake:      new Howl({ src: ['/sounds/snake.mp3'], volume: 0.35 }),
  ladder:     new Howl({ src: ['/sounds/ladder.mp3'], volume: 1.0 }),
  win:        new Howl({ src: ['/sounds/win.mp3'], volume: 0.6 }),
  exceed:     new Howl({ src: ['/sounds/exceed.mp3'], volume: 0.4 }),
  hop:        new Howl({ src: ['/sounds/hop.mp3'], volume: 0.2 }),
}

export function useAudio() {
  const musicMuted = useRef(false)

  const playBackground = () => {
    if (!sounds.background.playing()) sounds.background.play()
  }

  const stopBackground = () => {
    sounds.background.stop()
  }

  const toggleMusic = () => {
    musicMuted.current = !musicMuted.current
    if (musicMuted.current) {
      sounds.background.pause()
    } else {
      if (!sounds.background.playing()) sounds.background.play()
    }
    return !musicMuted.current
  }

  const isMusicMuted = () => musicMuted.current

  const playDice   = () => sounds.dice.play()
  const playSnake  = () => sounds.snake.play()
  const playLadder = () => sounds.ladder.play()
  const playWin    = () => sounds.win.play()
  const playExceed = () => sounds.exceed.play()
  const playHop    = () => sounds.hop.play()
  

  return {
    playBackground,
    stopBackground,
    toggleMusic,
    isMusicMuted,
    playDice,
    playSnake,
    playLadder,
    playWin,
    playExceed,
    playHop,
  }
}