# tetris-game Planning Document

> **Summary**: 웹 브라우저에서 실행되는 모바일 친화적 테트리스 게임 — 버튼 조작, 레벨 시스템, 코드 기반 저장/복원 기능 포함
>
> **Project**: Tetris_1
> **Version**: 0.1.0
> **Author**: oneeyedk@gmail.com
> **Date**: 2026-05-10
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 별도 설치 없이 모바일/PC 브라우저에서 즉시 플레이 가능한 테트리스 게임이 필요하다 |
| **Solution** | 순수 프론트엔드(Vanilla JS + Canvas)로 구현, 하단 버튼 조작 + 코드 기반 저장/복원 제공 |
| **Function/UX Effect** | 터치/클릭 버튼 3개로 직관적 조작, 다음 2블록 미리보기, 레벨별 속도 증가로 난이도 점진 상승 |
| **Core Value** | 설치 없이 링크 하나로 시작하고, 코드 하나로 언제 어디서나 게임 상태 복원 가능 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 브라우저에서 즉시 플레이 가능한 테트리스 — 설치 불필요, 어디서나 접근 |
| **WHO** | 모바일/PC 사용자 — 터치 또는 마우스로 조작 |
| **RISK** | 코드 기반 저장 시스템의 복잡도 — 보드 상태 직렬화/역직렬화 안정성 |
| **SUCCESS** | 모든 기기에서 플레이 가능, 저장 코드로 완전한 게임 상태 복원, 레벨 10까지 원활한 플레이 |
| **SCOPE** | Phase 1: 코어 게임 엔진 + UI / Phase 2: 저장/복원 시스템 + 레벨/점수 |

---

## 1. Overview

### 1.1 Purpose

별도 설치나 계정 없이 웹 브라우저에서 즉시 플레이 가능한 테트리스 게임을 제공한다. 하단 버튼 조작으로 모바일에서도 편리하게 플레이할 수 있으며, 코드 기반 저장/복원 시스템으로 게임 진행 상태를 보존한다.

### 1.2 Background

표준 테트리스 규칙에 기반하되, 모바일 우선 UI와 코드 기반 세이브 시스템이라는 독특한 기능으로 차별화한다. 순수 프론트엔드로 구현하여 별도 서버 없이 정적 호스팅만으로 배포 가능하다.

### 1.3 Related Documents

- 참조: 테트리스 공식 가이드라인 (https://tetris.wiki/Tetris_guideline)

---

## 2. Scope

### 2.1 In Scope

- [x] 표준 7종 테트로미노 (I, O, T, S, Z, L, J)
- [x] 모바일 하단 3버튼 조작 (4기능):
  - [◄ 왼쪽 이동]: 블록 왼쪽으로 한 칸 이동
  - [↻ 회전]: 짧게 클릭 = 시계방향(CW) 90° 회전 / 길게 클릭(≥500ms) = 하드드롭
  - [► 오른쪽 이동]: 블록 오른쪽으로 한 칸 이동
- [x] 키보드 조작 (← 이동, → 이동, ↑ 회전, ↓ 소프트드롭, Space 하드드롭)
- [x] 다음 블록 2개 미리보기 패널
- [x] 점수 시스템 (줄 소거 기반)
- [x] 레벨 시스템 (10줄 소거마다 레벨 업, 낙하 속도 증가)
- [x] 게임 저장 — Base64 인코딩 코드 생성 + 복사 버튼
- [x] 게임 복원 — 코드 입력으로 보드/점수/레벨/다음블록 전체 복원
- [x] 모바일 반응형 UI

### 2.2 Out of Scope

- 멀티플레이어 / 온라인 대전
- 서버 기반 하이스코어 랭킹
- 사운드 효과 / 배경음악
- 홀드(Hold) 기능
- T-스핀 / 콤보 특별 점수
- 계정 시스템 / 로그인

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 10×20 격자 게임 보드를 Canvas 또는 DOM으로 렌더링 | High | Pending |
| FR-02 | 7종 테트로미노 랜덤 생성 (7-bag 알고리즘 권장) | High | Pending |
| FR-03 | 블록 자동 낙하 (레벨에 따른 속도) | High | Pending |
| FR-04 | 이동(왼쪽) 버튼: 블록을 왼쪽으로 한 칸 이동 | High | Pending |
| FR-05 | 이동(오른쪽) 버튼: 블록을 오른쪽으로 한 칸 이동 | High | Pending |
| FR-06 | 회전 버튼 짧게 클릭: 블록을 시계방향(CW) 90° 회전 (SRS 킥 테이블 적용) | High | Pending |
| FR-07 | 회전 버튼 길게 클릭 (≥500ms): 블록을 즉시 바닥까지 드롭 (하드드롭) | High | Pending |
| FR-08 | 키보드 보조 조작: ← → 이동, ↑ 회전(CW), Space 하드드롭, ↓ 소프트드롭 | Medium | Pending |
| FR-09 | 완성된 줄 자동 소거 및 위 블록 내려오기 | High | Pending |
| FR-10 | 다음 블록(Next) 및 그 다음 블록(Next+1) 미리보기 패널 표시 | High | Pending |
| FR-11 | 점수 계산: 1줄=100pts, 2줄=300pts, 3줄=500pts, 4줄=800pts (레벨 배율 적용) | High | Pending |
| FR-12 | 레벨 시스템: 10줄 소거마다 레벨 업 (최대 레벨 15), 속도 증가 | High | Pending |
| FR-13 | 게임 오버: 새 블록이 스폰 위치에 배치 불가 시 종료 | High | Pending |
| FR-14 | 저장 버튼: 현재 게임 상태를 Base64 코드로 인코딩하여 표시 + 복사 버튼 | High | Pending |
| FR-15 | 불러오기: 코드 입력 후 확인 시 게임 상태 완전 복원 | High | Pending |
| FR-16 | 모바일 반응형 레이아웃 (화면 너비 320px~1920px 대응) | High | Pending |
| FR-17 | 게임 일시정지 / 재개 기능 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 60fps 렌더링 유지 (requestAnimationFrame 기반) | 브라우저 DevTools Performance |
| Compatibility | Chrome, Safari, Firefox, Edge 최신 버전 지원 | 수동 브라우저 테스트 |
| Accessibility | 버튼에 aria-label 부여, 키보드 조작 가능 | 수동 검사 |
| Load Time | 초기 로드 < 2초 (외부 라이브러리 없음) | Network 탭 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] 게임 보드에서 7종 테트로미노가 정상 낙하 및 충돌 감지
- [x] 3개 버튼(4기능)으로 블록 조작 동작 확인: 왼이동 / 회전CW(짧게) / 하드드롭(길게) / 오른이동
- [x] 줄 소거 시 점수 및 레벨 정상 업데이트
- [x] 다음 2블록 미리보기 정상 표시
- [x] 저장 코드 생성 및 복사 버튼 동작
- [x] 저장 코드 입력 후 게임 상태 완전 복원 확인
- [x] 모바일(375px), 태블릿(768px), 데스크톱(1440px)에서 레이아웃 정상

