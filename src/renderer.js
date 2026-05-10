// Design Ref: §2.1 — Renderer is the sole Canvas writer; receives GameState, never mutates it
// Design Ref: §1.2 — Renderer isolation: no game logic, no imports from game.js

import { COLORS, TYPE_NAMES, getShape } from './piece.js';
import { BOARD_ROWS, BOARD_COLS } from './board.js';

const PREVIEW_GRID = 4;  // preview canvas is 4×4 cells
const GHOST_ALPHA  = 0.22;

export class Renderer {
  constructor() {
    this.canvas   = document.getElementById('game-canvas');
    this.ctx      = this.canvas.getContext('2d');
    this.nCanvas  = document.getElementById('next-canvas');
    this.nCtx     = this.nCanvas.getContext('2d');
    this.nnCanvas = document.getElementById('next-next-canvas');
    this.nnCtx    = this.nnCanvas.getContext('2d');

    this.scoreEl  = document.getElementById('score-display');
    this.levelEl  = document.getElementById('level-display');
    this.linesEl  = document.getElementById('lines-display');

    this.cell = 0;
    this.resize();
  }

  // Recompute cell size and resize all canvases; call on init + window resize
  resize() {
    const vw   = window.innerWidth;
    const appW = Math.min(vw, 580);
    const hPad = vw >= 768 ? 48 : 20;   // app horizontal padding × 2
    const sideW = vw >= 768 ? 120 : 88; // approximate side-panel rendered width
    const gap  = 10;
    const boardW = appW - hPad - sideW - gap;

    this.cell = Math.max(18, Math.floor(boardW / BOARD_COLS));

    this.canvas.width  = this.cell * BOARD_COLS;
    this.canvas.height = this.cell * BOARD_ROWS;

    const prev = this.cell * PREVIEW_GRID;
    this.nCanvas.width  = prev;  this.nCanvas.height  = prev;
    this.nnCanvas.width = prev;  this.nnCanvas.height = prev;
  }

  // Main entry point — game.js calls this once per rAF frame
  // state must include: board, current, next, nextNext, ghostY, score, level, lines
  draw(state) {
    this._drawBoard(state);
    this._drawPreview(this.nCtx,  state.next);
    this._drawPreview(this.nnCtx, state.nextNext);
    this._updateStats(state);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _drawBoard(state) {
    const { ctx, cell } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Board background
    ctx.fillStyle = '#080814';
    ctx.fillRect(0, 0, W, H);

    // Placed (locked) cells
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const id = state.board[r][c];
        if (id !== 0) this._drawCell(ctx, c, r, COLORS[id], cell);
      }
    }

    // Ghost piece (drop preview)
    if (state.current && state.ghostY != null && state.ghostY !== state.current.y) {
      const colorId = TYPE_NAMES.indexOf(state.current.type) + 1;
      for (const [dr, dc] of getShape(state.current.type, state.current.rotation)) {
        const row = state.ghostY + dr;
        const col = state.current.x + dc;
        if (row >= 0 && row < BOARD_ROWS) {
          this._drawGhostCell(ctx, col, row, COLORS[colorId], cell);
        }
      }
    }

    // Active (falling) piece
    if (state.current) {
      const colorId = TYPE_NAMES.indexOf(state.current.type) + 1;
      for (const [dr, dc] of getShape(state.current.type, state.current.rotation)) {
        const row = state.current.y + dr;
        const col = state.current.x + dc;
        if (row >= 0 && row < BOARD_ROWS) {
          this._drawCell(ctx, col, row, COLORS[colorId], cell);
        }
      }
    }

    // Subtle grid lines (drawn last so they overlay cells)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < BOARD_ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cell); ctx.lineTo(W, r * cell); ctx.stroke();
    }
    for (let c = 1; c < BOARD_COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, H); ctx.stroke();
    }
  }

  _drawCell(ctx, col, row, color, size) {
    const x = col * size + 1;
    const y = row * size + 1;
    const s = size - 2;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    // Top + left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x, y, s, 2);
    ctx.fillRect(x, y, 2, s);

    // Bottom + right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y + s - 2, s, 2);
    ctx.fillRect(x + s - 2, y, 2, s);
  }

  _drawGhostCell(ctx, col, row, color, size) {
    const x = col * size + 1;
    const y = row * size + 1;
    const s = size - 2;

    ctx.globalAlpha = GHOST_ALPHA;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.globalAlpha = 1;
  }

  // Draw a piece type (rotation 0) centered in a PREVIEW_GRID × PREVIEW_GRID canvas
  _drawPreview(ctx, piece) {
    const size = ctx.canvas.width / PREVIEW_GRID;
    ctx.fillStyle = '#080814';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!piece) return;

    const colorId = TYPE_NAMES.indexOf(piece.type) + 1;
    const cells   = getShape(piece.type, 0);

    // Center within 4×4
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const offR = Math.floor((PREVIEW_GRID - (Math.max(...rows) - Math.min(...rows) + 1)) / 2) - Math.min(...rows);
    const offC = Math.floor((PREVIEW_GRID - (Math.max(...cols) - Math.min(...cols) + 1)) / 2) - Math.min(...cols);

    for (const [dr, dc] of cells) {
      this._drawCell(ctx, dc + offC, dr + offR, COLORS[colorId], size);
    }
  }

  _updateStats(state) {
    if (this.scoreEl) this.scoreEl.textContent = String(state.score).padStart(6, '0');
    if (this.levelEl) this.levelEl.textContent = String(state.level).padStart(2, '0');
    if (this.linesEl) this.linesEl.textContent = String(state.lines).padStart(3, '0');
  }
}
