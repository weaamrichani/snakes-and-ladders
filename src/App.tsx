import { useEffect, useRef, useState } from 'react'
import { BoardRenderer } from './game/BoardRenderer'
import { useGameStore } from './game/useGameStore'
import { useAudio } from './hooks/useAudio'
import Dice from './components/Dice'
import RollHistory from './components/RollHistory'
import MusicToggle from './components/MusicToggle'
import NameEntry from './components/NameEntry'
import type { GameMode } from './game/board'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<BoardRenderer | null>(null)
  const initializedRef = useRef(false)
  const [animating, setAnimating] = useState(false)
  const [flashRed, setFlashRed] = useState(false)
  const [pendingMode, setPendingMode] = useState<'1p' | '2p' | null>(null)
  const [displayEvent, setDisplayEvent] = useState<'snake' | 'ladder' | 'none' | 'overshoot' | null>(null)
  const [displayWinner, setDisplayWinner] = useState<string | null>(null)

  const { gameState, rolling, rollHistory, lastMove, startGame, nextTurn, resetGame } = useGameStore()
  const audio = useAudio()

  // Keep a ref to gameState so animation callbacks can read it
  // without being listed as a useEffect dependency
  const gameStateRef = useRef(gameState)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])

  const triggerRedFlash = () => {
    setFlashRed(true)
    setTimeout(() => setFlashRed(false), 600)
  }

  // Boot PixiJS renderer once
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true
    const renderer = new BoardRenderer()
    rendererRef.current = renderer
    renderer.init(containerRef.current)
    return () => {
      rendererRef.current?.destroy()
      rendererRef.current = null
      initializedRef.current = false
    }
  }, [])

  // Trigger move animation when lastMove changes
  // Uses gameStateRef instead of gameState to avoid re-triggering mid-animation
  useEffect(() => {
    if (!lastMove || !rendererRef.current) return
    const currentGameState = gameStateRef.current
    if (!currentGameState) return

    const player = currentGameState.players[lastMove.playerIndex]

    if (lastMove.isOvershoot) {
      setDisplayEvent(null)  // clear previous message
      setAnimating(true)
      rendererRef.current.shakePlayer(lastMove.playerId).then(() => {
        setAnimating(false)
        setDisplayEvent('overshoot')
      })
      audio.playExceed()
      return
    }

    setDisplayEvent(null)  // clear previous message before new animation
    setAnimating(true)
    rendererRef.current.animatePlayerMove(
      player,
      lastMove.fromSquare,
      lastMove.toSquare,
      lastMove.finalSquare,
      lastMove.playerIndex,
      () => {},
      () => {
        const latest = gameStateRef.current
        setAnimating(false)
        setDisplayEvent(latest?.lastEvent ?? null)
        if (latest?.winner) {
          setTimeout(() => {
            setDisplayWinner(latest.winner!.name)
            audio.stopBackground()
            audio.playWin()
          }, 800)
        } else if (lastMove.finalSquare !== lastMove.toSquare) {
          if (lastMove.finalSquare < lastMove.toSquare) {
            audio.playSnake()
            triggerRedFlash()
          } else {
            audio.playLadder()
          }
        }
      },
      () => setTimeout(() => audio.playHop(), 105)
    )
  }, [lastMove]) // only lastMove — not gameState

  // Reset tokens when a new game starts (positions all reset to 0)
  useEffect(() => {
    if (!gameState || !rendererRef.current) return
    if (gameState.players.every(p => p.position === 0)) {
      rendererRef.current.clearTokens()
    }
  }, [gameState])

  // Play background music only when game starts or ends
  const gameActiveRef = useRef(false)
  useEffect(() => {
    if (gameState && !gameState.winner) {
      if (!gameActiveRef.current) {
        audio.playBackground()
        gameActiveRef.current = true
      }
    } else {
      audio.stopBackground()
      gameActiveRef.current = false
    }
  }, [!!gameState, gameState?.winner]) // only reacts to game existing / winner

  useEffect(() => {
    if (rolling) {
      const timeout = setTimeout(() => {
        audio.playDice()
      }, 75)

      return () => clearTimeout(timeout) // cleanup in case rolling changes quickly
    }
  }, [rolling])

  // AI auto-turn — waits for animation to finish
  useEffect(() => {
    if (!gameState || gameState.winner || rolling || animating) return
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (currentPlayer.isAI) {
      const timer = setTimeout(() => nextTurn(), 900)
      return () => clearTimeout(timer)
    }
  }, [gameState, rolling, animating, nextTurn])

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex]
  const isHumanTurn = currentPlayer && !currentPlayer.isAI && !rolling && !animating

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      {/* Simple background overlay instead of SVG pattern */}
      <div className="fixed inset-0 bg-black/20 pointer-events-none" />

      {/* Red flash overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          backdropFilter: flashRed ? 'blur(2px)' : 'none',
          opacity: flashRed ? 1 : 0,
        }}
      />

      <div className="relative z-10 flex flex-row items-start gap-8 flex-wrap justify-center">

        {/* LEFT — Game board with modern glass morphism border */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
          <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-2xl">
            <div ref={containerRef} className="rounded-xl overflow-hidden shadow-inner" />
          </div>
        </div>

        {/* RIGHT — Controls panel with glass morphism */}
        <div className="flex flex-col gap-4 w-120 ">
          {/* Modern header with gradient */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                Snakes & Ladders
              </h1>
              <MusicToggle onToggle={audio.toggleMusic} />
            </div>
            
            {/* Mode selection */}
            {!gameState && (
              <div className="space-y-3">
                {pendingMode ? (
                  <NameEntry
                    mode={pendingMode}
                    onStart={(names) => {
                      startGame(pendingMode, names)
                      setPendingMode(null)
                    }}
                    onBack={() => setPendingMode(null)}
                  />
                ) : (
                  <>
                    <p className="text-white/70 text-sm text-center">Choose the number of players</p>
                    <button
                      onClick={() => setPendingMode('1p')}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-102 transition-all duration-200 shadow-lg"
                    >
                      Play against Nebula
                    </button>
                    <button
                      onClick={() => setPendingMode('2p')}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-102 transition-all duration-200 shadow-lg"
                    >
                      2 Players
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Game HUD */}
          {gameState && !displayWinner && (
            <>
              {/* Players cards with modern design */}
              <div className="space-y-2">
                {gameState.players.map((p) => (
                  <div
                    key={p.id}
                    className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                      gameState.currentPlayerIndex === p.id
                        ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-md border-2 border-purple-400 shadow-2xl scale-[1.02]'
                        : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {gameState.currentPlayerIndex === p.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
                    )}
                    <div className="relative flex justify-between items-center">
                      <div>
                        <div className={`font-bold text-lg ${gameState.currentPlayerIndex === p.id ? 'text-white' : 'text-white/90'}`}>
                          {p.name}
                          {gameState.currentPlayerIndex === p.id && (
                            <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Turn</span>
                          )}
                        </div>
                        <div className={`text-sm ${gameState.currentPlayerIndex === p.id ? 'text-purple-200' : 'text-white/60'}`}>
                          {p.position === 0 ? '🏁 Start' : `📍 Square ${p.position}`}
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.color === 0x3b82f6 ? 'from-blue-400 to-blue-600' : 'from-red-400 to-red-600'} shadow-lg border-2 border-white/50`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dice + Roll History side by side */}
              <div className="flex flex-row gap-3">

                {/* LEFT: Dice + Roll button stacked */}
                <div className="flex flex-col gap-3 flex-1">

                  {/* Dice */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-3 shadow-xl">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-10 ${rolling ? 'animate-pulse' : ''}`} />
                        <div className="relative bg-white/0 rounded-2xl p-4 shadow-inner">
                          <Dice lastRoll={gameState.lastRoll} rolling={rolling} />
                        </div>
                      </div>

                      {displayEvent === 'snake' && !rolling && !animating && (
                        <p className="text-red-400 font-medium text-xs flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-full">
                          🐍 Snake!
                        </p>
                      )}
                      {displayEvent === 'ladder' && !rolling && !animating && (
                        <p className="text-green-400 font-medium text-xs flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                          🪜 Ladder!
                        </p>
                      )}
                      {displayEvent === 'overshoot' && !rolling && !animating && (() => {
                        const prevIndex = (gameState.currentPlayerIndex + gameState.players.length - 1) % gameState.players.length
                        const prevPlayer = gameState.players[prevIndex]
                        const needed = 100 - prevPlayer.position
                        return (
                          <p className="text-orange-400 font-medium text-xs flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                            🎲 Need {needed}
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Roll button */}
                  {isHumanTurn ? (
                    <button
                      onClick={nextTurn}
                      disabled={animating || rolling}
                      className="relative group w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base transform transition-all duration-200 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center justify-center gap-2">
                        Roll
                        <span className="text-lg group-hover:rotate-12 transition-transform">🎲</span>
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-white/5 backdrop-blur-md rounded-xl font-bold text-sm text-center border border-white/10">
                      <span className="flex items-center justify-center gap-2 text-white/70">
                        <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        {rolling ? 'Rolling...' : animating ? 'Moving...' : 'Thinking...'}
                      </span>
                    </div>
                  )}
                </div>

              {/* RIGHT: Roll history */}
              <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-xl shadow-black/30">

                {/* glow background */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_70%)]" />

                {/* header */}
                <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Roll history
                  </div>

                  {/* optional subtle indicator dot */}
                  <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" />
                </div>

                {/* divider line */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* content */}
                <div className="relative p-4 pt-3">
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <RollHistory history={rollHistory} />
                  </div>
                </div>

                {/* bottom fade (depth effect) */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              </div>

             {/* Quit button */}
            <button
              onClick={() => { resetGame(); audio.stopBackground(); setDisplayWinner(null); setDisplayEvent(null) }}
              className="group inline-flex items-center gap-2 px-3 py-2 rounded-lg 
                        text-white/90 hover:text-white
                        bg-white/5 hover:bg-white/10
                        border border-white/10 hover:border-white/20
                        backdrop-blur-md
                        transition-all duration-200
                        shadow-sm hover:shadow-md hover:shadow-black/30"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                ←
              </span>
              <span className="text-sm font-medium tracking-wide">
                Quit game
              </span>
            </button>
            </>
          )}

          {/* Winner screen with celebration animation */}
          {displayWinner && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl transition-all duration-500">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <div className="text-7xl">🏆</div>
                </div>
                <div className="relative text-7xl animate-bounce">
                  🏆
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                  {displayWinner} wins!
                </div>
                <div className="text-white/50 text-sm mt-2">Congratulations! 🎉</div>
              </div>
              <RollHistory history={rollHistory} />
              <button
                onClick={() => { resetGame(); audio.stopBackground(); setDisplayWinner(null); setDisplayEvent(null) }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}