### 4.2 Quality Criteria

- [x] 화면 깨짐 없이 모든 화면 크기 대응
- [x] 저장 코드 인코딩/디코딩 에러 0건
- [x] 외부 라이브러리 의존성 없음 (순수 Vanilla JS)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 저장 코드가 너무 길어 UX 불편 | Medium | Medium | Base64 압축 + LZ압축 라이브러리 고려, 복사 버튼으로 보완 |
| 모바일에서 버튼 터치 반응 지연 | High | Medium | touchstart 이벤트 사용, passive listener 적용 |
| 회전 시 벽 충돌(Wall Kick) 구현 복잡도 | Medium | High | SRS(Super Rotation System) 표준 킥 테이블 적용 |
| 보드 상태 직렬화 오류로 복원 실패 | High | Low | 버전 헤더 포함 인코딩, try-catch 에러 처리 |
| 회전 버튼 길게 클릭 오감지 (짧게/길게 경계) | Medium | Medium | 500ms 임계값, touchstart/touchend 타이머 측정, 시각 피드백 제공 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| (신규 프로젝트) | - | 기존 코드베이스 없음, 전체 신규 생성 |

### 6.2 Current Consumers

해당 없음 — 신규 프로젝트

### 6.3 Verification

- [x] 기존 코드베이스와 충돌 없음 (신규 프로젝트)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 구조 (`components/`, `lib/`, `types/`) | 정적 사이트, 게임, 포트폴리오 | ☑ |
| **Dynamic** | Feature-based 모듈, BaaS 연동 | 백엔드 포함 웹앱, SaaS | ☐ |
| **Enterprise** | 레이어 분리, DI, 마이크로서비스 | 대규모 시스템 | ☐ |

> **Starter 선택 이유**: 백엔드 불필요, 순수 프론트엔드 게임. 외부 의존성 최소화.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Vanilla JS / React / Vue | **Vanilla JS** | 의존성 없음, 게임 루프 직접 제어, 파일 크기 최소 |
| Rendering | DOM / Canvas 2D | **Canvas 2D** | 60fps 렌더링 성능, 게임에 최적 |
| State Management | 전역 객체 / 클래스 | **GameState 클래스** | 직렬화/역직렬화에 유리 |
| Save Format | localStorage / Base64 코드 | **Base64 코드** | 기기 간 이전 가능, 서버 불필요 |
| Styling | Tailwind / CSS / CSS Variables | **CSS + CSS Variables** | 외부 의존성 없음, 반응형 구현 용이 |
| 회전 알고리즘 | 단순 회전 / SRS | **SRS (Super Rotation System)** | 벽 근처 회전 자연스럽게 처리 |

### 7.3 Clean Architecture Approach

```
Selected Level: Starter

Folder Structure:
┌─────────────────────────────────────────┐
│ tetris-game/                            │
│   index.html          — 진입점          │
│   style.css           — 전체 스타일     │
│   src/                                  │
│     game.js           — 게임 루프/상태  │
│     board.js          — 보드 로직       │
│     piece.js          — 테트로미노 정의 │
│     renderer.js       — Canvas 렌더링   │
│     input.js          — 버튼/키보드 입력│
│     scoring.js        — 점수/레벨 계산  │
│     save.js           — 저장/복원 코드  │
└─────────────────────────────────────────┘
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [ ] `CLAUDE.md` 생성됨 (아키텍처 섹션 미완)
- [ ] ESLint 미설정
- [ ] TypeScript 미사용 (Vanilla JS)

### 8.2 Conventions to Define

| Category | To Define | Priority |
|----------|-----------|:--------:|
| Naming | camelCase 변수/함수, PascalCase 클래스, UPPER_SNAKE 상수 | High |
| Module | ES Modules (`import/export`) 사용 | High |
| Canvas | 렌더링은 `renderer.js`에만 집중 | High |

### 8.3 Environment Variables Needed

없음 — 순수 정적 프론트엔드, 서버 연동 없음

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`tetris-game.design.md`)
2. [ ] Canvas 렌더링 방식 및 게임 루프 설계 확정
3. [ ] 저장 코드 포맷 상세 설계 (인코딩 스키마)
4. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-10 | Initial draft | oneeyedk@gmail.com |
| 0.2 | 2026-05-10 | 버튼 구성 변경: 3버튼 4기능 (왼이동/회전짧게=CW·길게=하드드롭/오른이동), FR 재번호 | oneeyedk@gmail.com |
