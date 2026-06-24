# 🐍 Snakes & Ladders — Modern Edition

A reimagined take on the classic board game, built as a full-stack web app with smooth animations, sound design, and a built-in AI opponent. 

Playable on desktop, not suitable for mobile.

Play it live: https://snakes-and-ladders-wr4.vercel.app


## Features:
- Two game modes: play solo against an AI opponent, or pass-and-play with a friend.
- Role History.
- Game audio, smooth animations, effects and feeback.


## Tech Stack:

|    Layer          |     Technology        |
|-------------------|-----------------------|
| UI                | React + TypeScript    |
| Build tool        | Vite                  |
| Rendering         | PixiJS (WebGL canvas) |
| State management  | Zustand               |
| Audio             | Howler.js             |
| Styling           | Tailwind CSS          |
| Deployment        | Vercel                |


## Architecture:

**`src/game/board.ts`** — board layout, dice rolls, snake/ladder resolution, turn logic, and win detection.
**`src/game/BoardRenderer.ts`** — a PixiJS class responsible only for drawing the board and animating tokens. It knows nothing about game rules; it's told what happened and renders it.
**`src/game/useGameStore.ts`** — a Zustand store that bridges the two: it calls the game logic, then exposes state to React components.
**`src/components/`** — presentational React components (dice, roll history, music toggle, name entry).
**`src/hooks/useAudio.ts`** — centralized sound effect and music management via Howler.


## Running locally:

\`\`\`bash
git clone https://github.com/weaamrichani/snakes-and-ladders.git
cd snakes-and-ladders
npm install
npm run dev
\`\`\`

Then open `http://localhost:5173`.



Built by Weaam Richani
GitHub: https://github.com/weaamrichani