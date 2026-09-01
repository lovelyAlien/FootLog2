# Phase 5: Check-in Detail & Edit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-31
**Phase:** 5-Check-in Detail & Edit
**Areas discussed:** 메모 저장 방식, 기존 사진 교체/삭제, 상세화면 자체의 삭제 진입점

---

## 메모 저장 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 회고와 동일한 조용한 자동저장 | 5초 디바운스 후 자동 저장, 경고/확인 없음. day-end 회고와 정확히 같은 로직 재사용 가능. product-design.md T13의 "미저장 경고" 문구는 무효화됨. | |
| 명시적 미저장 경고 다이얼로그 | product-design.md T13 원문 그대로 — 뒤로가기/나가기 시 미저장 수정이 있으면 경고를 보여줌(저장/버림 선택). | ✓ |

**User's choice:** "상세화면에서 메모 수정 시 수정 제스처가 가능해야 함. 미저장 시 경고 그리고 저장 안됨" (자유 입력)
**Notes:** 명시적 경고 방식을 선택 — 저장되지 않은 상태로는 저장하지 않고 반드시 경고를 보여줘야 한다는 점을 명확히 함. day-end 회고의 자동저장 패턴과 의도적으로 다른 모델임을 CONTEXT.md D-01에 기록. 단, "지도 앱에서 열기" 딥링크로 인한 백그라운드 전환 시의 자동 flush(D-02, product-design.md 확정 사항)는 이 결정과 별개로 그대로 유지됨 — 서로 다른 트리거에 대한 서로 다른 처리.

---

## 기존 사진 교체/삭제

| Option | Description | Selected |
|--------|-------------|----------|
| 교체만 가능 | 사진을 탭하면 기존과 동일한 액션시트로 새 사진으로 교체. 삭제 전용 버튼은 없음. | |
| 교체 + 삭제 둘 다 가능 | 사진을 완전히 제거해 "사진 없음" 상태로 되돌릴 수도 있음. 새 상태(사진 없는 완료된 체크인)와 삭제 확인 UI가 추가로 필요. | ✓ |

**User's choice:** 교체 + 삭제 둘 다 가능
**Notes:** 후속 질문으로 삭제 시 확인/되돌림 여부를 물음:

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 삭제, 되돌림 없음 | 사진 필드 하나만 바뀌는 가벼운 편집으로 취급. 별도 되돌림 장치 없음. | ✓ |
| 체크인 삭제와 동일하게 4초 스낵바 되돌림 | 앱 전체의 삭제 경험을 일관되게 가져감. | |

**User's choice:** 즉시 삭제, 되돌림 없음(추천 옵션)
**Notes:** 체크인 전체 삭제(REQ-checkin-swipe-delete)의 4초 undo 스낵바보다 가벼운 액션으로 명확히 구분(CONTEXT.md D-04).

---

## 상세화면 자체의 삭제 진입점

| Option | Description | Selected |
|--------|-------------|----------|
| 아니오, 리스트 스와이프만 | REQUIREMENTS.md·product-design.md 모두 삭제 경로를 리스트 스와이프로만 명시. 상세화면을 편집 전용 공간으로 유지. | ✓ |
| 예, 상세화면에도 삭제 버튼 추가 | 편집 중 바로 삭제 가능해 편리하지만, 리스트/상세화면 두 곳의 삭제 진입점과 미저장 경고 다이얼로그의 상호작용을 새로 설계해야 함. | |

**User's choice:** 아니오, 리스트 스와이프만(추천 옵션)
**Notes:** 파괴적 액션(전체 삭제)과 편집 액션(메모/사진 수정)을 공간적으로 분리 유지.

---

## Claude's Discretion

- 정적 지도 미리보기 렌더링 방식(MapView 잠금 vs 스냅샷 API)
- 사진 교체 시 기존 파일 삭제 타이밍(고아 파일 방지)
- 미저장 경고 UI의 정확한 형태(네이티브 Alert vs 커스텀, 문구)
- 메모 저장 실패 재시도 UI의 `CheckinActionCard.tsx` 재사용 범위

## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음.
