# tetris-game Design Document

> **Summary**: Vanilla JS + Canvas 2D 기반 웹 테트리스 — 7모듈 분리, 3버튼 UI, Base64 저장/복원
>
> **Project**: Tetris_1
> **Version**: 0.1.0
> **Author**: oneeyedk@gmail.com
> **Date**: 2026-05-10
> **Status**: Draft
> **Planning Doc**: [tetris-game.plan.md](../../01-plan/features/tetris-game.plan.md)

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | 브라우저에서 즉시 플레이 가능한 테트리스 — 설치 불필요, 어디서나 접근 |
| **WHO** | 모바일/PC 사용자 — 터치 또는 마우스로 조작 |
| **RISK** | 코드 기반 저장 시스템의 복잡도 — 보드 상태 직렬화/역직렬화 안정성 |
| **SUCCESS** | 모든 기기에서 플레이 가능, 저장 코드로 완전한 게임 상태 복원, 레벨 10까지 원활한 플레이 |
| **SCOPE** | Phase 1: 코어 게임 엔진 + UI / Phase 2: 저장/복원 시스템 + 레벨/점수 |

---

## 1. Overview

### 1.1 Design Goals

- **60fps 렌더링**: `requestAnimationFrame` 기반 게임 루프, Canvas 2D API로 매 프레임 전체 보드 재드로우
- **완전 직렬화 가능한 게임 상태**: 저장/복원을 위해 GameState 객체는 순수 데이터만 보유 (메서드 없음)
- **렌더러 완전 분리**: `renderer.js`만이 Canvas에 접근 — 게임 로직은 픽셀을 전혀 모름
- **500ms Long-press 감지**: 회전 버튼의 짧게/길게 클릭 구분, 시각 피드백 포함
- **외부 의존성 제로**: 순수 Vanilla JS + ES Modules, CDN/npm 없음

### 1.2 Design Principles

- **단일 책임 원칙**: 각 `.js` 파일은 하나의 관심사만 담당
- **상태 불변 스냅샷**: 저장 시 `JSON.parse(JSON.stringify(state))`로 깊은 복사
- **렌더러 격리**: 게임 엔진은 `GameState`만 반환하고 Canvas를 알지 못함
- **Long-press 안전**: 짧게/길게 경계(500ms)에서 두 동작이 동시 발생하지 않도록 플래그 처리

---

## 2. Architecture

### 2.0 Architecture Comparison

| Criteria | A: Monolithic | **B: Full Modules** | C: Pragmatic |
|----------|:---:|:---:|:---:|
| 신규 파일 수 | 2 | **9** | 6 |
| 복잡도 | 낮음 | **중등** | 낮음-중등 |
| 유지보수 | 낮음 | **높음** | 중등-높음 |
| 노력 | 낮음 | **중등** | 중등 |
| 리스크 | 디버깅 어려움 | **낮음** | 낮음 |

**Selected**: Option B — **Rationale**: Plan 문서 구조와 일치, 각 모듈 독립 개발/테스트 가능, save.js 분리로 직렬화 로직 격리

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│                   index.html                         │
│  (진입점 — 모듈 import, DOM 구조 정의)                 │
└──────────┬───────────────────────────────────────────┘
           │ import
    ┌──────▼──────┐
    │   game.js   │ ─── GameLoop, 상태머신, 이벤트 조율
    └──┬──┬──┬───┘
       │  │  │  imports
  ┌────▼─┐│ ┌▼──────────┐  ┌───────────┐  ┌──────────┐
  │board ││ │  piece.js  │  │scoring.js │  │ save.js  │
  │ .js  │││ │(테트로미노  │  │(점수/레벨)│  │(직렬화)  │
  └──────┘││ │ + SRS 테이블)│ └───────────┘  └──────────┘
          ││ └────────────┘
    ┌─────▼▼──────┐   ┌──────────┐
    │ renderer.js │   │ input.js │
    │(Canvas 전담) │   │(이벤트)  │
    └─────────────┘   └──────────┘
