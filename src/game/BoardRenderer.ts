import * as PIXI from 'pixi.js'
import { squareToGrid, DEFAULT_CONFIG } from './board'
import type { BoardConfig, Player } from './board'

const GRID    = 10
const CELL    = 66
const BOARD_PX = GRID * CELL

const TEXT_COLOR  = 0x2c2c2a
const CELL_LIGHT  = 0xf5f3ee
const CELL_DARK   = 0xe2dfd6

function squareToPixel(square: number): { x: number; y: number } {
  const { col, row } = squareToGrid(square)
  return {
    x: col * CELL + CELL / 2,
    y: (9 - row) * CELL + CELL / 2,
  }
}

function animateTo(
  container: PIXI.Container,
  targetX: number,
  targetY: number,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const startX = container.x
    const startY = container.y
    const startTime = performance.now()
    function tick() {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      container.x = startX + (targetX - startX) * ease
      container.y = startY + (targetY - startY) * ease
      if (t < 1) requestAnimationFrame(tick)
      else { container.x = targetX; container.y = targetY; resolve() }
    }
    requestAnimationFrame(tick)
  })
}

function shakeToken(container: PIXI.Container): Promise<void> {
  return new Promise((resolve) => {
    const originX = container.x
    const shakes = [5, -5, 4, -4, 3, -3, 2, -2, 0]
    let i = 0
    function next() {
      if (i >= shakes.length) { container.x = originX; resolve(); return }
      container.x = originX + shakes[i]
      i++
      setTimeout(next, 50)
    }
    next()
  })
}

function drawLadder(gfx: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const uy = dy / len
  const px = -uy * 7
  const py = (dx / len) * 7

  const RAIL_COLOR   = 0x8B5E3C
  const RUNG_COLOR   = 0xC49A6C
  const SHADOW_COLOR = 0x5C3D1E

  gfx.moveTo(x1 + px + 1, y1 + py + 1).lineTo(x2 + px + 1, y2 + py + 1).stroke({ color: SHADOW_COLOR, width: 4, alpha: 0.3 })
  gfx.moveTo(x1 - px + 1, y1 - py + 1).lineTo(x2 - px + 1, y2 - py + 1).stroke({ color: SHADOW_COLOR, width: 4, alpha: 0.3 })
  gfx.moveTo(x1 + px, y1 + py).lineTo(x2 + px, y2 + py).stroke({ color: RAIL_COLOR, width: 4 })
  gfx.moveTo(x1 - px, y1 - py).lineTo(x2 - px, y2 - py).stroke({ color: RAIL_COLOR, width: 4 })

  const rungCount = Math.max(2, Math.floor(len / 22))
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount
    const rx = x1 + dx * t
    const ry = y1 + dy * t
    gfx.moveTo(rx + px, ry + py).lineTo(rx - px, ry - py).stroke({ color: RUNG_COLOR, width: 3 })
  }
  gfx.moveTo(x1 + px, y1 + py).lineTo(x1 - px, y1 - py).stroke({ color: RUNG_COLOR, width: 3 })
  gfx.moveTo(x2 + px, y2 + py).lineTo(x2 - px, y2 - py).stroke({ color: RUNG_COLOR, width: 3 })
}

