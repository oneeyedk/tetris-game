// Design Ref: §2 — AudioManager 클래스, Renderer 패턴 일관성
// Design Ref: §3.5 — Lazy AudioContext init (Autoplay 정책 + iOS Safari 대응)

const BGM_BPM   = 138;
const BEAT_MS   = 60000 / BGM_BPM;   // ≈ 434ms (quarter note)
const MASTER_GAIN = 0.15;
const BGM_GAIN    = 0.08;
const SFX_GAIN    = 0.22;
const MUTE_KEY    = 'tetris-muted';

// Design Ref: §3.2 — Tetris A テーマ (Korobeiniki) 멜로디 데이터
// [주파수(Hz), 박자(quarter note)]
const BGM_MELODY = [
  [659,1],[494,0.5],[523,0.5],[587,1],[523,0.5],[494,0.5],
  [440,1],[440,0.5],[523,0.5],[659,1],[587,0.5],[523,0.5],
  [494,1.5],[523,0.5],[587,1],[659,1],
  [523,1],[440,1],[440,1],
  [587,1],[587,0.5],[698,0.5],[880,1],[784,0.5],[698,0.5],
  [659,1.5],[523,0.5],[659,1],[587,0.5],[523,0.5],
  [494,1],[494,0.5],[523,0.5],[587,1],[659,1],
  [523,1],[440,1],[440,1],
];

export class AudioManager {
  constructor() {
    this.ctx        = null;
    this.masterGain = null;
    this.bgmTimer   = null;
    this.bgmPlaying = false;

    // Plan SC: FR-07 — 음소거 상태 localStorage 복원
    try {
      this.isMuted = localStorage.getItem(MUTE_KEY) === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Plan SC: FR-02 — 첫 인터랙션에서 AudioContext 초기화 후 BGM 시작
  async unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (!this.bgmPlaying) this.startBgm();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : MASTER_GAIN;
      this.masterGain.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.startBgm();
    } catch {
      // 오디오 불가 환경 — 무음으로 계속
    }
  }

  // Plan SC: FR-01 — BGM 루프 시작
  startBgm() {
    if (!this.ctx || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this._scheduleMelody(0);
  }

  // Plan SC: FR-09 — 게임오버·재시작 시 BGM 완전 정지
  stopBgm() {
    this.bgmPlaying = false;
    clearTimeout(this.bgmTimer);
    this.bgmTimer = null;
  }

  // Plan SC: FR-03 — 일시정지 시 BGM 일시정지
  suspendBgm() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  // Plan SC: FR-03 — 재개 시 BGM 재개
  resumeBgm() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Plan SC: FR-04 — 줄 소거 강도별 효과음 (1~4줄)
  playLineClear(lines) {
    if (!this.ctx) return;
    // Design Ref: §3.3 — 줄 수별 주파수/지속 시간
    if (lines === 4) {
      // 4줄: 상승 아르페지오
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((f, i) => {
        setTimeout(() => this._playNote(f, 'square', 0.08, SFX_GAIN), i * 70);
      });
    } else {
      const map = { 1: [523, 0.12], 2: [659, 0.15], 3: [784, 0.18] };
      const [freq, dur] = map[lines] ?? [523, 0.12];
      this._playNote(freq, 'square', dur, SFX_GAIN);
    }
  }

  // Plan SC: FR-05 — 하드드롭·잠금 충격음
  playHardDrop() {
    if (!this.ctx) return;
    // Design Ref: §3.3 — 저음 sine, 주파수 하강 180→80Hz
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(SFX_GAIN, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Plan SC: FR-06 — 게임오버 하강 멜로디
  playGameOver() {
    if (!this.ctx) return;
    // Design Ref: §3.3 — 4음 하강: G4→F4→E4→D4
    const freqs = [392, 349, 330, 294];
    freqs.forEach((f, i) => {
      setTimeout(() => this._playNote(f, 'square', 0.12, SFX_GAIN * 0.8), i * 120);
    });
  }

  // Plan SC: FR-07, FR-08 — 음소거 토글 + localStorage 저장
  setMuted(val) {
    this.isMuted = val;
    try { localStorage.setItem(MUTE_KEY, String(val)); } catch { /* ignore */ }
    if (!this.masterGain) return;
    // Design Ref: §3.4 — 클리킹 방지: linearRamp 50ms
    this.masterGain.gain.linearRampToValueAtTime(
      val ? 0 : MASTER_GAIN,
      this.ctx.currentTime + 0.05
    );
  }

  // ── Private ────────────────────────────────────────────────────────────────

  // 단발 노트 재생 헬퍼 — masterGain 경유
  _playNote(freq, type, duration, gainVal) {
    if (!this.ctx) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Design Ref: §3.2 — BGM 시퀀서: setTimeout 기반 루프
  _scheduleMelody(noteIdx) {
    if (!this.bgmPlaying || !this.ctx) return;
    const [freq, beats] = BGM_MELODY[noteIdx];
    const durMs = beats * BEAT_MS;

    this._playNote(freq, 'square', durMs / 1000 * 0.85, BGM_GAIN);

    const next = (noteIdx + 1) % BGM_MELODY.length;
    this.bgmTimer = setTimeout(() => this._scheduleMelody(next), durMs);
  }
}
