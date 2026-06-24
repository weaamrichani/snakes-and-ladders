
export const BOARD_SIZE = 100

export interface BoardConfig {
  snakes: Record<number, number>  // head -> tail
  ladders: Record<number, number> // bottom -> top
}

export const DEFAULT_CONFIG: BoardConfig = {
  snakes: {
    99: 78,
    95: 56,
    87: 24,
    62: 19,
    54: 34,
    17: 7,
  },
  ladders: {
    4:  14,
    9:  31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
  },
}

export function applyBoardEvent(
  position: number,
  config: BoardConfig
): { newPosition: number; event: 'snake' | 'ladder' | 'none' } {
  if (config.snakes[position] !== undefined) {
    return { newPosition: config.snakes[position], event: 'snake' }
  }
  if (config.ladders[position] !== undefined) {
    return { newPosition: config.ladders[position], event: 'ladder' }
  }
  return { newPosition: position, event: 'none' }
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1
}

export function movePlayer(current: number, roll: number): number | null {
  const next = current + roll
  return next > BOARD_SIZE ? null : next  // null = invalid move
}

// Convert square number (1-100) to [col, row] on the board grid
// Row 0 = bottom, row 9 = top. Odd rows go right-to-left (snaking pattern)
export function squareToGrid(square: number): { col: number; row: number } {
  const index = square - 1
  const row = Math.floor(index / 10)
  const col = row % 2 === 0 ? index % 10 : 9 - (index % 10)
  return { col, row }
}


// --- Player & Game State ---

export type GameMode = '1p' | '2p'

export interface Player {
  id: number
  name: string
  position: number
  color: number  // hex color for token
  isAI: boolean
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  lastRoll: number | null
  lastEvent: 'snake' | 'ladder' | 'none' | 'overshoot' | null
  winner: Player | null
  mode: GameMode
}

export function createGameState(mode: GameMode, playerNames?: string[]): GameState {
  const players: Player[] =
    mode === '1p'
      ? [
          { id: 0, name: playerNames?.[0] || 'You', position: 0, color: 0x3b82f6, isAI: false },
          { id: 1, name: 'Nebula', position: 0, color: 0xef4444, isAI: true },
        ]
      : [
          { id: 0, name: playerNames?.[0] || 'Player 1', position: 0, color: 0x3b82f6, isAI: false },
          { id: 1, name: playerNames?.[1] || 'Player 2', position: 0, color: 0xef4444, isAI: false },
        ]

  return {
    players,
    currentPlayerIndex: 0,
    lastRoll: null,
    lastEvent: null,
    winner: null,
    mode,
  }
}

export function takeTurn(state: GameState, config: BoardConfig): GameState {
  if (state.winner) return state

  const players = state.players.map(p => ({ ...p }))
  const player = players[state.currentPlayerIndex]
  const roll = rollDice()
  const moved = movePlayer(player.position, roll)

  // Overshoot — player can't move, turn passes
  if (moved === null) {
    return {
      ...state,
      players,
      lastRoll: roll,
      lastEvent: 'overshoot' as any,
      winner: null,
      currentPlayerIndex: (state.currentPlayerIndex + 1) % players.length,
    }
  }

  const { newPosition, event } = applyBoardEvent(moved, config)
  player.position = newPosition
  const winner = newPosition >= BOARD_SIZE ? player : null
  const nextIndex = (state.currentPlayerIndex + 1) % players.length

  return {
    ...state,
    players,
    currentPlayerIndex: winner ? state.currentPlayerIndex : nextIndex,
    lastRoll: roll,
    lastEvent: event,
    winner,
  }
}