```

### 2.2 Data Flow

```
[모바일 버튼 / 키보드]
        │
        ▼
   input.js
   └─ 이벤트 감지 (click, touchstart/end, keydown)
   └─ long-press 타이머 (500ms)
        │ action 콜백 호출
        ▼
   game.js (게임 루프)
   └─ action 처리 (move, rotate, hardDrop, softDrop)
   └─ board.js: 충돌 감지, 이동 유효성
   └─ piece.js: SRS 회전 계산
   └─ scoring.js: 줄 소거 후 점수/레벨 계산
        │ 매 프레임 GameState 반환
        ▼
   renderer.js
   └─ Canvas 전체 클리어 후 재드로우
   └─ 보드, 현재 피스, 고스트, UI 패널
```

### 2.3 Module Dependencies

| 모듈 | 의존 | 역할 |
|------|------|------|
| `game.js` | board, piece, scoring, save | 게임 루프 + 상태 조율 |
| `board.js` | (없음) | 그리드 순수 로직 |
| `piece.js` | (없음) | 테트로미노 데이터 + SRS |
| `renderer.js` | (없음) | Canvas 드로잉 전담 |
| `input.js` | (없음) | 이벤트 등록 + 콜백 |
| `scoring.js` | (없음) | 점수/레벨 계산 순수 함수 |
| `save.js` | (없음) | 인코딩/디코딩 순수 함수 |

---

## 3. Data Model

### 3.1 GameState (직렬화 가능한 순수 데이터)

```javascript
// game.js 에서 관리
const GameState = {
  // 보드: 20행 × 10열, 0=빈칸, 1-7=테트로미노 색상 ID
  board: Array.from({ length: 20 }, () => new Array(10).fill(0)),

  // 현재 낙하 중인 피스
  current: {
    type: 0,      // 0=I, 1=O, 2=T, 3=S, 4=Z, 5=L, 6=J
    x: 3,         // 보드 기준 왼쪽 모서리 열 인덱스
    y: 0,         // 보드 기준 위쪽 모서리 행 인덱스
    rotation: 0   // 0=기본, 1=CW90°, 2=180°, 3=CCW90°
  },

  next: { type: 1, x: 3, y: 0, rotation: 0 },       // 다음 피스
  nextNext: { type: 2, x: 3, y: 0, rotation: 0 },   // 다다음 피스

  bag: [3, 5, 6, 4],  // 7-bag 잔여 피스 타입 배열 (소진 시 새 bag 생성)

  score: 0,
  level: 1,
  lines: 0,       // 누적 소거 줄 수

  isGameOver: false,
  isPaused: false
};
```

### 3.2 Tetromino Definitions (piece.js)

```javascript
// 각 테트로미노의 4가지 회전 상태 (셀 좌표 배열 [dx, dy])
export const TETROMINOES = {
  I: {
    color: '#00FFFF',
    shapes: [
      [[0,1],[1,1],[2,1],[3,1]],   // rotation 0
      [[2,0],[2,1],[2,2],[2,3]],   // rotation 1 (CW)
      [[0,2],[1,2],[2,2],[3,2]],   // rotation 2
      [[1,0],[1,1],[1,2],[1,3]]    // rotation 3
    ]
  },
  O: { color: '#FFFF00', shapes: [/* 4개 동일 */] },
  T: { color: '#AA00FF', shapes: [/* ... */] },
  S: { color: '#00FF00', shapes: [/* ... */] },
  Z: { color: '#FF0000', shapes: [/* ... */] },
  L: { color: '#FF7700', shapes: [/* ... */] },
  J: { color: '#0000FF', shapes: [/* ... */] }
};

