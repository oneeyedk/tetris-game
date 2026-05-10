// Design Ref: §3.1 — board is number[20][10], 0=empty, 1-7=tetromino color ID
import { getShape } from './piece.js';

export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;

export function initBoard() {
  return Array.from({ length: BOARD_ROWS }, () => new Array(BOARD_COLS).fill(0));
}

// Plan SC: FR-03, FR-06 — collision detection for movement and rotation
export function isValidPosition(board, piece) {
  for (const [dr, dc] of getShape(piece.type, piece.rotation)) {
    const row = piece.y + dr;
    const col = piece.x + dc;
    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return false;
    if (board[row][col] !== 0) return false;
  }
  return true;
}

// Stamps the current piece onto the board (piece has landed)
export function placePiece(board, piece, colorId) {
  const next = board.map(row => [...row]);
  for (const [dr, dc] of getShape(piece.type, piece.rotation)) {
    const row = piece.y + dr;
    const col = piece.x + dc;
    if (row >= 0) next[row][col] = colorId;
  }
  return next;
}

// Plan SC: FR-09 — clear completed rows, return new board and count cleared
export function clearLines(board) {
  const remaining = board.filter(row => row.some(cell => cell === 0));
  const cleared = BOARD_ROWS - remaining.length;
  const empty = Array.from({ length: cleared }, () => new Array(BOARD_COLS).fill(0));
  return { newBoard: [...empty, ...remaining], cleared };
}

// Returns the Y position where piece would land (for ghost piece rendering)
export function getGhostY(board, piece) {
  let dy = 0;
  while (isValidPosition(board, { ...piece, y: piece.y + dy + 1 })) dy++;
  return piece.y + dy;
}

// Spawns a new piece at the top-center of the board
export function spawnPiece(type) {
  return { type, x: 3, y: 0, rotation: 0 };
}