function drawSnake(
  gfx: PIXI.Graphics,
  headX: number, headY: number,
  tailX: number, tailY: number,
  colorBody: number,
  colorBelly: number
) {
  const dx = tailX - headX
  const dy = tailY - headY
  const len = Math.sqrt(dx * dx + dy * dy)

  const mid1X = headX + dx * 0.3 + dy * 0.35
  const mid1Y = headY + dy * 0.3 - dx * 0.35
  const mid2X = headX + dx * 0.7 - dy * 0.35
  const mid2Y = headY + dy * 0.7 + dx * 0.35

  gfx.moveTo(headX + 2, headY + 2)
  gfx.bezierCurveTo(mid1X + 2, mid1Y + 2, mid2X + 2, mid2Y + 2, tailX + 2, tailY + 2)
  gfx.stroke({ color: 0x000000, width: 13, alpha: 0.15, cap: 'round' })

  gfx.moveTo(headX, headY)
  gfx.bezierCurveTo(mid1X, mid1Y, mid2X, mid2Y, tailX, tailY)
  gfx.stroke({ color: colorBody, width: 12, cap: 'round' })

  gfx.moveTo(headX, headY)
  gfx.bezierCurveTo(mid1X, mid1Y, mid2X, mid2Y, tailX, tailY)
  gfx.stroke({ color: colorBelly, width: 6, cap: 'round' })

  const steps = Math.floor(len / 18)
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const bx = Math.pow(1-t,3)*headX + 3*Math.pow(1-t,2)*t*mid1X + 3*(1-t)*t*t*mid2X + t*t*t*tailX
    const by = Math.pow(1-t,3)*headY + 3*Math.pow(1-t,2)*t*mid1Y + 3*(1-t)*t*t*mid2Y + t*t*t*tailY
    if (i % 2 === 0) gfx.circle(bx, by, 3).fill({ color: colorBody, alpha: 0.6 })
  }

  const headAngle = Math.atan2(headY - mid1Y, headX - mid1X)
  const eyeOffX = Math.cos(headAngle + Math.PI / 2) * 4
  const eyeOffY = Math.sin(headAngle + Math.PI / 2) * 4

  gfx.circle(headX + eyeOffX + Math.cos(headAngle) * 4, headY + eyeOffY + Math.sin(headAngle) * 4, 2.5).fill(0xffffff)
  gfx.circle(headX - eyeOffX + Math.cos(headAngle) * 4, headY - eyeOffY + Math.sin(headAngle) * 4, 2.5).fill(0xffffff)
  gfx.circle(headX + eyeOffX + Math.cos(headAngle) * 4, headY + eyeOffY + Math.sin(headAngle) * 4, 1.2).fill(0x111111)
  gfx.circle(headX - eyeOffX + Math.cos(headAngle) * 4, headY - eyeOffY + Math.sin(headAngle) * 4, 1.2).fill(0x111111)

  gfx.circle(headX, headY, 10).fill(colorBody)
  gfx.circle(headX, headY, 10).stroke({ color: 0x000000, width: 1, alpha: 0.2 })

  const tongueLen = 10
  const tongueAngle = headAngle
  const tx = headX + Math.cos(tongueAngle) * 10
  const ty = headY + Math.sin(tongueAngle) * 10
  const fork = 0.35
  gfx.moveTo(headX + Math.cos(tongueAngle) * 2, headY + Math.sin(tongueAngle) * 2).lineTo(tx, ty).stroke({ color: 0xe63946, width: 1.5 })
  gfx.moveTo(tx, ty).lineTo(tx + Math.cos(tongueAngle + fork) * tongueLen * 0.5, ty + Math.sin(tongueAngle + fork) * tongueLen * 0.5).stroke({ color: 0xe63946, width: 1.5 })
  gfx.moveTo(tx, ty).lineTo(tx + Math.cos(tongueAngle - fork) * tongueLen * 0.5, ty + Math.sin(tongueAngle - fork) * tongueLen * 0.5).stroke({ color: 0xe63946, width: 1.5 })

  const tailAngle = Math.atan2(tailY - mid2Y, tailX - mid2X)
  gfx.moveTo(tailX - Math.cos(tailAngle) * 6, tailY - Math.sin(tailAngle) * 6).lineTo(tailX + Math.cos(tailAngle) * 8, tailY + Math.sin(tailAngle) * 8).stroke({ color: colorBody, width: 4, cap: 'round' })
  gfx.moveTo(tailX, tailY).lineTo(tailX + Math.cos(tailAngle) * 8, tailY + Math.sin(tailAngle) * 8).stroke({ color: colorBelly, width: 2, cap: 'round' })
}

const SNAKE_COLORS = [
  [0x2d6a2d, 0x90ee90],
  [0x8b0000, 0xff6b6b],
  [0x6a0dad, 0xda90ff],
  [0xb8621a, 0xffd580],
  [0x1a5276, 0x85c1e9],
  [0x4a235a, 0xf1948a],
]

export class BoardRenderer {
  app: PIXI.Application
  private config: BoardConfig
  private tokenLayer: PIXI.Container = new PIXI.Container()
  private tokenSprites: Map<number, PIXI.Container> = new Map()
  public animating: boolean = false

  constructor(config: BoardConfig = DEFAULT_CONFIG) {
    this.app = new PIXI.Application()
    this.config = config
  }

  async init(container: HTMLElement) {
    await this.app.init({
      width: BOARD_PX,
      height: BOARD_PX,
      backgroundColor: 0xffffff,
      antialias: true,
    })
    container.appendChild(this.app.canvas)
    this.drawBoard()
    this.drawLadders()
    this.drawSnakes()
    this.app.stage.addChild(this.tokenLayer)
  }

  private drawBoard() {
    for (let square = 1; square <= 100; square++) {
      const { col, row } = squareToGrid(square)
      const x = col * CELL
      const y = (9 - row) * CELL
      const g = new PIXI.Graphics()
      const fill = (col + row) % 2 === 0 ? CELL_LIGHT : CELL_DARK
      g.rect(x, y, CELL, CELL).fill(fill).stroke({ color: 0xcccccc, width: 0.5 })
      this.app.stage.addChild(g)
      const label = new PIXI.Text({
        text: String(square),
        style: { fontSize: 11, fill: TEXT_COLOR, fontFamily: 'sans-serif' }
      })
      label.x = x + 4
      label.y = y + 4
      this.app.stage.addChild(label)
    }
  }

