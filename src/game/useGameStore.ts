import { create } from 'zustand'
import type { GameState, GameMode, BoardConfig } from './board'
import { createGameState, takeTurn, DEFAULT_CONFIG } from './board'

export interface RollEntry {
  playerName: string
  roll: number
  event: 'snake' | 'ladder' | 'none' | 'overshoot'
}

export interface LastMove {
  playerId: number
  playerIndex: number
  fromSquare: number
  toSquare: number
  finalSquare: number
  isOvershoot: boolean
}

interface GameStore {
  gameState: GameState | null
  config: BoardConfig
  rolling: boolean
  rollHistory: RollEntry[]
  lastMove: LastMove | null
  startGame: (mode: GameMode, playerNames?: string[]) => void
  nextTurn: () => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  config: DEFAULT_CONFIG,
  rolling: false,
  rollHistory: [],
  lastMove: null,

  startGame: (mode, playerNames) => {
    set({ gameState: createGameState(mode, playerNames), rollHistory: [], lastMove: null })
  },

  nextTurn: () => {
    const { gameState, config, rolling } = get()
    if (!gameState || gameState.winner || rolling) return

    const playerIndex = gameState.currentPlayerIndex
    const player = gameState.players[playerIndex]
    const fromSquare = player.position

    set({ rolling: true })

    setTimeout(() => {
      const newState = takeTurn(gameState, config)
      const roll = newState.lastRoll!
      const rawTo = Math.min(fromSquare + roll, 100)
      const finalSquare = newState.players[playerIndex].position
      const isOvershoot = newState.lastEvent === 'overshoot'

      set((s) => ({
        gameState: newState,
        rolling: false,
        lastMove: {
          playerId: player.id,
          playerIndex,
          fromSquare,
          toSquare: isOvershoot ? fromSquare : rawTo,
          finalSquare: isOvershoot ? fromSquare : finalSquare,
          isOvershoot,
        },
        rollHistory: newState.lastRoll !== null
          ? [...s.rollHistory, {
              playerName: player.name,
              roll: newState.lastRoll!,
              event: (newState.lastEvent ?? 'none') as RollEntry['event'],
            }]
          : s.rollHistory,
      }))
    }, 1500)
  },

  resetGame: () => {
    set({ gameState: null, rollHistory: [], rolling: false, lastMove: null })
  },
}))