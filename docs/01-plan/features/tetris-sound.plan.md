# tetris-sound Planning Document

> **Summary**: Web Audio API 기반 배경음 + 효과음으로 게임 몰입감 강화
>
> **Project**: Tetris Game (Starter — Vanilla JS + Canvas 2D)
> **Version**: 1.2
> **Author**: oneeyedk
> **Date**: 2026-05-10
> **Status**: Done (iterate 완료)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 시각적으로만 동작하는 게임은 몰입감이 부족하다. 사운드 없이는 줄 소거나 게임오버 같은 핵심 피드백이 약하다. |
| **Solution** | Web Audio API로 배경 BGM과 이벤트 효과음을 합성 — 외부 파일·라이브러리 없이 순수 JS로 구현한다. |
| **Function/UX Effect** | 줄 소거·하드드롭·게임오버 시 즉각적인 청각 피드백 제공. 헤더 음소거 버튼으로 사용자가 제어 가능. |
| **Core Value** | 파일 의존성 0 유지 + 모바일/PC 어디서나 동작하는 완성도 높은 게임 경험 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 시각 피드백만으로는 몰입감이 부족 — 청각 피드백으로 게임 완성도를 높임 |
| **WHO** | 모바일(아이폰·갤럭시탭) 및 PC 브라우저 사용자 |
| **RISK** | 브라우저 Autoplay 정책 — 첫 사용자 인터랙션 전 AudioContext 시작 불가 |
| **SUCCESS** | BGM 루프 재생, 이벤트별 효과음, 음소거 버튼 — 모든 기기에서 정상 동작 |
| **SCOPE** | Phase 1: audio.js 모듈 (BGM + 효과음 합성) / Phase 2: game.js 연동 + UI |

---

## 1. Overview

### 1.1 Purpose

현재 테트리스 게임에는 사운드가 없어 줄 소거, 하드드롭, 게임오버 등 핵심 이벤트에서 청각 피드백이 없다.
Web Audio API 합성음을 추가하여 게임 몰입감을 강화한다.

### 1.2 Background

- 기존 프로젝트 레벨: Starter (Vanilla JS, 외부 의존성 0)
- 외부 파일/라이브러리를 도입하지 않는다는 원칙 유지
- Web Audio API는 모든 모던 브라우저(Chrome/Safari/Firefox)에서 지원됨
- 브라우저 Autoplay 정책: 첫 사용자 인터랙션(클릭/터치) 이후 AudioContext를 초기화해야 함

### 1.3 Related Documents

- 기존 Plan: `docs/01-plan/features/tetris-game.plan.md`
- 기존 분석: `docs/03-analysis/tetris-game.analysis.md`

---

## 2. Scope

### 2.1 In Scope

- [x] `src/audio.js` 신규 모듈 — AudioContext 관리, BGM 합성, 효과음 합성
- [x] BGM — Tetris A 테마 멜로디 Web Audio 합성 (루프)
- [x] 효과음 — 줄 소거 (1줄/2줄/3줄/4줄 강도별 다른 음)
- [x] 효과음 — 하드드롭·잠금 (충격음)
- [x] 효과음 — 게임오버 (하강 효과음)
- [x] 일시정지 시 BGM 일시정지 / 재개 시 재개
- [x] 헤더 음소거 버튼 (🔊/🔇 토글, localStorage 저장)
- [x] `src/game.js` 수정 — audio.js import + 이벤트 시점 사운드 호출
- [x] `index.html` 수정 — 음소거 버튼 추가
- [x] `style.css` 수정 — 음소거 버튼 스타일

### 2.2 Out of Scope

