// Design Ref: §3.5 — Save code format "TG1:{base64}", compact JSON board representation
// Plan SC: FR-14, FR-15 — encode/decode game state for save/restore

const SAVE_HEADER = 'TG1';
const TYPE_NAMES = ['I','O','T','S','Z','L','J'];

export function encode(state) {
  const compact = {
    v: 1,
    b: state.board.flat().join(''),
    c: [TYPE_NAMES.indexOf(state.current.type), state.current.x, state.current.y, state.current.rotation],
    n: TYPE_NAMES.indexOf(state.next.type),
    nn: TYPE_NAMES.indexOf(state.nextNext.type),
    bag: state.bag,
    s: state.score,
    lv: state.level,
    ln: state.lines,
  };
  // encodeURIComponent+unescape handles Unicode safety for btoa
  return SAVE_HEADER + ':' + btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
}

export function decode(code) {
  if (!code.startsWith(SAVE_HEADER + ':')) throw new Error('INVALID_HEADER');

  let json;
  try {
    json = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
  } catch {
    throw new Error('DECODE_FAILED');
  }

  if (json.v !== 1) throw new Error('UNSUPPORTED_VERSION');
  if (typeof json.b !== 'string' || json.b.length !== 200) throw new Error('INVALID_BOARD');

  const board = Array.from({ length: 20 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => parseInt(json.b[r * 10 + c]) || 0)
  );

  const makePiece = (idx, x = 3, y = 0, rot = 0) => ({
    type: TYPE_NAMES[idx] ?? 'I', x, y, rotation: rot,
  });

  return {
    board,
    current: makePiece(json.c[0], json.c[1], json.c[2], json.c[3]),
    next: makePiece(json.n),
    nextNext: makePiece(json.nn),
    bag: Array.isArray(json.bag) ? json.bag : [],
    score: json.s ?? 0,
    level: json.lv ?? 1,
    lines: json.ln ?? 0,
    isGameOver: false,
    isPaused: false,
  };
}
