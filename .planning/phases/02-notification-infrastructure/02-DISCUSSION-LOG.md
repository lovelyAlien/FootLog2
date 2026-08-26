# Phase 2: Notification Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-27
**Phase:** 2-notification-infrastructure
**Areas discussed:** 빈도 설정 UI 경계, 권한 프롬프트 문구(Info.plist), 시간대 변경 검증 범위, 자가진단 상태 가시성

---

## 빈도 설정 UI 경계

**Q1. Phase 2 동안(설정 화면이 아직 없는 상태) 알림 빈도는 어떻게 다뤄야 할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| 기본값 하드코딩 + 통합테스트로만 검증 | scheduleNotifications(frequency)를 3개 값으로 호출하는 테스트로 검증, 실제 앱 동작은 기본값 고정. T10과 경계를 깔끔히 유지 | ✓ |
| 개발용 임시 토글 추가 | 오늘 뷰에 숨겨진 debug 컴포넌트로 수동 변경 가능하게 함 | |
| 설정 화면 최소 버전을 Phase 2로 앞당김 | 햄버거 메뉴 없이 임시 진입점만 먼저 구현 | |

**User's choice:** 기본값 하드코딩 + 통합테스트로만 검증 (추천 선택)

**Q2. Phase 2의 기본(하드코딩) 알림 빈도는 무엇으로 할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| 매시간 | Problem Statement의 핵심 가설, 문서에서 가장 먼저 언급되는 기본값 | ✓ |
| 3시간마다 | 개발 중 알림 빈도를 낮춰 방해 최소화 | |
| 끔 | 자가진단 로직만 단위테스트로 검증, 실제 알림은 끔 | |

**User's choice:** 매시간 (추천 선택)

**Notes:** 실제 UI는 Phase 6(Calendar tab, 햄버거 메뉴→설정 화면) 소관으로 확정.

---

## 권한 프롬프트 문구(Info.plist)

**Q1. 남은 3개 문구(위치/카메라/사진 라이브러리 Info.plist usage description)를 누가 작성해야 할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| Claude가 담담한 톤으로 초안 작성 | PROJECT.md 전제#6 원칙에 맞춰 CONTEXT.md에 후보 문구 포함, 창업자가 나중에 확인/수정 | ✓ |
| 창업자가 지금 직접 작성 | 대화 중 바로 문구를 불러줌 | |
| 연구/계획 단계에 위임 | 지금은 미결정, 구현 직전에 확정 | |

**User's choice:** Claude가 담담한 톤으로 초안 작성 (추천 선택)

**Q2. 이 문구들은 어떤 언어로 작성해야 할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| 한국어만 | 앱 전체가 한국어 응답, 1단계 유일 사용자가 한국어 로케일 사용 | ✓ |
| 한국어+영어 둘 다 준비 | 기기 로케일이 영어일 경우 대비 | |

**User's choice:** 한국어만 (추천 선택)

**Q3. '알림' 권한은 iOS에 Info.plist 키가 없어 OS 다이얼로그 자체에 커스텀 문구를 넣을 수 없습니다. REQ-permission-copy의 '알림 프롬프트 문구'는 이미 확정된 priming 화면 문구를 가리키는 걸로 해석해도 될까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| 네, priming 화면 문구로 충분 | 추가 작업 없음, T18 범위를 3개로 축소 | ✓ |
| 아니오, 다른 문구가 더 필요함 | | |

**User's choice:** 네, priming 화면 문구로 충분 (추천 선택)

**Notes:** 확정된 Info.plist 문구 3종 초안은 CONTEXT.md D-03 참고.

---

## 시간대 변경 검증 범위

**Q1. 실기기가 이미 확보된 지금, 시간대 변경 시 반복 트리거 재정렬 검증을 Phase 2에 포함할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 UAT에 포함 | 실기기 시간대 수동 변경으로 육안 확인, 추가 비용 거의 없음 | |
| TODOS.md에 계속 유예 | 원래 계획대로 후순위 유지 | ✓ |

**User's choice:** TODOS.md에 계속 유예

**Notes:** 사용자가 첫 질문에서 "UAT가 뭔지, 왜 필요한지" 명확화를 요청 — 반복 캘린더 트리거의 minute 기반 재정렬 방식과 실기기 육안 검증의 의미를 평이하게 설명한 뒤, "나중으로 미룰게"로 최종 결정.

---

## 자가진단 상태 가시성

**Q1. 자가진단(포그라운드 복귀 시 트리거 재생성)이 실제로 동작하는지 개발/디버깅 단계에서 확인할 수단이 필요할까요?**

| Option | Description | Selected |
|--------|-------------|----------|
| 콘솔 로그만 | 개발 빌드에서만 console.log로 신호, 사용자에게는 안 보임(문서의 '조용히' 원칙 유지) | ✓ |
| 별도 가시성 수단 없음 | 자동화 테스트로만 검증, 실기기에서는 iOS 설정 화면으로 간접 확인 | |

**User's choice:** 콘솔 로그만 (추천 선택)

---

## Claude's Discretion

- 자가진단 레지스트리 내부 자료구조(`[{id, kind, recreate()}, ...]` 배열 스키마)의 정확한 구현 방식은 연구/계획 단계에서 자유롭게 판단.

## Deferred Ideas

- 시간대 변경 시 반복 트리거 재정렬 실기기 검증 — TODOS.md에 계속 유예 (위 참고).