  private drawLadders() {
    const gfx = new PIXI.Graphics()
    for (const [from, to] of Object.entries(this.config.ladders)) {
      const a = squareToPixel(Number(from))
      const b = squareToPixel(Number(to))
      drawLadder(gfx, a.x, a.y, b.x, b.y)
    }
    this.app.stage.addChild(gfx)
  }

  private drawSnakes() {
    const gfx = new PIXI.Graphics()
    let colorIndex = 0
    for (const [from, to] of Object.entries(this.config.snakes)) {
      const a = squareToPixel(Number(from))
      const b = squareToPixel(Number(to))
      const [body, belly] = SNAKE_COLORS[colorIndex % SNAKE_COLORS.length]
      drawSnake(gfx, a.x, a.y, b.x, b.y, body, belly)
      colorIndex++
    }
    this.app.stage.addChild(gfx)
  }

  private getOrCreateToken(player: Player, _index: number): PIXI.Container {
    if (this.tokenSprites.has(player.id)) return this.tokenSprites.get(player.id)!
    const token = new PIXI.Graphics()
    token.circle(0, 0, 14).fill(player.color).stroke({ color: 0xffffff, width: 2 })
    const label = new PIXI.Text({
      text: String(player.id + 1),
      style: { fontSize: 12, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'sans-serif' }
    })
    label.anchor.set(0.5)
    const container = new PIXI.Container()
    container.addChild(token)
    container.addChild(label)
    container.x = -100
    container.y = -100
    this.tokenLayer.addChild(container)
    this.tokenSprites.set(player.id, container)
    return container
  }

  private tokenOffset(index: number): { dx: number; dy: number } {
    return index === 0 ? { dx: -10, dy: 0 } : { dx: 10, dy: 0 }
  }

  async shakePlayer(playerId: number): Promise<void> {
    const sprite = this.tokenSprites.get(playerId)
    if (!sprite) return
    await shakeToken(sprite)
  }

  async animatePlayerMove(
    player: Player,
    fromSquare: number,
    toSquare: number,
    finalSquare: number,
    playerIndex: number,
    onLanded?: () => void,
    onEventDone?: () => void,
    onStep?: () => void
  ): Promise<void> {
    this.animating = true
    try {
      const sprite = this.getOrCreateToken(player, playerIndex)
      const offset = this.tokenOffset(playerIndex)

      if (fromSquare === 0) {
        const startPos = squareToPixel(1)
        sprite.x = startPos.x + offset.dx - CELL
        sprite.y = startPos.y + offset.dy
      }

      await new Promise(r => setTimeout(r, 600))

      for (let sq = fromSquare + 1; sq <= toSquare; sq++) {
        const pos = squareToPixel(sq)
        onStep?.()
        await animateTo(sprite, pos.x + offset.dx, pos.y + offset.dy, 220)
      }

      onLanded?.()

      if (finalSquare !== toSquare) {
        await new Promise(r => setTimeout(r, 300))
        await this.scaleToken(sprite, 1.3, 120)
        onEventDone?.()
        const isSnake = finalSquare < toSquare
        const finalPos = squareToPixel(finalSquare)
        await animateTo(sprite, finalPos.x + offset.dx, finalPos.y + offset.dy, isSnake ? 600 : 500)
        await this.scaleToken(sprite, 1.0, 100)
      } else {
        onEventDone?.()
      }
    } finally {
      this.animating = false
    }
  }

  private scaleToken(sprite: PIXI.Container, targetScale: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startScale = sprite.scale.x
      const startTime = performance.now()
      function tick() {
        const t = Math.min((performance.now() - startTime) / duration, 1)
        sprite.scale.set(startScale + (targetScale - startScale) * t)
        if (t < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
  }

  updateTokens(players: Player[]) {
    players.forEach((player, i) => {
      const sprite = this.getOrCreateToken(player, i)
      const offset = this.tokenOffset(i)
      if (player.position === 0) { sprite.x = -100; sprite.y = -100; return }
      const pos = squareToPixel(player.position)
      sprite.x = pos.x + offset.dx
      sprite.y = pos.y + offset.dy
    })
  }

  clearTokens() {
    this.tokenLayer.removeChildren()
    this.tokenSprites.clear()
  }

  destroy() {
    if (this.app && this.app.renderer) this.app.destroy(true)
  }
}