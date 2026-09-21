import { useEffect, useRef, useState } from 'react'
import { BoardRenderer } from './game/BoardRenderer'
import { useGameStore } from './game/useGameStore'
import { useAudio } from './hooks/useAudio'
import Dice from './components/Dice'
import RollHistory from './components/RollHistory'
import MusicToggle from './components/MusicToggle'
import NameEntry from './components/NameEntry'

const BOARD_RENDER_SIZE = 660

function useBoardScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function update() {
      if (window.innerWidth >= 768) {
        setScale(1)
        return
      }

      const available = window.innerWidth - 24

      const fitScale = available / BOARD_RENDER_SIZE

      // Make board 90% of its normal fitted mobile size
      setScale(Math.min(fitScale, 1) * 0.8)
    }

    update()
    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export default function App() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const rendererRef    = useRef<BoardRenderer | null>(null)
  const initializedRef = useRef(false)
  const [animating, setAnimating]         = useState(false)
  const [flashRed, setFlashRed]           = useState(false)
  const [pendingMode, setPendingMode]     = useState<'1p' | '2p' | null>(null)
  const [displayEvent, setDisplayEvent]   = useState<'snake' | 'ladder' | 'none' | 'overshoot' | null>(null)
  const [displayWinner, setDisplayWinner] = useState<string | null>(null)
  const [isMobile, setIsMobile]           = useState(false)

  const boardScale = useBoardScale()
  const boardDisplaySize = BOARD_RENDER_SIZE * boardScale

  const { gameState, rolling, rollHistory, lastMove, startGame, nextTurn, resetGame } = useGameStore()
  const audio = useAudio()

  const gameStateRef = useRef(gameState)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])

  // Track mobile breakpoint
  useEffect(() => {
    function update() { setIsMobile(window.innerWidth < 768) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const triggerRedFlash = () => {
    setFlashRed(true)
    setTimeout(() => setFlashRed(false), 600)
  }

  // Boot PixiJS once
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

  // Animate on move
  useEffect(() => {
    if (!lastMove || !rendererRef.current) return
    const gs = gameStateRef.current
    if (!gs) return
    const player = gs.players[lastMove.playerIndex]

    if (lastMove.isOvershoot) {
      setDisplayEvent(null)
      setAnimating(true)
      rendererRef.current.shakePlayer(lastMove.playerId).then(() => {
        setAnimating(false)
        setDisplayEvent('overshoot')
      })
      audio.playExceed()
      return
    }

    setDisplayEvent(null)
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
  }, [lastMove])

  useEffect(() => {
    if (!gameState || !rendererRef.current) return
    if (gameState.players.every(p => p.position === 0)) rendererRef.current.clearTokens()
  }, [gameState])

  const gameActiveRef = useRef(false)
  useEffect(() => {
    if (gameState && !gameState.winner) {
      if (!gameActiveRef.current) { audio.playBackground(); gameActiveRef.current = true }
    } else {
      audio.stopBackground()
      gameActiveRef.current = false
    }
  }, [!!gameState, gameState?.winner])

  useEffect(() => {
    if (rolling) {
      const t = setTimeout(() => audio.playDice(), 75)
      return () => clearTimeout(t)
    }
  }, [rolling])

  useEffect(() => {
    if (!gameState || gameState.winner || rolling || animating) return
    const cp = gameState.players[gameState.currentPlayerIndex]
    if (cp.isAI) {
      const t = setTimeout(() => nextTurn(), 900)
      return () => clearTimeout(t)
    }
  }, [gameState, rolling, animating, nextTurn])

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex]
  const isHumanTurn   = currentPlayer && !currentPlayer.isAI && !rolling && !animating

  const handleReset = () => {
    resetGame()
    audio.stopBackground()
    setDisplayWinner(null)
    setDisplayEvent(null)
  }

  // ── Shared sub-components ──────────────────────────────────────────

  const playerCards = gameState && (
    <div className={`flex ${isMobile ? 'flex-row gap-2' : 'flex-col gap-2'}`}>
      {gameState.players.map((p) => (
        <div
          key={p.id}
          className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
            isMobile ? 'flex-1 px-2 py-1.5 mt-8' : 'px-4 py-3'
          } ${
            gameState.currentPlayerIndex === p.id
              ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-md border-2 border-purple-400 shadow-2xl scale-[1.02]'
              : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'
          }`}
        >
          {gameState.currentPlayerIndex === p.id && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
          )}
          <div className="relative flex justify-between items-center gap-1">
            <div className="min-w-0">
              <div className={`font-bold truncate ${isMobile ? 'text-xs' : 'text-lg'} ${gameState.currentPlayerIndex === p.id ? 'text-white' : 'text-white/90'}`}>
                {p.name}
                {gameState.currentPlayerIndex === p.id && (
                  <span className={`ml-1 bg-white/20 rounded-full ${isMobile ? 'text-[9px] px-1' : 'text-xs px-2 py-0.5'}`}>
                    {isMobile ? '▶' : 'Turn'}
                  </span>
                )}
              </div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} ${gameState.currentPlayerIndex === p.id ? 'text-purple-200' : 'text-white/60'}`}>
                {p.position === 0 ? '🏁 Start' : `${isMobile ? '#' : 'Square '}${p.position}`}
              </div>
            </div>
            <div className={`flex-shrink-0 rounded-full bg-gradient-to-br ${p.color === 0x3b82f6 ? 'from-blue-400 to-blue-600' : 'from-red-400 to-red-600'} border-2 border-white/50 ${isMobile ? 'w-5 h-5' : 'w-10 h-10'}`} />
          </div>
        </div>
      ))}
    </div>
  )

  const dicePanel = gameState && (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-3 shadow-xl">
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-10 ${rolling ? 'animate-pulse' : ''}`} />
          <div className="relative bg-white/0 rounded-2xl p-4 shadow-inner">
            <Dice lastRoll={gameState.lastRoll} rolling={rolling} />
          </div>
        </div>
        {displayEvent === 'snake'    && !rolling && !animating && <p className="text-red-400    text-xs font-medium bg-red-500/10    px-2 py-1 rounded-full">🐍 Snake!</p>}
        {displayEvent === 'ladder'   && !rolling && !animating && <p className="text-green-400  text-xs font-medium bg-green-500/10  px-2 py-1 rounded-full">🪜 Ladder!</p>}
        {displayEvent === 'overshoot' && !rolling && !animating && (() => {
          const prev = gameState.players[(gameState.currentPlayerIndex + gameState.players.length - 1) % gameState.players.length]
          return <p className="text-orange-400 text-xs font-medium bg-orange-500/10 px-2 py-1 rounded-full">🎲 Need {100 - prev.position}</p>
        })()}
      </div>
    </div>
  )

  const rollButton = (
    isHumanTurn ? (
      <button
        onClick={nextTurn}
        disabled={animating || rolling}
        className="relative group w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base transform transition-all duration-200 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative flex items-center justify-center gap-2">
          Roll <span className="text-lg group-hover:rotate-12 transition-transform">🎲</span>
        </span>
      </button>
    ) : (
      <div className="w-full py-3 bg-white/5 backdrop-blur-md rounded-xl font-bold text-sm text-center border border-white/10">
        <span className="flex items-center justify-center gap-2 text-white/70">
          <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          {rolling ? 'Rolling...' : animating ? 'Moving...' : 'Thinking...'}
        </span>
      </div>
    )
  )

  const historyPanel = (
     <div className="relative flex-1 min-w-0 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-xl shadow-black/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_70%)]" />
      <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">History</div>
        <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" />
      </div>
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative p-4 pt-3">
        <div className="rounded-xl bg-black/20 border border-white/10 p-3">
          <RollHistory history={rollHistory} />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  )

  const quitButton = (
    <button
      onClick={handleReset}
      className="group inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium"
    >
      <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
      Quit game
    </button>
  )



  const winnerScreen = displayWinner && (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping text-7xl">🏆</div>
          <div className="relative text-7xl animate-bounce">🏆</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
            {displayWinner} wins!
          </div>
          <div className="text-white/50 text-sm mt-2">Congratulations! 🎉</div>
        </div>
        <RollHistory history={rollHistory} />
        <button
          onClick={handleReset}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
        >
          Play Again 🔄
        </button>
      </div>
    </div>
  )

  // ── The board element (shared between layouts) ──────────────────────

  const boardElement = (
    <div
      className="relative flex-shrink-0"
      style={
        isMobile
          ? {
              width: boardDisplaySize,
              height: boardDisplaySize,
              touchAction: 'pan-y',
            }
          : undefined
      }
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
      <div
        className="relative bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
        style={isMobile ? {
          width: BOARD_RENDER_SIZE,
          height: BOARD_RENDER_SIZE,
          transform: `scale(${boardScale})`,
          transformOrigin: 'top left',
        } : undefined}
      >
        <div ref={containerRef} className="rounded-xl overflow-hidden shadow-inner" />
      </div>
    </div>
  )

  // ── DESKTOP layout ──────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="h-dvh overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center py-8">
        <div className="fixed inset-0 bg-black/20 pointer-events-none" />
        <div className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(239,68,68,0.3)', backdropFilter: flashRed ? 'blur(2px)' : 'none', opacity: flashRed ? 1 : 0 }}
        />

        <div className="relative z-10 flex flex-row items-start gap-8">
          {/* Board */}
          {boardElement}

          {/* Controls */}
          <div className="flex flex-col gap-4 w-[420px]">
            {/* Header + mode selection */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                  Snakes & Ladders
                </h1>
                <MusicToggle onToggle={audio.toggleMusic} />
              </div>
              {!gameState && (
                <div className="space-y-3">
                  {pendingMode ? (
                    <NameEntry
                      mode={pendingMode}
                      onStart={(names) => { startGame(pendingMode, names); setPendingMode(null) }}
                      onBack={() => setPendingMode(null)}
                    />
                  ) : (
                    <>
                      <p className="text-white/70 text-sm text-center">Choose the number of players</p>
                      <button onClick={() => setPendingMode('1p')} className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                        Play against Nebula
                      </button>
                      <button onClick={() => setPendingMode('2p')} className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                        2 Players
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {gameState && !displayWinner && (
              <>
                {playerCards}
                <div className="flex flex-row gap-3 items-stretch">
                  {/* Dice + Roll */}
                  <div className="flex flex-col gap-3 w-36 flex-shrink-0">
                    {dicePanel}
                    {rollButton}
                  </div>

                  {/* History gets the remaining space */}
                  {historyPanel}
                </div>
                {quitButton}
              </>
            )}

            {winnerScreen}
          </div>
        </div>
      </div>
    )
  }

  // ── MOBILE layout ───────────────────────────────────────────────────
  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center p-0 pb-6">
      <div className="fixed inset-0 bg-black/20 pointer-events-none" />
      <div className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(239,68,68,0.3)', backdropFilter: flashRed ? 'blur(2px)' : 'none', opacity: flashRed ? 1 : 0 }}
      />

      <div className="relative z-10 w-full flex flex-col items-center">

      {/* Top controls */}
      <div
        className="w-full flex items-center justify-between px-3 py-2 mb-4"
        style={{ maxWidth: boardDisplaySize }}
      >
        {gameState ? (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-xs font-medium"
          >
            <span>←</span>
            Quit
          </button>
        ) : (
          <div />
        )}

        <MusicToggle onToggle={audio.toggleMusic} />
      </div>

      {/* Board scales to fit screen */}
      {boardElement}

        {/* Controls below board */}
        <div className="w-full px-3 py-2 flex flex-col gap-2" style={{ maxWidth: boardDisplaySize }}>


          {/* Mode selection on mobile */}
          {!gameState && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 mt-4 border border-white/20 space-y-2">
              {pendingMode ? (
                <NameEntry
                  mode={pendingMode}
                  onStart={(names) => { startGame(pendingMode, names); setPendingMode(null) }}
                  onBack={() => setPendingMode(null)}
                />
              ) : (
                <>
                  <p className="text-white/70 text-xs text-center">Choose game mode</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPendingMode('1p')} className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold transition-all">
                      vs Nebula 🤖
                    </button>
                    <button onClick={() => setPendingMode('2p')} className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-semibold transition-all">
                      2 Players 👥
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {gameState && !displayWinner && (
            <>
              {/* Player cards side by side */}
              {playerCards}

              {/* Dice + roll button + history in one row */}
              <div className="flex gap-2 items-stretch">
                <div className="flex flex-col gap-1.5 w-28 flex-shrink-0">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 flex flex-col items-center gap-1">
                    <Dice lastRoll={gameState.lastRoll} rolling={rolling} />
                    {displayEvent === 'snake'     && !rolling && !animating && <p className="text-red-400    text-[10px] bg-red-500/10    px-1.5 py-0.5 rounded-full">🐍 Snake!</p>}
                    {displayEvent === 'ladder'    && !rolling && !animating && <p className="text-green-400  text-[10px] bg-green-500/10  px-1.5 py-0.5 rounded-full">🪜 Ladder!</p>}
                    {displayEvent === 'overshoot' && !rolling && !animating && (() => {
                      const prev = gameState.players[(gameState.currentPlayerIndex + gameState.players.length - 1) % gameState.players.length]
                      return <p className="text-orange-400 text-[10px] bg-orange-500/10 px-1.5 py-0.5 rounded-full">Need {100 - prev.position}</p>
                    })()}
                  </div>
                  {isHumanTurn ? (
                    <button onClick={nextTurn} disabled={animating || rolling}
                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                      Roll 🎲
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-white/5 rounded-xl text-[10px] text-center border border-white/10 text-white/60">
                      <span className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                        {rolling ? 'Rolling...' : animating ? 'Moving...' : 'Thinking...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* History fills remaining width */}
                <div className="flex-1 min-w-0 h-36 relative rounded-xl overflow-hidden border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl flex flex-col">

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_70%)]" />

                  {/* Header */}
                  <div className="relative flex-shrink-0 flex items-center justify-between px-3 pt-2 pb-1">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      History
                    </div>

                    <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                  </div>

                  <div className="mx-3 flex-shrink-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  {/* Scrollable history */}
                  <div className="relative flex-1 min-h-0 overflow-y-auto p-2">
                    <div className="rounded-lg bg-black/20 border border-white/10 p-2">
                      <RollHistory history={rollHistory} />
                    </div>
                  </div>

                </div>
              </div>

              
            </>
          )}

          {/* Winner on mobile */}
          {displayWinner && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping text-5xl">🏆</div>
                  <div className="relative text-5xl animate-bounce">🏆</div>
                </div>
                <div className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                  {displayWinner} wins!
                </div>
                <RollHistory history={rollHistory} />
                <button onClick={handleReset}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold transition-all">
                  Play Again 🔄
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}