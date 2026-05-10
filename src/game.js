// Design Ref: §2.2 — Game loop: rAF + delta-time accumulator
// Design Ref: §9.1 — Application layer: orchestrates all modules

import { TYPE_NAMES, rotateCW }                              from './piece.js';
import { initBoard, isValidPosition, placePiece,
         clearLines, getGhostY }                             from './board.js';
import { calcScore, calcLevel, getSpeed }                    from './scoring.js';
import { encode, decode }                                    from './save.js';
import { initInput }                                         from './input.js';
import { Renderer }                                          from './renderer.js';
import { AudioManager }                                      from './audio.js';

// Plan SC: FR-02 — 7-bag randomizer
function newBag() {
  const bag = [0,1,2,3,4,5,6];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function makePiece(typeIdx) {
  return { type: TYPE_NAMES[typeIdx], x: 3, y: 0, rotation: 0 };
}

// Plan SC: FR-01, FR-03 — core game state shape
function createInitialState() {
  const bag = newBag();
  return {
    board:    initBoard(),
    current:  makePiece(bag.shift()),
    next:     makePiece(bag.shift()),
    nextNext: makePiece(bag.shift()),
    bag,                 // remaining 4 indices in this bag
    score:    0,
    level:    1,
    lines:    0,
    isGameOver: false,
    isPaused:   false,
  };
}

class Game {
  constructor() {
    this.state    = createInitialState();
    this.renderer = new Renderer();
    this.audio    = new AudioManager();
    this.lastTime = 0;
    this.dropAccum = 0;

    // Plan SC: FR-02 — 첫 인터랙션에서 AudioContext unlock (Autoplay 정책 대응)
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    document.addEventListener('keydown',     () => this.audio.unlock(), { once: true });

    this._bindUI();
    initInput({
      onLeft:     () => this._move(-1),
      onRight:    () => this._move(1),
      onRotate:   () => this._rotate(),
      onHardDrop: () => this._hardDrop(),
      onSoftDrop: () => this._softDrop(),
      onPause:    () => this._togglePause(),
    });

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  _loop(timestamp) {
    // Cap delta to 200ms to prevent spiral of death after tab switch
    const delta = Math.min(timestamp - this.lastTime, 200);
    this.lastTime = timestamp;

    if (!this.state.isGameOver && !this.state.isPaused) {
      this.dropAccum += delta;
      const speed = getSpeed(this.state.level);
      if (this.dropAccum >= speed) {
        this.dropAccum -= speed;
        this._gravityDrop();
      }
    }

    // Always render so paused state / just-locked pieces display correctly
    const ghostY = this.state.current
      ? getGhostY(this.state.board, this.state.current)
      : null;
    this.renderer.draw({ ...this.state, ghostY });

    requestAnimationFrame((t) => this._loop(t));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  _move(dx) {
    if (!this._active()) return;
    const moved = { ...this.state.current, x: this.state.current.x + dx };
    if (isValidPosition(this.state.board, moved)) {
      this.state.current = moved;
    }
  }

  // Plan SC: FR-06 — CW rotation with SRS (rotateCW handles kicks)
  _rotate() {
    if (!this._active()) return;
    const rotated = rotateCW(this.state.board, this.state.current);
    if (rotated) this.state.current = rotated;
  }

  // Plan SC: FR-07 — hard drop (immediate fall to bottom)
  _hardDrop() {
    if (!this._active()) return;
    const ghostY = getGhostY(this.state.board, this.state.current);
    this.state.current = { ...this.state.current, y: ghostY };
    this._lockPiece();
  }

  // Plan SC: FR-08 — keyboard soft drop (one row down, resets accumulator)
  _softDrop() {
    if (!this._active()) return;
    const moved = { ...this.state.current, y: this.state.current.y + 1 };
    if (isValidPosition(this.state.board, moved)) {
      this.state.current = moved;
      this.dropAccum = 0;
    } else {
      this._lockPiece();
    }
  }

  _gravityDrop() {
    const moved = { ...this.state.current, y: this.state.current.y + 1 };
    if (isValidPosition(this.state.board, moved)) {
      this.state.current = moved;
    } else {
      this._lockPiece();
    }
  }

  // Plan SC: FR-09, FR-11, FR-12 — lock piece, clear lines, update score/level
  _lockPiece() {
    const { current, board, next, nextNext } = this.state;
    const colorId = TYPE_NAMES.indexOf(current.type) + 1;

    const placed             = placePiece(board, current, colorId);
    const { newBoard, cleared } = clearLines(placed);

    // Plan SC: FR-05 — 잠금 충격음 (하드드롭·중력 공통)
    this.audio.playHardDrop();
    // Plan SC: FR-04 — 줄 소거 효과음
    if (cleared > 0) this.audio.playLineClear(cleared);

    const newLines  = this.state.lines + cleared;
    const newLevel  = calcLevel(newLines);
    const newScore  = this.state.score + calcScore(cleared, newLevel);

    // Advance piece queue — refill bag when exhausted
    let bag = [...this.state.bag];
    if (bag.length === 0) bag = newBag();
    const newNextNext = makePiece(bag.shift());

    // Spawn the "next" piece as the new current
    const newCurrent = { ...next, x: 3, y: 0, rotation: 0 };

    // Plan SC: FR-13 — game over when spawn position is blocked
    if (!isValidPosition(newBoard, newCurrent)) {
      this.state = {
        ...this.state,
        board: newBoard,
        score: newScore,
        lines: newLines,
        level: newLevel,
        isGameOver: true,
      };
      document.getElementById('gameover-overlay')?.classList.remove('hidden');
      document.getElementById('final-score').textContent =
        `SCORE: ${String(newScore).padStart(6, '0')}`;
      // Plan SC: FR-06, FR-09 — 게임오버: BGM 정지 + 하강 효과음
      this.audio.stopBgm();
      this.audio.playGameOver();
      return;
    }

    this.state = {
      board:    newBoard,
      current:  newCurrent,
      next:     { ...nextNext, x: 3, y: 0, rotation: 0 },
      nextNext: newNextNext,
      bag,
      score:    newScore,
      level:    newLevel,
      lines:    newLines,
      isGameOver: false,
      isPaused:   false,
    };
    this.dropAccum = 0;
  }

  // Plan SC: FR-17 — pause / resume
  _togglePause() {
    if (this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
    document.getElementById('pause-overlay')
      ?.classList.toggle('hidden', !this.state.isPaused);
    if (this.state.isPaused) {
      // Plan SC: FR-03 — 일시정지 시 BGM 일시정지
      this.audio.suspendBgm();
    } else {
      // Plan SC: FR-03 — 재개 시 BGM 재개
      this.audio.resumeBgm();
      this.lastTime  = performance.now();
      this.dropAccum = 0;
    }
  }

  _active() {
    return !this.state.isGameOver && !this.state.isPaused;
  }

  // ── UI bindings ────────────────────────────────────────────────────────────

  _bindUI() {
    // Restart
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      document.getElementById('gameover-overlay')?.classList.add('hidden');
      this.state     = createInitialState();
      this.dropAccum = 0;
      this.lastTime  = performance.now();
      // Plan SC: FR-09 — 재시작 시 BGM 재개
      this.audio.stopBgm();
      this.audio.unlock();
    });

    // Plan SC: FR-07 — 음소거 버튼
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.textContent = this.audio.isMuted ? '🔇' : '🔊';
      btnMute.addEventListener('click', () => {
        const next = !this.audio.isMuted;
        this.audio.setMuted(next);
        btnMute.textContent = next ? '🔇' : '🔊';
      });
    }

    // ── Save modal ──────────────────────────────────────────────────────────

    // Plan SC: FR-14 — generate save code
    document.getElementById('btn-save')?.addEventListener('click', () => {
      if (this.state.isGameOver) return;
      this.state.isPaused = true;
      const code = encode(this.state);
      const ta   = document.getElementById('save-code');
      if (ta) { ta.value = code; ta.select(); }
      document.getElementById('save-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-copy')?.addEventListener('click', () => {
      const code = document.getElementById('save-code')?.value;
      if (!code) return;
      const btn = document.getElementById('btn-copy');
      navigator.clipboard.writeText(code).catch(() => {
        // HTTP fallback
        document.getElementById('save-code')?.select();
        document.execCommand('copy');
      }).finally(() => {
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = '복사됨!';
          setTimeout(() => { btn.textContent = orig; }, 1500);
        }
      });
    });

    const closeSave = () => {
      document.getElementById('save-modal')?.classList.add('hidden');
      this.state.isPaused = false;
      this.lastTime = performance.now();
      this.dropAccum = 0;
    };
    document.getElementById('btn-save-close')?.addEventListener('click', closeSave);
    document.getElementById('save-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSave();
    });

    // ── Load modal ──────────────────────────────────────────────────────────

    document.getElementById('btn-load')?.addEventListener('click', () => {
      this.state.isPaused = true;
      const errEl = document.getElementById('load-error');
      const ta    = document.getElementById('load-code');
      errEl?.classList.add('hidden');
      if (ta) ta.value = '';
      document.getElementById('load-modal')?.classList.remove('hidden');
    });

    // Plan SC: FR-15 — restore game state from code
    document.getElementById('btn-load-confirm')?.addEventListener('click', () => {
      const code  = document.getElementById('load-code')?.value.trim() ?? '';
      const errEl = document.getElementById('load-error');
      try {
        this.state     = decode(code);
        this.dropAccum = 0;
        this.lastTime  = performance.now();
        document.getElementById('load-modal')?.classList.add('hidden');
        document.getElementById('gameover-overlay')?.classList.add('hidden');
      } catch {
        if (errEl) {
          errEl.textContent = '유효하지 않은 코드입니다.';
          errEl.classList.remove('hidden');
        }
      }
    });

    const closeLoad = () => {
      document.getElementById('load-modal')?.classList.add('hidden');
      this.state.isPaused = false;
      this.lastTime = performance.now();
      this.dropAccum = 0;
    };
    document.getElementById('btn-load-close')?.addEventListener('click', closeLoad);
    document.getElementById('load-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeLoad();
    });

    // Window resize — renderer recalculates cell size
    window.addEventListener('resize', () => this.renderer.resize());
  }
}

// Entry point — runs when index.html loads this module
new Game();
