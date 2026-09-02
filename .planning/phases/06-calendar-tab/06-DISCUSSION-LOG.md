# Phase 6: Calendar Tab - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 6-Calendar Tab
**Areas discussed:** 설정 화면 스코프, 월 그리드 기록 표시, 월 이동 방식, 주 시작 요일

---

## 설정 화면(햄버거 메뉴) 스코프

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 포함 | 햄버거 아이콘 + 설정 화면(알림 빈도/하루마무리 토글/버전)을 원본 T10 스펙 그대로 이번 phase에서 만든다 | ✓ |
| 최소 껍데기만 | 아이콘 + 빈 라우트만 두고 실제 기능은 필요해질 때(Phase 7) 채운다 | |
| 이번 phase 제외 | 계속 미루고 Phase 7이 직접 만들거나 별도 경로를 찾는다 | |

**User's choice:** 전체 포함(권장)
**Notes:** REQUIREMENTS.md의 Phase 6 요구사항 3개엔 설정 화면이 빠져 있다는 gap을 논의 중
발견해 사용자에게 명시적으로 알렸음. 사용자가 전체 포함을 선택.

**후속 질문 — 설정 항목 개수**

| Option | Description | Selected |
|--------|-------------|----------|
| 2개(알림빈도+버전) | 하루마무리 토글은 Phase 7이 회고 기능과 함께 직접 추가 | |
| 3개(원본 T10 그대로) | 하루마무리 토글도 미리 넣음(기능 자체는 없어도 알림 스케줄링 인프라는 Phase 2가 이미 지원) | ✓ |

**User's choice:** 3개, 원본 T10 그대로

**후속 질문 — 햄버거 아이콘 위치**

사용자가 먼저 "설정에는 어떤 요소가 있었지?"라고 되물어 항목 3개(알림빈도/하루마무리
토글/버전)를 다시 설명한 뒤, 원래 질문(아이콘 위치)을 재확인함.

| Option | Description | Selected |
|--------|-------------|----------|
| 원본대로: Today 뷰에만 | 스펙 그대로 — 캘린더 탭에는 햄버거 없음 | ✓ |
| 양쪽 다 노출 | Today 뷰 + 캘린더 탭 홈 화면 둘 다 | |

**User's choice:** 원본대로: Today 뷰에만

---

## 월 그리드 기록 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 기록 유무 함께 표시(권장) | 미선택+기록있음=text-muted, 미선택+기록없음=text-faint, 오늘=accent 밑줄 — calendar-multiselect-view.md의 기존 색상 스킴 재사용 | ✓ |
| 오늘 표시만(최소) | REQ 원문에 가장 충실, 기록 유무는 구분 안 함 | |

**User's choice:** 기록 유무 함께 표시(권장)

---

## 월 이동 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 좌우 스와이프 | iOS 사진 앱류의 묵시적 제스처, 버튼 UI 없음 | |
| 화살표 버튼 | 발견성 높고 오탭 위험 없음, 헤더에 44×44pt 버튼 2개 | |
| 둘 다 | 스와이프가 기본, 화살표도 보조로 함께 | ✓ |

**User's choice:** 둘 다

---

## 주 시작 요일

| Option | Description | Selected |
|--------|-------------|----------|
| 일요일 시작 | iOS 기본 달력 앱의 한국 로케일 관례와 일치 | ✓ |
| 월요일 시작 | ISO 8601/국제 표준, 일부 한국 캘린더 앱이 채택 | |

**User's choice:** 일요일 시작

---

## Claude's Discretion

- 스크러버의 시각적 스크롤 창 크기(한 번에 좌우 몇 개씩 보여줄지) — 이미
  `calendar-date-scrubber.md`에 "낮은 스코프"로 명시됨.
- 과거 날짜 조회 쿼리 함수의 정확한 시그니처/위치.
- 설정 화면의 정확한 라우트 경로/네비게이션 스택 위치(탭바 노출 여부는 이미 결정).

## Deferred Ideas

- 캘린더 그리드 드래그 멀티셀렉트 + 결과 화면 — 기존에 이미 Phase 2(제품 마일스톤)로
  유예된 항목, 이번 논의는 경계를 재확인만 함.
- pending todo `2026-09-01-recenter-button-apple-maps-parity.md`(약한 매칭, 0.3점) —
  Today 뷰 재센터 버튼 관련이라 캘린더 탭 스코프와 무관 판단, 폴드하지 않음.