export const TYPE_NAMES = ['I','O','T','S','Z','L','J'];
```

### 3.3 SRS Wall Kick Tables (piece.js)

```javascript
// J, L, S, T, Z 공통 킥 테이블 (from→to rotation)
export const WALL_KICKS_JLSTZ = {
  '0→1': [[ 0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1→0': [[ 0,0],[ 1,0],[ 1,-1],[0,2],[1,2]],
  '1→2': [[ 0,0],[ 1,0],[ 1,-1],[0,2],[1,2]],
  '2→3': [[ 0,0],[ 1,0],[ 1,1],[0,-2],[1,-2]],
  '3→2': [[ 0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2→1': [[ 0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3→0': [[ 0,0],[ 1,0],[ 1,-1],[0,2],[1,2]],
  '0→3': [[ 0,0],[-1,0],[-1,1],[0,-2],[-1,-2]]
};

// I 피스 전용 킥 테이블
export const WALL_KICKS_I = {
  '0→1': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1,2]],
  // ...
};
```

### 3.4 Level Speed Table (scoring.js)

```javascript
// 레벨별 자동 낙하 간격 (ms) — Tetris 가이드라인 기반
export const LEVEL_SPEEDS = [
  1000, 793, 618, 473, 355,   // Level 1-5
   262, 190, 135,  94,  64,   // Level 6-10
    43,  28,  18,  11,   7    // Level 11-15
];
// level 15 이상은 7ms 유지
```

### 3.5 Save Code Format (save.js)

```javascript
// 인코딩: GameState → JSON → Base64
// 형식: "TG1:{base64string}"
// 헤더 "TG1" = Tetris Game v1 (버전 검증용)

const SAVE_HEADER = 'TG1';

function encode(state) {
  const compact = {
    v: 1,
    b: state.board.flat().join(''),   // "0001070200..." (200자)
    c: [state.current.type, state.current.x, state.current.y, state.current.rotation],
    n: state.next.type,
    nn: state.nextNext.type,
    bag: state.bag,
    s: state.score,
    lv: state.level,
    ln: state.lines
  };
  return SAVE_HEADER + ':' + btoa(JSON.stringify(compact));
}

function decode(code) {
  if (!code.startsWith(SAVE_HEADER + ':')) throw new Error('INVALID_CODE');
  const json = JSON.parse(atob(code.slice(4)));
  // board 복원: 200자 문자열 → 20×10 배열
  const board = Array.from({ length: 20 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => parseInt(json.b[r * 10 + c]))
  );
  return { board, current: {...}, next: {...}, /* ... */ };
}
```

---

## 4. API Specification

순수 프론트엔드 게임 — 외부 API 없음.

### 4.1 Internal Module Interface

| 함수 | 모듈 | 시그니처 | 설명 |
|------|------|---------|------|
| `initBoard()` | board.js | `() → number[][]` | 20×10 빈 보드 반환 |
| `isValidPosition(board, piece, dx, dy)` | board.js | `(...) → boolean` | 이동 유효성 검사 |
| `placePiece(board, piece)` | board.js | `(...) → number[][]` | 보드에 피스 고정 |
| `clearLines(board)` | board.js | `(...) → { newBoard, cleared }` | 줄 소거 후 새 보드 반환 |
| `getShape(type, rotation)` | piece.js | `(...) → [number,number][]` | 셀 좌표 배열 반환 |
| `rotateCW(board, piece)` | piece.js | `(...) → Piece \| null` | SRS 적용 CW 회전, 실패 시 null |
| `calcScore(cleared, level)` | scoring.js | `(...) → number` | 줄 소거 점수 계산 |
| `calcLevel(totalLines)` | scoring.js | `(...) → number` | 누적 줄 수로 레벨 계산 |
| `encode(state)` | save.js | `(...) → string` | GameState → Base64 코드 |
| `decode(code)` | save.js | `(...) → GameState` | Base64 코드 → GameState |

---

## 5. UI/UX Design

### 5.1 Screen Layout

#### 데스크톱 (≥768px)

```
┌──────────────────────────────────────────────────┐
│  TETRIS                                          │
├───────────────────┬──────────────────────────────┤
│                   │   NEXT         NEXT+1        │
│                   │  ┌────────┐  ┌────────┐      │
│   GAME BOARD      │  │        │  │        │      │
│   Canvas          │  └────────┘  └────────┘      │
│   10열 × 20행     │                              │
│   (각 셀: 30px)   │   SCORE                      │
│                   │   000000                     │
│                   │                              │
│                   │   LEVEL    LINES             │
│                   │   01       000               │
│                   │                              │
│                   │  [💾 저장]  [📂 불러오기]      │
├───────────────────┴──────────────────────────────┤
│       [◄ 왼쪽]        [↻ 회전]      [오른쪽 ►]    │
└──────────────────────────────────────────────────┘
```

#### 모바일 (< 768px)

```
┌─────────────────────┐
│ TETRIS    SCORE     │
│           000000    │
├───────────┬─────────┤
│           │  NEXT   │
│  GAME     │  ┌───┐  │
│  BOARD    │  └───┘  │
│  Canvas   │         │
│  (동적    │  NXT+1  │
│   셀 크기)│  ┌───┐  │
│           │  └───┘  │
│           │  LV: 01 │
│           │  LN: 000│
├───────────┴─────────┤
│  [💾 저장] [📂 불러오기]│
├─────────────────────┤
│  [◄]    [↻]    [►] │
└─────────────────────┘
```

셀 크기 계산 (반응형):
- 데스크톱: `cellSize = 30px` (보드 너비: 300px)
- 모바일: `cellSize = Math.floor((window.width * 0.55) / 10)` (보드가 화면 55% 차지)

### 5.2 User Flow

```
페이지 로드
    │
    ▼
게임 초기화 (빈 보드, 첫 피스 스폰)
    │
    ├─[시작] ─────────────────────────────────────────┐
    │                                                 │
    ▼                                                 │
게임 플레이 루프                                        │
├── 피스 자동 낙하 (레벨별 속도)                         │
├── 버튼/키보드 입력 처리                               │
│   ├── [◄]: 왼쪽 이동                                 │
│   ├── [↻ 짧게]: CW 회전 (SRS 킥 포함)               │
│   ├── [↻ 길게≥500ms]: 하드드롭                      │
│   └── [►]: 오른쪽 이동                               │
├── 피스 바닥 도달 → 보드에 고정 → 줄 소거 검사          │
├── 줄 소거 → 점수/레벨 업데이트                        │
└── 새 피스 스폰                                       │
    │                                                 │
    ├─[게임 오버] → 게임 오버 오버레이 표시              │
    ├─[저장 버튼] → 저장 코드 모달 (복사 버튼 포함)       │
    └─[불러오기]  → 코드 입력 모달 → 게임 상태 복원 ───►─┘
```

### 5.3 Component List

| 컴포넌트 | DOM ID | 책임 |
|---------|--------|------|
| 게임 캔버스 | `#game-canvas` | 보드 + 현재 피스 + 고스트 피스 렌더링 |
| 다음 피스 캔버스 | `#next-canvas` | Next 피스 프리뷰 |
| 다다음 피스 캔버스 | `#next-next-canvas` | Next+1 피스 프리뷰 |
| 점수 표시 | `#score-display` | 숫자 6자리 |
| 레벨 표시 | `#level-display` | 숫자 2자리 |
| 줄 표시 | `#lines-display` | 숫자 3자리 |
| 왼쪽 이동 버튼 | `#btn-left` | `touchstart` + `click` |
| 회전 버튼 | `#btn-rotate` | long-press 감지 포함 |
| 오른쪽 이동 버튼 | `#btn-right` | `touchstart` + `click` |
| 저장 버튼 | `#btn-save` | 모달 트리거 |
| 불러오기 버튼 | `#btn-load` | 모달 트리거 |
| 저장 모달 | `#save-modal` | 코드 표시 + 복사 버튼 |
| 불러오기 모달 | `#load-modal` | 코드 입력 + 확인 버튼 |
| 게임 오버 오버레이 | `#gameover-overlay` | 최종 점수 + 재시작 버튼 |
| 일시정지 오버레이 | `#pause-overlay` | "PAUSED" 텍스트 |

### 5.4 Page UI Checklist

#### 메인 게임 화면

- [ ] Canvas: 게임 보드 (10×20 격자, 각 셀 테두리 표시)
- [ ] Canvas: 고스트 피스 (현재 피스가 낙하할 최종 위치, 반투명)
- [ ] Canvas: 현재 피스 (해당 테트로미노 색상)
- [ ] 점수 표시: 6자리 숫자, 레이블 "SCORE"
- [ ] 레벨 표시: 2자리 숫자, 레이블 "LEVEL"
- [ ] 줄 표시: 3자리 숫자, 레이블 "LINES"
- [ ] Next 피스 프리뷰 캔버스 (레이블: "NEXT")
- [ ] Next+1 피스 프리뷰 캔버스 (레이블: "NEXT")
- [ ] 버튼: [◄ 왼쪽 이동] (aria-label: "Move Left")
- [ ] 버튼: [↻ 회전] (aria-label: "Rotate / Hard Drop", 길게 누르면 시각 피드백)
- [ ] 버튼: [► 오른쪽 이동] (aria-label: "Move Right")
- [ ] 버튼: [저장] (aria-label: "Save Game")
- [ ] 버튼: [불러오기] (aria-label: "Load Game")

#### 저장 모달

- [ ] 텍스트영역: 저장 코드 (읽기 전용, 전체 선택 편의)
- [ ] 버튼: [코드 복사] (클릭 후 "복사됨!" 피드백)
- [ ] 버튼: [닫기]

#### 불러오기 모달

- [ ] 텍스트 입력: 저장 코드 입력 필드 (placeholder: "TG1:...")
- [ ] 버튼: [불러오기 확인]
- [ ] 오류 메시지: 잘못된 코드 입력 시 "유효하지 않은 코드입니다" 표시
- [ ] 버튼: [닫기]

#### 게임 오버 오버레이

- [ ] 텍스트: "GAME OVER"
- [ ] 최종 점수 표시
- [ ] 버튼: [다시 시작]

---

## 6. Error Handling

### 6.1 게임 로직 에러

| 상황 | 처리 방법 |
|------|-----------|
| 회전 시 모든 SRS 킥 실패 | 회전 무시 (현재 상태 유지) |
| 이동이 보드 경계 초과 | 이동 무시 |
| 새 피스가 스폰 위치에서 충돌 | 게임 오버 트리거 |
| 길게/짧게 클릭 동시 발생 | `longPressTriggered` 플래그로 짧게 동작 방지 |

### 6.2 저장/복원 에러

| 상황 | 처리 방법 |
|------|-----------|
| 잘못된 저장 코드 헤더 | "유효하지 않은 코드입니다" 모달 표시 |
| Base64 디코딩 실패 | try-catch → 에러 메시지 표시, 게임 유지 |
| JSON 파싱 실패 | 동일 처리 |
| 보드 데이터 길이 불일치 | "손상된 코드입니다" 메시지 |
| 구버전 코드 (헤더 불일치) | "지원하지 않는 버전입니다" 메시지 |

### 6.3 입력 에러

| 상황 | 처리 방법 |
|------|-----------|
| 게임 오버 상태에서 버튼 입력 | 모든 버튼 비활성화 (`pointer-events: none`) |
| 일시정지 상태에서 방향 버튼 | 입력 무시 (input.js에서 게임 상태 확인) |

---

## 7. Security Considerations

- [ ] `save.decode()` 전체를 `try-catch`로 감싸 — 악성 Base64 입력으로 인한 런타임 오류 방지
- [ ] Canvas 렌더링은 사용자 입력을 텍스트로 표시하지 않음 — XSS 위험 없음
- [ ] `navigator.clipboard.writeText()` 사용 시 HTTPS 환경 필요 — HTTP 환경에서는 `document.execCommand('copy')` 폴백

---

## 8. Test Plan

> L1 (API) 해당 없음 — 순수 클라이언트 게임

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L2: UI Action | 버튼 동작, 캔버스 렌더링, 점수 업데이트 | 수동 / DevTools | Do |
| L3: E2E Scenario | 게임 전체 플로우, 저장/복원 왕복 | 수동 테스트 | Do |

### 8.2 L2: UI Action Test Scenarios

| # | 행동 | 예상 결과 |
|---|------|-----------|
| 1 | 페이지 로드 | 빈 보드, 첫 피스 스폰, 점수=0 |
| 2 | [◄] 클릭 | 현재 피스 왼쪽 1칸 이동 (경계에서 무시) |
| 3 | [►] 클릭 | 현재 피스 오른쪽 1칸 이동 |
| 4 | [↻] 짧게 클릭 | 피스 CW 90° 회전 (I피스: 4가지 회전 상태 확인) |
| 5 | [↻] 길게 클릭 ≥500ms | 피스 즉시 바닥 하드드롭, 새 피스 스폰 |
| 6 | 줄이 완성됨 | 해당 줄 소거, 점수 증가, 위 블록 내려옴 |
| 7 | 10줄 소거 | 레벨 2로 업, 낙하 속도 증가 |
| 8 | [저장] 클릭 | 저장 모달 표시, 코드 = "TG1:..." 형식 |
| 9 | 복사 버튼 클릭 | 코드 클립보드 복사, "복사됨!" 피드백 |
| 10 | [불러오기] → 유효한 코드 입력 | 게임 상태 완전 복원 (보드, 점수, 레벨) |
| 11 | [불러오기] → 잘못된 코드 입력 | "유효하지 않은 코드입니다" 표시 |
| 12 | 키보드 ← → ↑ ↓ Space | 각각 이동, 회전, 소프트드롭, 하드드롭 동작 |

### 8.3 L3: E2E Scenario Tests

| # | 시나리오 | 검증 기준 |
|---|----------|-----------|
| 1 | 게임 시작 → 피스 조작 → 줄 소거 → 레벨업 | 줄 소거마다 점수 증가, 10줄에서 레벨2 |
| 2 | 게임 플레이 → 저장 → 페이지 새로고침 → 불러오기 → 게임 재개 | 점수/레벨/보드 완전 동일 |
| 3 | 보드를 가득 채움 → 게임 오버 | "GAME OVER" 오버레이, 최종 점수 표시 |
| 4 | 모바일(375px): 버튼 모두 동작 | 터치 이벤트로 이동/회전/드롭 정상 |
| 5 | 회전 버튼 벽 근처에서 짧게 클릭 | SRS 킥으로 회전 성공 또는 자연스럽게 무시 |

### 8.4 Seed Data Requirements

해당 없음 — 게임 자체가 초기 상태 생성

---

## 9. Clean Architecture (Starter Level)

### 9.1 Layer Structure

| Layer | 책임 | 파일 |
|-------|------|------|
| **Presentation** | UI 렌더링, 사용자 피드백 | `renderer.js`, `style.css`, `index.html` |
| **Application** | 게임 루프, 상태 조율 | `game.js` |
| **Domain** | 순수 게임 로직, 데이터 | `board.js`, `piece.js`, `scoring.js` |
| **Infrastructure** | 입력 이벤트, 저장 코드 | `input.js`, `save.js` |

### 9.2 Dependency Rules

```
Presentation (renderer.js)
    ↑ 읽기 전용
Application (game.js) → Domain (board, piece, scoring)
                      → Infrastructure (input, save)

규칙: Domain은 어떤 레이어도 import하지 않음 (순수 함수/상수만)
```

### 9.3 This Feature's Layer Assignment

| 파일 | Layer | 핵심 export |
|------|-------|------------|
| `src/piece.js` | Domain | `TETROMINOES`, `WALL_KICKS_*`, `getShape()`, `rotateCW()` |
| `src/board.js` | Domain | `initBoard()`, `isValidPosition()`, `placePiece()`, `clearLines()` |
| `src/scoring.js` | Domain | `calcScore()`, `calcLevel()`, `LEVEL_SPEEDS` |
| `src/save.js` | Infrastructure | `encode()`, `decode()` |
| `src/input.js` | Infrastructure | `initInput(callbacks)` |
| `src/game.js` | Application | `Game` class: `start()`, `pause()`, `loadState()` |
| `src/renderer.js` | Presentation | `Renderer` class: `draw(state)` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `clearLines`, `calcScore`, `currentPiece` |
| 클래스 | PascalCase | `Game`, `Renderer` |
| 상수 | UPPER_SNAKE_CASE | `LEVEL_SPEEDS`, `SAVE_HEADER`, `CELL_SIZE` |
| DOM ID | kebab-case | `#game-canvas`, `#btn-rotate` |
| 파일 | camelCase.js | `game.js`, `renderer.js` |

### 10.2 Module Convention

```javascript
// 각 파일: named export만 사용 (default export 없음)
// piece.js
export const TETROMINOES = { ... };
export function getShape(type, rotation) { ... }
export function rotateCW(board, piece) { ... }

// game.js
import { getShape, rotateCW } from './piece.js';
import { isValidPosition, clearLines } from './board.js';
```

### 10.3 Event Handling Convention

```javascript
// input.js — 터치/마우스 통합, long-press 패턴
function bindButton(el, { onTap, onLongPress, longPressMs = 500 }) {
  let timer = null;
  let longPressTriggered = false;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();  // 더블탭 줌 방지
    longPressTriggered = false;
    timer = setTimeout(() => {
      longPressTriggered = true;
      onLongPress?.();
    }, longPressMs);
  });

  el.addEventListener('pointerup', () => {
    clearTimeout(timer);
    if (!longPressTriggered) onTap?.();
  });
}
```

---

## 11. Implementation Guide

### 11.1 File Structure

```
c:\Claude_Dev\Tetris_1\
├── index.html          — HTML 구조 + ES Module 진입점
├── style.css           — 전체 스타일 (CSS Variables 활용)
├── CLAUDE.md
└── src/
    ├── piece.js        — 테트로미노 데이터 + SRS 킥 테이블 + 회전 함수
    ├── board.js        — 보드 초기화, 충돌 감지, 고정, 줄 소거
    ├── scoring.js      — 점수 계산, 레벨 계산, 속도 테이블
    ├── save.js         — Base64 인코딩/디코딩
    ├── input.js        — 버튼 이벤트, 키보드 이벤트, long-press
    ├── renderer.js     — Canvas 2D 전담 렌더링
    └── game.js         — 게임 루프, 상태 관리, 모듈 조율
```

### 11.2 Implementation Order

1. [ ] `src/piece.js` — 테트로미노 shapes + SRS 킥 테이블 + `getShape()` + `rotateCW()`
2. [ ] `src/board.js` — `initBoard()` + `isValidPosition()` + `placePiece()` + `clearLines()`
3. [ ] `src/scoring.js` — `calcScore()` + `calcLevel()` + `LEVEL_SPEEDS`
4. [ ] `src/save.js` — `encode()` + `decode()` (단위 테스트 가능한 순수 함수)
5. [ ] `index.html` — HTML 골격 (canvas, 버튼, 모달 DOM)
6. [ ] `style.css` — CSS Variables + 반응형 레이아웃 (Grid/Flexbox)
7. [ ] `src/renderer.js` — `Renderer` 클래스: `draw(state)` 메서드
8. [ ] `src/input.js` — `initInput(callbacks)` + long-press 감지
9. [ ] `src/game.js` — `Game` 클래스: 루프 + 상태 + 모달 UI 연결

### 11.3 Session Guide

> Auto-generated from Design structure. Session split is recommended, not required.
> Use `/pdca do tetris-game --scope module-N` to implement one module per session.

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Core Domain | `module-1` | piece.js + board.js + scoring.js (순수 함수) | 20-25 |
| Infrastructure | `module-2` | save.js + input.js (long-press 포함) | 15-20 |
| HTML/CSS | `module-3` | index.html 골격 + style.css (반응형) | 15-20 |
| Renderer | `module-4` | renderer.js Canvas 드로잉 (보드+피스+고스트+UI) | 20-25 |
| Game Loop | `module-5` | game.js 통합 + 모달 UI 연결 | 25-30 |

#### Recommended Session Plan

| Session | Scope | Turns |
|---------|-------|:-----:|
| Session 1 (현재) | Plan + Design | 완료 |
| Session 2 | `--scope module-1` (Domain 순수 함수) | 20-25 |
| Session 3 | `--scope module-2,module-3` (Input + HTML/CSS) | 30-35 |
| Session 4 | `--scope module-4` (Renderer) | 20-25 |
| Session 5 | `--scope module-5` (Game Loop 통합) | 25-30 |
| Session 6 | Check + Report | 30-35 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-10 | Initial draft — Option B (Full Modules) 선택 | oneeyedk@gmail.com |
