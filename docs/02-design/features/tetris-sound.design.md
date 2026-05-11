# tetris-sound Design Document

> **Summary**: AudioManager 클래스로 Web Audio API 기반 BGM + 효과음 구현 — 외부 파일 없음
>
> **Project**: Tetris Game (Starter — Vanilla JS)
> **Version**: 1.2
> **Author**: oneeyedk
> **Date**: 2026-05-10
> **Status**: Done (iterate 완료)
> **Planning Doc**: [tetris-sound.plan.md](../01-plan/features/tetris-sound.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 시각 피드백만으로는 줄 소거·게임오버 등 핵심 이벤트의 몰입감이 부족 |
| **WHO** | 모바일(아이폰·갤럭시탭) 및 PC 브라우저 사용자 |
| **RISK** | 브라우저 Autoplay 정책 — 첫 사용자 인터랙션 전 AudioContext 시작 불가 |
| **SUCCESS** | BGM 루프 재생, 이벤트별 효과음, 음소거 버튼 — 모든 기기에서 정상 동작 |
| **SCOPE** | Phase 1: audio.js (AudioManager 클래스) / Phase 2: game.js 연동 + UI |

---

## 1. Overview

### 1.1 Design Goals

- Web Audio API만으로 BGM + SFX 합성 — 외부 파일·라이브러리 0
- Renderer 패턴과 동일한 클래스 구조로 프로젝트 일관성 유지
- Autoplay 정책 완전 대응 (첫 인터랙션 시 Lazy init)
- 게임 루프(rAF 60fps) 성능에 영향 없는 비동기 오디오 처리

### 1.2 Design Principles

- **Lazy Initialization**: AudioContext는 첫 포인터/키보드 이벤트에서만 생성
- **Isolation**: audio.js는 game.js를 import하지 않음 (단방향 의존)
- **Gain Control**: 모든 노드는 마스터 GainNode를 통과 — 음소거 단일 지점 제어

---

## 2. Architecture

### 2.0 Architecture Comparison

| Criteria | Option A: Inline | Option B: 함수형 | Option C: 클래스 |
|----------|:-:|:-:|:-:|
| **Approach** | game.js 직접 추가 | 함수 모음 모듈 | AudioManager 클래스 |
| **New Files** | 0 | 1 | 1 |
| **Modified Files** | 3 | 3 | 3 |
| **Complexity** | Low | Low | Medium |
| **Maintainability** | Low | Medium | **High** |
| **Effort** | Low | Low | Medium |
| **Consistency** | ❌ game.js 팽창 | ⚠️ 전역 상태 | ✅ Renderer 패턴 |

**Selected**: Option C (AudioManager 클래스) — Renderer와 동일 패턴, 상태 캡슐화

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      src/game.js                        │
│  this.audio = new AudioManager()                        │
│  this.audio.unlock()        ← 첫 인터랙션              │
│  this.audio.startBgm()      ← 게임 시작/재시작         │
│  this.audio.playLineClear(n) ← _lockPiece()             │
│  this.audio.playHardDrop()   ← _hardDrop() / _lockPiece │
│  this.audio.playGameOver()   ← _lockPiece() 게임오버   │
│  this.audio.suspendBgm()     ← _togglePause() ON       │
│  this.audio.resumeBgm()      ← _togglePause() OFF      │
│  this.audio.stopBgm()        ← 게임오버 / 재시작       │
└─────────────────┬───────────────────────────────────────┘
                  │ import
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    src/audio.js                         │
│                                                         │
│  class AudioManager {                                   │
│    ctx: AudioContext | null   ← Lazy init               │
│    masterGain: GainNode       ← 음소거 단일 제어        │
│    isMuted: boolean           ← localStorage 연동       │
│    bgmTimeoutId: number       ← BGM 시퀀서 타이머       │
│    bgmPlaying: boolean                                   │
│  }                                                      │
│                                                         │
│  Web Audio API Graph:                                   │
│  Oscillator → GainNode(SFX) ─┐                         │
│                               ├→ masterGain → destination│
│  Oscillator → GainNode(BGM) ─┘                         │
└─────────────────────────────────────────────────────────┘
                  │ bindButton + 음소거 버튼
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
│  <header>                                               │
│    <h1>TETRIS</h1>                                      │
│    <button id="btn-mute">🔊</button>  ← 추가            │
│    <div id="score-panel">...</div>                      │
│  </header>                                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
첫 클릭/키 입력
  → AudioManager.unlock()
  → AudioContext 생성 (or resume)
  → masterGain 연결
  → isMuted 복원 (localStorage)
  → startBgm() 호출

게임 이벤트 발생
  → game.js → audio.playXxx()
  → Oscillator 생성 → 주파수/파형 설정
  → masterGain 경유 → destination 출력
  → 재생 완료 후 노드 자동 소멸 (disconnect)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `src/game.js` | `src/audio.js` | AudioManager 인스턴스 생성 및 메서드 호출 |
| `src/audio.js` | Web Audio API (브라우저 내장) | 오디오 합성 |
| `src/audio.js` | localStorage | 음소거 상태 저장/복원 |

---

## 3. AudioManager 상세 설계

### 3.1 클래스 인터페이스

```javascript
export class AudioManager {
  // 상태
  ctx        // AudioContext | null — Lazy init
  masterGain // GainNode — 음소거 단일 지점
  isMuted    // boolean — localStorage 'tetris-muted'
  bgmTimer   // setTimeout ID — BGM 시퀀서
  bgmPlaying // boolean
  level      // number — 현재 게임 레벨 (BPM 계산용)

  // Public API
  unlock()              // 첫 인터랙션에서 호출 — ctx 초기화 + BGM 시작
  startBgm()            // BGM 루프 시작 (unlock 이후)
  stopBgm()             // BGM 완전 정지 (게임오버, 재시작)
  suspendBgm()          // BGM 일시정지 (pause) + 타이머 정지
  resumeBgm()           // BGM 재개 (unpause) + 타이머 재시작
  playLineClear(lines)  // 효과음: 줄 소거 (1~4)
  playHardDrop()        // 효과음: 하드드롭·잠금 충격음
  playGameOver()        // 효과음: 게임오버 하강 멜로디
  setMuted(bool)        // 음소거 토글 — masterGain.gain 0/MASTER_GAIN
  setLevel(number)      // 레벨 업데이트 — BGM BPM 연동 (FR-10)

  // Private
  _getBeatMs()          // 레벨 기반 beat 간격 계산
  _scheduleMelody(idx)  // BGM 시퀀서 루프
  _playNote(...)        // 단발 노트 헬퍼
}
```

### 3.2 BGM 멜로디 데이터 (Tetris A Theme — Korobeiniki)

```javascript
// [주파수(Hz), 박자(quarter note 단위)]
// BPM: Level 1 = 138 → Level 15+ = 180 (3 BPM/레벨, 상한 180)
const BGM_BPM_BASE = 138;
const BGM_BPM_STEP = 3;
const BGM_BPM_MAX  = 180;

// 동적 beat 간격 — 레벨마다 재계산
_getBeatMs() {
  const bpm = Math.min(BGM_BPM_BASE + (this.level - 1) * BGM_BPM_STEP, BGM_BPM_MAX);
  return 60000 / bpm;
}

const BGM_MELODY = [
  // Bar 1-2
  [659,1],[494,0.5],[523,0.5],[587,1],[523,0.5],[494,0.5],
  [440,1],[440,0.5],[523,0.5],[659,1],[587,0.5],[523,0.5],
  // Bar 3-4
  [494,1.5],[523,0.5],[587,1],[659,1],
  [523,1],[440,1],[440,1],
  // Bar 5-6
  [587,1],[587,0.5],[698,0.5],[880,1],[784,0.5],[698,0.5],
  [659,1.5],[523,0.5],[659,1],[587,0.5],[523,0.5],
  // Bar 7-8
  [494,1],[494,0.5],[523,0.5],[587,1],[659,1],
  [523,1],[440,1],[440,1],
];
// 총 재생 시간 계산 후 loop: 마지막 노트 종료 직후 재귀 호출
```

### 3.3 효과음 설계

| 효과음 | 파형 | 주파수 | 지속 | 특이사항 |
|--------|------|--------|------|---------|
| 줄 소거 1줄 | square | 523Hz (C5) | 0.12s | 단순 비프 |
| 줄 소거 2줄 | square | 659Hz (E5) | 0.15s | 약간 높음 |
| 줄 소거 3줄 | square | 784Hz (G5) | 0.18s | 더 높음 |
| 줄 소거 4줄 | square | 523→659→784→1047 | 0.3s | 상승 아르페지오 |
| 하드드롭·잠금 | sine | 180→80Hz (ramp down) | 0.08s | 저음 충격 |
| 게임오버 | square | 392→349→330→294 | 0.5s | 4음 하강 |

### 3.4 Gain 설계

```javascript
// MASTER_GAIN: 0.50 (음소거 시 0)
// BGM_GAIN:   0.25 → 실효 0.125 (-18 dB) — 배경음 레벨
// SFX_GAIN:   0.80 → 실효 0.400 ( -8 dB) — 효과음 레벨

// ⚠️ Chrome 버그 대응: gain.value 직접 대입은 resume() 시 무시될 수 있음
// → resume() 이후 setValueAtTime() 사용
await ctx.resume();
masterGain.gain.setValueAtTime(isMuted ? 0 : MASTER_GAIN, ctx.currentTime);

// 음소거 전환: cancelScheduledValues → setValueAtTime → linearRamp (클릭킹 방지)
masterGain.gain.cancelScheduledValues(ctx.currentTime);
masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime + 0.05);
```

### 3.5 Autoplay 정책 대응 (iterate v1.1 수정)

```javascript
// AudioManager.unlock() — 완전 수정본
async unlock() {
  if (this.ctx) {
    await this.ctx.resume().catch(() => {});   // 이미 running이어도 안전
    if (!this.bgmPlaying) this.startBgm();
    return;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext; // Safari < 14.1
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    // iOS Safari: user gesture 중 무음 버퍼 동기 재생 → 오디오 잠금 해제
    const silentBuf = this.ctx.createBuffer(1, 1, 22050);
    const silentSrc = this.ctx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(this.ctx.destination);
    silentSrc.start(0);
    // Chrome 버그: gain.value= 는 resume 전에 설정해도 무시될 수 있음
    // → resume() 완료 후 setValueAtTime() 으로 설정
    await this.ctx.resume().catch(() => {});
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : MASTER_GAIN, this.ctx.currentTime);
    this.startBgm();
  } catch (e) {
    console.warn('[AudioManager] init failed:', e);
  }
}

// suspendBgm — 타이머도 함께 정지 (이전: ctx.suspend()만 호출 → 노트 누적 버그)
suspendBgm() {
  clearTimeout(this.bgmTimer);   // ← 추가: 일시정지 중 노트 누적 방지
  this.bgmTimer = null;
  if (this.ctx?.state === 'running') this.ctx.suspend();
}

// resumeBgm — 컨텍스트 재개 후 타이머 재시작
resumeBgm() {
  this.ctx?.resume().then(() => {
    if (this.bgmPlaying && !this.bgmTimer) this._scheduleMelody(0);
  }).catch(() => {});
}
```

---

## 4. API Specification (모듈 인터페이스)

이 기능은 REST API 없음 (Pure Frontend). 모듈 인터페이스만 정의.

### 4.1 AudioManager Public Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `unlock()` | - | `Promise<void>` | 첫 인터랙션 시 ctx 초기화 + BGM 시작 (webkitAudioContext 폴백, iOS 무음버퍼) |
| `startBgm()` | - | `void` | BGM 루프 시작 |
| `stopBgm()` | - | `void` | BGM 정지 + 타이머 클리어 |
| `suspendBgm()` | - | `void` | ctx.suspend() + **타이머 정지** (노트 누적 방지) |
| `resumeBgm()` | - | `void` | ctx.resume() + **타이머 재시작** |
| `playLineClear(n)` | `n: 1-4` | `void` | 줄 수별 효과음 |
| `playHardDrop()` | - | `void` | 하드드롭/잠금 충격음 |
| `playGameOver()` | - | `void` | 게임오버 하강 멜로디 |
| `setMuted(v)` | `v: boolean` | `void` | 음소거 토글 (cancelScheduledValues → ramp) + localStorage 저장 |
| `setLevel(n)` | `n: number` | `void` | 레벨 업데이트 — 다음 노트부터 BPM 반영 (FR-10) |

---

## 5. UI/UX Design

### 5.1 헤더 레이아웃 변경

```
현재:
┌─────────────────────────────────────────┐
│  TETRIS                    SCORE        │
│                            000000       │
└─────────────────────────────────────────┘

변경 후:
┌─────────────────────────────────────────┐
│  TETRIS              🔊   SCORE        │
│                            000000       │
└─────────────────────────────────────────┘
```

### 5.2 음소거 버튼 동작

```
클릭 전: 🔊 (소리 ON) → 클릭 → 🔇 (음소거)
클릭 후: 🔇 (음소거) → 클릭 → 🔊 (소리 ON)
새로고침 후: localStorage 'tetris-muted' 값 복원
```

### 5.3 Page UI Checklist

#### 헤더 (index.html `<header>`)

- [ ] 버튼: `#btn-mute` — 음소거 토글 (초기 텍스트: `🔊`)
- [ ] 음소거 상태 시 버튼 텍스트: `🔇`

---

## 6. Error Handling

| 상황 | 처리 |
|------|------|
| AudioContext 생성 실패 (구형 브라우저) | try-catch — 실패 시 silent mode (게임 계속) |
| BGM 시퀀서 중 ctx.state = 'closed' | bgmPlaying=false 로 루프 종료 |
| 음소거 상태에서 SFX 호출 | masterGain.gain=0 으로 무음 통과 (노드 생성 억제 불필요) |
| localStorage 접근 실패 | try-catch — isMuted 기본값 false |

---

## 7. Security Considerations

- Web Audio API: 사용자 인터랙션 후만 활성화 — XSS 벡터 없음
- localStorage: `tetris-muted` 키만 사용 (boolean 문자열) — 민감 데이터 없음
- 외부 URL / 오디오 파일 로드 없음 — CSP 영향 없음

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Method |
|------|--------|--------|
| L1: 기능 테스트 | AudioContext 초기화, BGM 루프, SFX 재생 | 브라우저 직접 테스트 |
| L2: UI 테스트 | 음소거 버튼 토글, 새로고침 후 상태 유지 | 수동 체크 |
| L3: E2E 시나리오 | 줄 소거→효과음, 게임오버→BGM 정지, 일시정지→BGM 중단 | 수동 플레이 |

### 8.2 L2: UI 테스트 시나리오

| # | 동작 | 기대 결과 |
|---|------|-----------|
| 1 | 페이지 로드 후 버튼 클릭 | BGM 시작, 버튼 🔊 표시 |
| 2 | 🔊 버튼 클릭 | BGM/SFX 무음, 버튼 🔇 |
| 3 | 🔇 버튼 클릭 | BGM/SFX 재개, 버튼 🔊 |
| 4 | 음소거 후 새로고침 | 🔇 상태 유지 |
| 5 | P키 / 일시정지 버튼 | BGM 일시정지 |
| 6 | 일시정지 해제 | BGM 재개 |

### 8.3 L3: E2E 시나리오

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 첫 클릭 후 게임 플레이 | BGM 루프 재생 |
| 2 | 줄 1~4개 소거 | 강도별 다른 효과음 |
| 3 | 하드드롭 | 충격음 재생 |
| 4 | 게임오버 | BGM 정지 + 하강 효과음 |
| 5 | 재시작 | BGM 다시 루프 |
| 6 | iOS Safari에서 플레이 | 동일하게 동작 |

---

## 9. Clean Architecture (Starter Level)

### 9.1 모듈 의존 방향

```
src/game.js  →  src/audio.js  →  (Web Audio API, localStorage)
                     ↑
              단방향 의존만 허용
              audio.js는 game.js를 절대 import하지 않음
```

### 9.2 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `AudioManager` | Application | `src/audio.js` |
| `#btn-mute` | Presentation | `index.html` |
| 음소거 버튼 스타일 | Presentation | `style.css` |
| game.js audio 호출 | Application | `src/game.js` (수정) |

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| Item | Rule |
|------|------|
| 클래스 네이밍 | `AudioManager` (PascalCase, Renderer와 동일) |
| SFX 메서드 | `playXxx()` prefix |
| BGM 메서드 | `startBgm()`, `stopBgm()`, `suspendBgm()`, `resumeBgm()` |
| GainNode 최대값 | master 0.15, BGM 0.08, SFX 0.22 |
| Design Ref 주석 | `// Design Ref: §3.4 — Gain 설계` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
c:\Claude_Dev\Tetris_1\
├── src/
│   ├── audio.js       ← NEW: AudioManager class
│   ├── game.js        ← MODIFY: audio 연동
│   ├── piece.js       (unchanged)
│   ├── board.js       (unchanged)
│   ├── scoring.js     (unchanged)
│   ├── save.js        (unchanged)
│   ├── input.js       (unchanged)
│   └── renderer.js    (unchanged)
├── index.html         ← MODIFY: btn-mute 추가
└── style.css          ← MODIFY: btn-mute 스타일
```

### 11.2 Implementation Order

1. [ ] `src/audio.js` — AudioManager 클래스 전체 구현
   - constructor (ctx=null, masterGain, isMuted from localStorage)
   - `unlock()` — Lazy AudioContext 초기화
   - `_playNote(freq, type, duration, gainVal)` — 노트 단발 재생 헬퍼
   - `playLineClear(lines)` — 1~4줄별 분기
   - `playHardDrop()` — 저음 충격음
   - `playGameOver()` — 4음 하강
   - `startBgm()` / `stopBgm()` / `suspendBgm()` / `resumeBgm()`
   - `setMuted(bool)` — masterGain ramp + localStorage
2. [ ] `src/game.js` — AudioManager import 및 호출 추가
   - constructor: `this.audio = new AudioManager()`
   - 첫 인터랙션: unlock 연결 (initInput의 첫 이벤트 또는 별도 once 핸들러)
   - `_hardDrop()`: `this.audio.playHardDrop()`
   - `_lockPiece()` 줄소거 후: `this.audio.playLineClear(cleared)`
   - `_lockPiece()` 게임오버 분기: `this.audio.stopBgm()` + `this.audio.playGameOver()`
   - `_togglePause()` ON: `this.audio.suspendBgm()`
   - `_togglePause()` OFF: `this.audio.resumeBgm()`
   - `_bindUI()` btn-restart: `this.audio.stopBgm()` (새 게임에서 startBgm은 unlock이 처리)
   - `_bindUI()` btn-mute: `this.audio.setMuted()` 연결
3. [ ] `index.html` — 헤더에 `#btn-mute` 버튼 추가
4. [ ] `style.css` — `#btn-mute` 스타일 (헤더 내 소형 버튼)

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| AudioManager 클래스 | `module-1` | `src/audio.js` 전체 구현 (BGM + 3종 SFX + 음소거) | 15-20 |
| 연동 + UI | `module-2` | `game.js` 수정 + `index.html` + `style.css` | 10-15 |

#### Recommended Session Plan

| Session | Scope | 내용 |
|---------|-------|------|
| Session 1 | `module-1` | audio.js AudioManager 클래스 완성 |
| Session 2 | `module-2` | game.js 연동 + 버튼 UI + 테스트 |

---

## 12. Decision Record

| 결정 | 선택 | 근거 |
|------|------|------|
| 오디오 방식 | Web Audio API 합성 | 외부 파일 의존성 0 유지 |
| 모듈 구조 | AudioManager 클래스 | Renderer 패턴 일관성 |
| BGM 구현 | setTimeout 기반 시퀀서 | AudioScheduledSourceNode 대비 더 간단한 loop 제어 |
| AudioContext init | Lazy (첫 인터랙션) | Autoplay 정책 + iOS Safari 완전 대응 |
| **Gain 설정 방식** | **resume() 후 setValueAtTime()** | **Chrome: gain.value 직접 대입이 resume 시 무시되는 버그 대응 (v1.1)** |
| **suspendBgm 타이머** | **clearTimeout 포함** | **ctx 정지 중에도 타이머 발화 → 노트 누적 버그 수정 (v1.1)** |
| 음소거 저장 | localStorage `tetris-muted` | 새로고침 후에도 상태 유지 |
| 음소거 전환 | cancelScheduledValues → setValueAtTime → linearRamp | 기존 자동화 이벤트 충돌 방지 + 클릭킹 노이즈 방지 |
| BGM 멜로디 | Tetris A (Korobeiniki) | 게임과 가장 잘 알려진 테마 |
| **BGM BPM** | **레벨 연동 138~180 BPM** | **레벨 상승 시 속도감 강화 — 블록 낙하 속도와 BGM 템포 동기 (FR-10, v1.2)** |
| **iOS Safari 대응** | **무음 1-sample 버퍼 + webkitAudioContext** | **user gesture 중 동기 사운드 재생이 iOS unlock 필수 조건 (v1.1)** |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-10 | Initial draft — Option C 선택 | oneeyedk |
| 1.1 | 2026-05-11 | iterate 버그 수정: Chrome gain.value 버그, suspendBgm 타이머 누적, webkitAudioContext, iOS Safari 무음버퍼, gain 값 조정 | oneeyedk |
| 1.2 | 2026-05-11 | FR-10 설계 추가: BGM BPM 레벨 연동 (138→180 BPM), setLevel() API, _getBeatMs() | oneeyedk |
