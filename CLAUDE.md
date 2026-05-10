# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Tetris game project. No source code has been written yet — this is a greenfield repo initialized with bkit at Dynamic level (Phase 1).

## Workflow

This project uses [bkit](https://bkit.dev) PDCA methodology at **Dynamic level** (fullstack with BaaS). The bkit state lives in `.bkit/`. Key commands:

- `/pdca` — manage the PDCA cycle (plan, design, do, check, act)
- `/dynamic` — fullstack development guide (auth, database, API)
- `/phase-3-mockup` — UI/UX mockups before implementation
- `/phase-4-api` — API design and backend implementation
- `/phase-6-ui-integration` — frontend/backend integration

## Architecture

- **Level**: Starter (pure frontend, no backend)
- **Framework**: Vanilla JS + Canvas 2D (no dependencies)
- **Entry point**: `index.html`
- **Dev server**: ES Modules require HTTP — use `npx serve .`, `python -m http.server 8080`, or VS Code Live Server
- **Do NOT open index.html directly** via `file://` — ES Modules will fail (CORS)
- **No build step** — open `index.html` directly in browser

### Module Structure

| File | Responsibility |
|------|---------------|
| `src/game.js` | Game loop, state machine |
| `src/board.js` | 10×20 grid logic, line clearing |
| `src/piece.js` | Tetromino definitions (7 types), SRS rotation |
| `src/renderer.js` | Canvas 2D rendering only |
| `src/input.js` | Button clicks + keyboard events |
| `src/scoring.js` | Score/level calculation |
| `src/save.js` | Base64 encode/decode game state |

### Key Design Decisions

- **Rendering**: Canvas 2D with `requestAnimationFrame` for 60fps
- **Rotation**: SRS (Super Rotation System) with wall-kick tables
- **Block generation**: 7-bag randomizer
- **Save system**: Base64-encoded game state string (board + score + level + next pieces) — copy button included
- **Controls (mobile buttons)**: 3 buttons / 4 functions
  - [◄ Left move] [↻ Rotate: short=CW rotate, long≥500ms=hard drop] [► Right move]
- **Controls (keyboard)**: ← → move, ↑ rotate CW, Space hard drop, ↓ soft drop
- **Rotation**: SRS (Super Rotation System) with wall-kick tables — `rotateCW()` in `src/piece.js`
- **Long-press detection**: `pointerdown` timer, 500ms threshold, `longPressTriggered` flag prevents double-fire
- **Save code format**: `"TG1:{base64}"` — compact JSON (board as 200-char string, pieces, score, level, lines)
- **No external libraries** — zero dependencies

### Game Loop

`game.js` uses `requestAnimationFrame` with delta-time accumulator:
```
rAF → delta += elapsed → if delta >= LEVEL_SPEEDS[level-1] → drop piece → delta = 0
```

### Data Model Key Points

- Board: `number[20][10]` — 0=empty, 1-7=tetromino color ID
- Piece: `{ type, x, y, rotation }` — position is top-left of bounding box
- GameState is plain data (no methods) — enables `JSON.stringify` for save
