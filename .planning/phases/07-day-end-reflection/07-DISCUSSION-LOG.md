# Phase 7: Day-end Reflection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 7-Day-end Reflection
**Areas discussed:** 저장 실패 UI 배치, 회고 알림 시각, "오늘 돌아보기" 행 완료 구분, 모달 헤더, 알림 시각 선택 UI 구현 방식

---

## 저장 실패 UI 배치

| Option | Description | Selected |
|--------|-------------|----------|
| 폼 하단 1개 공유 | 두 프롬프트 입력칸 전체 아래에 하나의 인라인 실패 문구+재시도 버튼 | ✓ |
| 각 프롬프트별 각각 | 체크인 상세화면과 동일하게 필드마다 독립적으로 표시 | |

**User's choice:** 폼 하단 1개 공유
**Notes:** 저장이 단일 함수로 두 필드를 함께 이루어지므로 UI도 단일 단위로 일치시키는 것이 자연스럽다는 근거로 추천안을 채택.

---

## 회고 알림 시각 (1차 질문)

| Option | Description | Selected |
|--------|-------------|----------|
| 21시로 확정 | 현재 Phase 2 코드에 하드코딩된 값을 그대로 유지 | |
| 다른 시각으로 변경 | 다른 고정 시각을 직접 지정 | |

**User's choice:** "설정으로 회고 알림을 설정할 수 있게 하면 되지 않을까?" (자유 응답, 두 옵션 모두 아님)
**Notes:** 사용자가 원본 스코프(시각 하드코딩)를 뒤집는 제안을 함 — 후속 질문으로 이어짐.

## 회고 알림 시각 UI 추가 여부 (후속 질문)

| Option | Description | Selected |
|--------|-------------|----------|
| 이번 phase에 포함 — 시각 선택 UI 구현 | 설정 화면에 시각 선택 UI 추가, DB 컬럼 추가, REQUIREMENTS.md 갱신 필요 | ✓ |
| 21시 하드코딩 유지, 백로그로 미룸 | 원본 문서 결정 그대로 유지 | |

**User's choice:** "이미 있는 걸로 알고 있는데, 기존 설정에는 어떤 설정들을 할수 있는지 확인해줘" → 코드 확인 결과(3항목뿐, 시각 조정 UI 없음) 보고 후 "이번 phase에 추가 — 시각 선택 UI 구현" 선택
**Notes:** 설정 화면(`SettingsScreen.tsx`)을 직접 읽어 정확히 3항목(알림 빈도/하루마무리 토글/버전)뿐이고 시각 조정 UI가 없음을 확인한 뒤 사용자에게 보고 → 사용자가 추가를 명시적으로 선택. REQUIREMENTS.md의 REQ-reflection-notification "시각 변경 UI는 스코프 밖" 문구를 뒤집는 결정임을 사용자에게 명시적으로 알린 뒤 진행.

---

## 회고 알림 시각 선택 UI 구현 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 알림빈도와 동일한 ActionSheet | 네이티브 의존성 추가 없음, 미리 정의된 시간대 목록 중 선택 | ✓ |
| 네이티브 휠 타임 피커 | `@react-native-community/datetimepicker` 신규 의존성 필요, EAS Dev Client 재빌드 필요, 자유 시각 선택 가능 | |

**User's choice:** 기존 알림빈도와 동일한 ActionSheet
**Notes:** 프로젝트에 시간 피커 네이티브 라이브러리가 아직 설치되어 있지 않음을 확인 후 제시 — 새 네이티브 의존성/재빌드 부담을 피하는 방향으로 결정.

---

## "오늘 돌아보기" 행 완료 여부 시각 구분

| Option | Description | Selected |
|--------|-------------|----------|
| 구분 안 함 | 써도/안 써도 동일한 모양 | ✓ |
| 미묘한 구분 (예: 미작성은 텍스트만 연하게) | 완료 여부를 미묘한 톤으로만 표현 | |

**User's choice:** 구분 안 함
**Notes:** 진행률/완료 수치 노출 금지 CRITICAL 원칙의 정신이 완료 여부 시각 신호에도 적용된다고 판단.

---

## 회고 모달 헤더

| Option | Description | Selected |
|--------|-------------|----------|
| 닫기(✕)만, 타이틀 없음 | 추가 chrome 없이 미니멀 유지 | ✓ |
| 날짜 타이틀 추가 | 상단에 오늘 날짜 텍스트 표시 | |

**User's choice:** 닫기(✕)만, 타이틀 없음
**Notes:** 이 모달은 항상 "오늘"에 대한 것이라 날짜가 암묵적으로 명확하다는 근거.

---

## Claude's Discretion

- 정적 지도 렌더링 방식(MapView 잠금 vs 스냅샷 API) — Phase 5 선례 그대로 위임.
- 회고 알림 시각 선택 액션시트의 정확한 후보 시각 목록 — 21시 포함 필수, 나머지는 연구/계획 단계 재량.
- 모달 애니메이션 정확한 duration/easing — DESIGN.md Motion 원칙 안에서 재량.
- 회고 저장 함수와 체크인 저장 함수 간 재사용 범위 — 기술 판단, 재량.

## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음. 알림 시각 선택 UI는 스코프 확장이지만 기존
REQ-reflection-notification의 경계 확장으로 흡수(별도 phase로 미루지 않음).
