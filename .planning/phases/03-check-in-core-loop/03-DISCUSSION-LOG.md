# Phase 3: Check-in Core Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-27
**Phase:** 3-Check-in Core Loop
**Areas discussed:** 사진 입력의 Phase 3 범위, 드래프트 영속화 저장 방식, 저장 실패 재시도 중 앱 종료 시 동작, Phase 3의 임시 UI 호스팅, 위치 완전 실패 시 최종 폴백 좌표

---

## 사진 입력의 Phase 3 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 사진 선택 UI까지 구현 | 액션시트+권한 요청까지 Phase 3, 리사이징/documentDirectory 규약은 Phase 4 | ✓ |
| 사진 전부 Phase 4로 연기 | Phase 3은 위치+메모만, 사진 UI 자체를 Phase 4로 이동 | |

**User's choice:** 사진 선택 UI까지 구현 (권장안)
**Notes:** 후속 질문으로 "원본 사진 임시 저장 위치"를 논의. 사용자가 cacheDirectory/documentDirectory 개념을 몰라 설명 요청 → Spring Boot 비유(영구 디스크 저장소 vs Redis/tmp 캐시)로 설명 후 documentDirectory 원본 복사로 확정.

| Option | Description | Selected |
|--------|-------------|----------|
| documentDirectory에 원본 복사 | PROJECT.md의 cacheDirectory 금지 원칙을 Phase 3부터 준수 | ✓ |
| 피커의 임시 URI 그대로 보관 | 구현 간단하지만 OS가 언제든 파일을 지울 위험 | |

**User's choice:** documentDirectory에 원본 복사

---

## 드래프트 영속화 저장 방식

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite drafts 테이블 | 기존 마이그레이션 프레임워크 재사용, 새 의존성 없음 | ✓ |
| AsyncStorage (key-value) | 별도 저장 엔진 추가 필요 | |

**User's choice:** SQLite drafts 테이블 (권장안)
**Notes:** "드래프트가 뭐야?"라는 개념 질문 포함 — 확인 핀 단계(GPS 캡처 완료~"확인" 탭 사이)의 미커밋 상태임을 설명. 이후 "SQLite vs AsyncStorage" 차이를 Flyway/JdbcTemplate/Redis 비유로 재설명 후 권장안(SQLite) 확정.

---

## 저장 실패 재시도 중 앱 종료 시 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 드래프트 복구와 통합 | "확인" 탭 후에도 insert 성공 전까지 드래프트 row 유지, 재실행 시 기존 복구 프롬프트가 자동 커버 | ✓ |
| 별도 "저장 실패" 플래그 추가 | 드래프트 row에 실패 상태를 별도로 기록, 복구 UI 분기 | |

**User's choice:** 기존 드래프트 복구와 통합 (권장안)

---

## Phase 3의 임시 UI 호스팅

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 지도 화면 + 체크인 버튼 | 전체화면 지도 + 알약버튼만, Phase 4에서 바텀시트를 위에 씌움 | ✓ |
| 화면 없이 서비스/로직만 구현 | 단위 테스트로만 검증, 수동 QA 불가 | |

**User's choice:** 최소 지도 화면 + 체크인 버튼 (권장안)

---

## 위치 완전 실패 시 최종 폴백 좌표

| Option | Description | Selected |
|--------|-------------|----------|
| 창업자의 집/자주 가는 고정 장소 좌표 | 1인용 로컬 앱이므로 실제 생활권 좌표 하드코딩 | ✓ |
| 임의의 공공 대표 좌표(서울시청 등) | 개인정보 노출 없지만 초기 UX 덜 자연스러움 | |

**User's choice:** 창업자의 집/자주 가는 고정 장소 좌표 (권장안)
**Notes:** 정확한 위경도 값은 계획/구현 단계에서 창업자에게 별도 확인 필요.

---

## Claude's Discretion

- 확인 핀 드래그 제스처와 지도 팬 제스처 간 우선순위 충돌 처리 방식
- GPS 저정확도/폴백 핀의 정확한 시각적 차이값(DESIGN.md 토큰 범위 내)
- `drafts` 테이블의 정확한 컬럼 스키마

## Deferred Ideas

None — 논의가 phase 스코프 안에 머묾.