- 이동/회전 효과음 (사용자 요청에 없음)
- 소프트드롭 효과음
- 볼륨 슬라이더 (음소거 버튼만)
- 외부 음원 파일 (MP3/OGG)
- 사운드 프리로드 또는 스프라이트 시트

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | BGM: AudioContext 기반 Tetris A 테마 합성 루프 재생 | High | Done |
| FR-02 | BGM: 첫 사용자 인터랙션 후 AudioContext 초기화 (Autoplay 정책 대응) | High | Done |
| FR-03 | BGM: 일시정지 시 suspend / 재개 시 resume | High | Done |
| FR-04 | 효과음: 줄 소거 — 1/2/3/4줄 소거별 상이한 주파수/지속시간 | High | Done |
| FR-05 | 효과음: 하드드롭·잠금 — 짧은 충격음 (noise burst 또는 낮은 sine) | High | Done |
| FR-06 | 효과음: 게임오버 — 주파수 하강 멜로디 (0.5초) | High | Done |
| FR-07 | UI: 헤더에 음소거 버튼 (🔊/🔇), 상태를 localStorage에 저장 | Medium | Done |
| FR-08 | 음소거 상태에서 효과음·BGM 모두 무음 처리 | Medium | Done |
| FR-09 | 게임오버 후 BGM 정지, 재시작 시 BGM 재개 | Medium | Done |
| FR-10 | BGM BPM 레벨 연동: 레벨 1=138BPM → 레벨 15+=180BPM (3BPM/레벨) | Medium | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 오디오 처리가 rAF 게임 루프를 지연시키지 않음 | 개발자 도구 Performance 탭 — 프레임 드롭 없음 |
| Compatibility | Chrome / Safari / Firefox / iOS Safari / Android Chrome 지원 | 직접 기기 테스트 |
| Zero Dependency | 외부 파일·라이브러리 추가 없음 | package.json 변경 없음, assets 파일 없음 |
| Autoplay Policy | 첫 클릭/터치 전 오류 없음, 이후 자동 시작 | 콘솔 에러 없음 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] `src/audio.js` 모듈이 독립적으로 존재하며 game.js에서 import 가능
- [x] 게임 시작 후 첫 버튼 클릭·키 입력 시 BGM 자동 시작
- [x] 줄 소거 시 강도별로 다른 효과음 재생 (1줄 vs 4줄 명확히 다름)
- [x] 하드드롭·잠금 시 충격음 재생
- [x] 게임오버 시 BGM 멈추고 하강 효과음 재생
- [x] 헤더 🔊/🔇 버튼 클릭 시 음소거 토글, 새로고침 후에도 상태 유지
- [x] 일시정지 시 BGM 중단, 재개 시 BGM 재개
- [x] 아이폰 Safari, 갤럭시탭 Chrome에서 정상 동작 (webkitAudioContext 폴백 + 무음 버퍼)
- [x] 레벨 상승에 따라 BGM BPM 자동 증가 (FR-10)

### 4.2 Quality Criteria

- [x] 콘솔 에러 없음 (특히 AudioContext 관련 NotAllowedError 없음)
- [x] 효과음 재생이 게임 로직 실행을 블로킹하지 않음
- [x] 음소거 후 재생·재생 후 음소거 모두 즉시 반응

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Autoplay 정책 — 첫 인터랙션 전 AudioContext.resume() 필요 | High | High | 첫 pointerdown/keydown에서 unlock() — ctx.resume() 항상 호출 ✅ 해결 |
| iOS Safari Web Audio API 제약 — unlock 필요 | Medium | High | 무음 1-sample 버퍼를 user gesture 중 동기 재생 + webkitAudioContext 폴백 ✅ 해결 |
| Chrome: gain.value 설정이 resume 시 무시됨 | High | High | resume() 이후 gain.gain.setValueAtTime() 사용 ✅ 해결 (v1.1 iterate에서 발견·수정) |
| BGM 합성 중 음정 이탈 또는 클리핑 노이즈 | Medium | Low | GainNode 볼륨 조정 (MASTER 0.5, BGM 0.25, SFX 0.8), 노트 끝 ramp-to-zero ✅ 해결 |
| 일시정지 중 BGM 타이머 누적 — 재개 시 폭발 재생 | Medium | Medium | suspendBgm()에서 clearTimeout 추가, resumeBgm()에서 타이머 재시작 ✅ 해결 |
| game.js 수정 시 기존 기능 회귀 | Medium | Low | audio.js 완전 독립 모듈화 — game.js는 함수 호출만 추가 ✅ 해결 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `src/audio.js` | 신규 파일 | AudioContext 관리 + BGM + 효과음 합성 모듈 |
| `src/game.js` | 기존 파일 수정 | audio.js import, 이벤트 발생 지점에서 sound 함수 호출 추가 |
| `index.html` | 기존 파일 수정 | 헤더에 `#btn-mute` 버튼 추가 |
| `style.css` | 기존 파일 수정 | `#btn-mute` 스타일 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `src/game.js` | _lockPiece() | 줄 소거 후 score/level 업데이트 | 효과음 호출 추가 — 기존 로직 변경 없음 |
| `src/game.js` | _hardDrop() | 하드드롭 후 _lockPiece() 호출 | 효과음 호출 추가 |
| `src/game.js` | _lockPiece() 게임오버 분기 | isGameOver=true 설정 | BGM stop + 효과음 추가 |
| `src/game.js` | _togglePause() | isPaused 토글 | BGM suspend/resume 추가 |
| `src/game.js` | _bindUI() btn-restart | 게임 상태 초기화 | BGM restart 추가 |
| `index.html` | `<header>` | score-panel 옆 | btn-mute 버튼 삽입 |

