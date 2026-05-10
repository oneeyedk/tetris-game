// Design Ref: §3.2 — Tetromino shapes as explicit rotation states (Y-down board)
// Design Ref: §3.3 — SRS wall kick tables, [col_delta, row_delta] in Y-down coordinates

export const COLORS = [
  null,
  '#00FFFF', // I
  '#FFFF00', // O
  '#AA00FF', // T
  '#00FF00', // S
  '#FF0000', // Z
  '#FF7700', // L
  '#0000FF', // J
];

// Each piece: 4 rotation states, each state = array of [row, col] offsets
export const SHAPES = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,1],[1,1],[2,1],[3,1]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,2],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
};

export const TYPE_NAMES = ['I','O','T','S','Z','L','J'];

// SRS wall kick offsets [col_delta, row_delta] Y-down, for JLSTZ pieces
const KICKS_JLSTZ = {
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};

// SRS wall kick offsets for I piece
const KICKS_I = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

export function getShape(typeName, rotation) {
  return SHAPES[typeName][rotation & 3];
}

// Returns new piece after CW rotation with SRS kicks applied, or null if impossible
// Plan SC: FR-06 — CW rotation with SRS wall kick
export function rotateCW(board, piece) {
  const nextRot = (piece.rotation + 1) & 3;
  const key = `${piece.rotation}>${nextRot}`;
  const kicks = piece.type === 'I' ? KICKS_I[key] : KICKS_JLSTZ[key];

  for (const [dc, dr] of kicks) {
    const candidate = { ...piece, rotation: nextRot, x: piece.x + dc, y: piece.y + dr };
    if (isValidPiecePosition(board, candidate)) return candidate;
  }
  return null;
}

// Used internally by rotateCW — board.js exposes the main isValidPosition
function isValidPiecePosition(board, piece) {
  for (const [dr, dc] of getShape(piece.type, piece.rotation)) {
    const row = piece.y + dr;
    const col = piece.x + dc;
    if (row < 0 || row >= 20 || col < 0 || col >= 10) return false;
    if (board[row][col] !== 0) return false;
  }
  return true;
}