### 6.3 Verification

- [ ] _lockPiece() 수정 후 줄 소거·점수·레벨 로직 정상 동작 확인
- [ ] _togglePause() 수정 후 일시정지 오버레이 정상 표시 확인
- [ ] 음소거 버튼 추가 후 기존 헤더 레이아웃 정상 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Starter** | ✅ |
| Dynamic | ☐ |
| Enterprise | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 오디오 방식 | Web Audio API 합성 | 외부 파일 없음, 의존성 0 유지 |
| 모듈 구조 | `src/audio.js` 독립 모듈 | 기존 모듈 아키텍처와 일관성 |
| AudioContext 초기화 | Lazy (첫 인터랙션 시) | Autoplay 정책 준수 |
| BGM 구현 | OscillatorNode + 멜로디 시퀀서 | setTimeout/AudioContext.currentTime 기반 |
| 효과음 구현 | OscillatorNode 단발 재생 | 간단하고 성능 부담 없음 |
| 음소거 저장 | localStorage `tetris-muted` | 새로고침 후에도 유지 |

### 7.3 Module Structure

```
src/
├── audio.js      ← NEW: AudioContext, BGM, SFX
├── game.js       ← MODIFY: audio 호출 추가
├── piece.js      (unchanged)
├── board.js      (unchanged)
├── scoring.js    (unchanged)
├── save.js       (unchanged)
├── input.js      (unchanged)
└── renderer.js   (unchanged)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` — 코딩 컨벤션 기재됨
- [x] ES Modules (`import`/`export`) — 기존 모듈과 동일 방식 사용
- [x] 외부 라이브러리 없음 원칙 유지

### 8.2 Conventions to Define/Verify

| Category | Rule |
|----------|------|
| Naming | audio 함수: `playXxx()` prefix (e.g., `playLineClear`, `playHardDrop`) |
| GainNode | MASTER 0.50 / BGM 0.25 / SFX 0.80 — 실효 BGM -18 dB, SFX -8 dB |
| 오디오 컨텍스트 | 전역 `AudioContext` 1개 — 재생성 금지 |
| gain 설정 | `gain.value=` 직접 대입 금지 — `setValueAtTime()` 또는 `linearRampToValueAtTime()` 사용 |
| 레벨 연동 | `audio.setLevel(level)` — _lockPiece() 및 재시작 시 호출 |

---

## 9. Next Steps

1. [ ] `/pdca design tetris-sound` — Design 문서 작성
2. [ ] `/pdca do tetris-sound` — 구현
3. [ ] `/pdca analyze tetris-sound` — Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-10 | Initial draft | oneeyedk |
| 1.1 | 2026-05-11 | iterate: 버그 수정 — gain 초기화 방식, suspendBgm 타이머, webkitAudioContext, iOS Safari, gain 값 조정 | oneeyedk |
| 1.2 | 2026-05-11 | iterate: FR-10 추가 — BGM BPM 레벨 연동 (138→180 BPM), SFX 볼륨 증가 | oneeyedk |
