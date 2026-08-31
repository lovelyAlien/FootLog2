---
phase: 04-today-view
plan: 05
subsystem: ui
tags: [react-native-maps, expo-sqlite, expo-router, jest-static-analysis]

# Dependency graph
requires:
  - phase: 04-today-view (plan 01)
    provides: "getTodayCheckins(db, localDateKey) 리포지토리 함수, buildTrajectoryCoordinates 순수 함수"
  - phase: 04-today-view (plan 03)
    provides: "(tabs) 라우트 그룹으로 이동된 오늘 화면(src/app/(tabs)/index.tsx)"
provides:
  - "화면 상태 todayCheckins — 지도 핀·궤적선·(04-06) 바텀시트 리스트가 공유할 단일 오늘 체크인 배열"
  - "저장/완료/포그라운드 복귀 4개 지점에서 자동 갱신되는 reloadTodayCheckins 로더"
  - "저장된 체크인용 accentSoft 물방울 핀(styles.pinSaved) 지도 렌더"
  - "2건 이상일 때만 뜨는 accentSoft 2px 실선 Polyline 궤적선"
  - "today-wiring.test.ts — 단일 쿼리/저장된 핀/궤적선/accent 예산/스코프 경계 5개 계약 회귀 가드(17개 테스트)"
affects: [04-today-view (plan 06 — 바텀시트가 이 todayCheckins 상태를 그대로 소비)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "단일 조회 상태 공유 — 화면 상태(todayCheckins) 하나를 지도 핀/궤적선/향후 리스트가 모두 소비, 두 번째 쿼리를 만들지 않음(D-11)"
    - "저장 후 시각 단순화 — location_source별 3단계 핀 구분은 진행 중 확인 핀에만 적용, 저장된 핀은 accentSoft 단색으로 단순화(D-10)"

key-files:
  created:
    - src/app/__tests__/today-wiring.test.ts
  modified:
    - src/app/(tabs)/index.tsx

key-decisions:
  - "handleFinishCheckin의 useCallback deps 배열을 [flushNoteAndPhoto]로 그대로 유지 — reloadTodayCheckins는 db에만 의존하는 참조 안정 콜백이라 실행 정확성에 영향 없고, checkin-wiring Test 42의 리터럴 deps 계약을 보존"

patterns-established:
  - "reloadTodayCheckins 4개 호출 지점(마운트/저장 성공/완료/포그라운드 복귀) 패턴 — 이후 phase가 오늘 데이터 갱신 지점을 추가할 때 이 지점 집합을 기준으로 삼을 것"

requirements-completed: [REQ-today-view, REQ-trajectory-line]

# Metrics
duration: ~8min
completed: 2026-08-31
---

# Phase 04 Plan 05: 오늘 체크인 조회 배선 + 저장된 핀 + 궤적선 Summary

**오늘 화면이 getTodayCheckins 단일 쿼리로 오늘 체크인을 조회해 accentSoft 물방울 핀과 2px 실선 궤적선으로 지도에 다시 그리고, 저장/완료/포그라운드 복귀 시 자동 갱신되도록 배선**

## Performance

- **Duration:** ~8분 (커밋 타임스탬프 기준 추정)
- **Started:** 2026-08-31 13:35 KST 이후 (base commit 4264a84)
- **Completed:** 2026-08-31T04:43:55Z
- **Tasks:** 2 (모두 완료)
- **Files modified:** 2 (1 수정, 1 신규)

## Accomplishments

- Phase 3까지 존재하지 않던 "오늘 저장된 체크인을 다시 조회해 지도에 그리는" 로직을 완성 — 04-CONTEXT.md D-11이 지적한 gap을 채움.
- `todayCheckins` 화면 상태 하나가 지도 핀·궤적선·(04-06의) 바텀시트 리스트가 공유할 단일 소스가 되도록 상태 소유권을 확정.
- 저장된 핀(`accentSoft`, 테두리 없음)과 진행 중 확인 핀(`accent`, 3단계 구분)의 시각적 구분을 D-10대로 구현.
- 2건 이상일 때만 나타나는 `accentSoft` 2px 실선 궤적선(라벨/화살표 없음)을 REQ-trajectory-line 제약대로 구현.
- 오늘 뷰 배선 계약을 고정하는 회귀 가드 테스트 17개 신규 작성.

## Task Commits

Each task was committed atomically:

1. **Task 1: 오늘 체크인 조회 배선 + 저장된 핀 + 궤적선 렌더** - `a7d0d06` (feat)
2. **Task 2: 오늘 뷰 배선 계약 회귀 가드 신규 테스트** - `fc7dd16` (test)

## Files Created/Modified

- `src/app/(tabs)/index.tsx` - `todayCheckins` 상태, `reloadTodayCheckins` 로더(4개 호출 지점), `styles.pinSaved` 저장된 핀 마커, `Polyline` 궤적선(`TRAJECTORY_STROKE_WIDTH = 2`) 추가
- `src/app/__tests__/today-wiring.test.ts` - 단일 쿼리/저장된 핀/궤적선/accent 예산/스코프 경계 5개 계약을 정적 소스 분석으로 고정(신규)

## Decisions Made

- `handleFinishCheckin`의 `useCallback` deps 배열을 원래대로 `[flushNoteAndPhoto]`만 유지하고 `reloadTodayCheckins`를 추가하지 않았다. `reloadTodayCheckins`는 `db`(안정적인 `useSQLiteContext()` 반환값)에만 의존하는 참조 안정 콜백이라 실행 정확성에 영향이 없고, 이 함수의 deps를 확장하면 `checkin-wiring.test.ts` Test 42의 리터럴 정규식(`[\s\S]*?\n  \}, \[flushNoteAndPhoto\]\);`)이 깨진다. 주석으로 이유를 남겨 향후 혼동을 방지했다.
- 궤적선/저장된 핀 렌더 순서를 `<Polyline>` → `todayCheckins.map(...)` 마커 → 기존 확인 핀 `<Marker>` 순으로 배치해, 인터페이스 계약("Polyline을 저장된 핀보다 먼저 렌더")을 지키면서 기존 `<Marker[^>]*draggable` 정규식 테스트에는 영향을 주지 않았다(정규식이 파일 전체에서 draggable을 가진 첫 Marker만 찾으므로 순서 무관).

## Deviations from Plan

None - plan executed exactly as written. 두 개발 함수(`getTodayCheckins`, `buildTrajectoryCoordinates`)가 이미 04-01에서 준비돼 있어 계획대로 그대로 소비했다.

## Issues Encountered

- 초기 구현에서 `foundation-wiring.test.ts` Test 7(진행률 패턴 `N/M` 금지)이 실패했다 — 원인은 새로 추가한 주석 문구 "checkin-wiring Test 27/64/65/66"의 슬래시 구분 숫자 나열이 `\d+\s*/\s*\d+` 정규식에 우연히 매칭됐기 때문(실제 진행률 표시가 아니라 테스트 번호 나열이었음). 슬래시 구분을 제거하고 문구를 다시 써서 해결, 이후 전체 스위트 그린 확인.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-06(바텀시트 리스트)이 이 plan이 확정한 `todayCheckins` 상태를 그대로 재사용할 수 있다 — 새 쿼리를 만들 필요 없음.
- `npm test`(372/372) 및 `npx tsc --noEmit` 모두 클린 — 회귀 없음.
- 시뮬레이터 실측 검증(지도 위 핀/궤적선 실제 렌더, 포그라운드 복귀 시 갱신 체감)은 이 plan의 verify 단계에 포함되지 않았다 — 04-CONTEXT.md 스코프상 04-07(실기기/시뮬레이터 통합 검증) 또는 04-06 완료 후 바텀시트와 함께 시각 확인이 자연스럽다. 코드 레벨 계약(그레프 카운트, 정적 분석 테스트)은 모두 통과했지만, "핀이 실제로 옅은 올리브색으로 보이는지"와 같은 시각적 확인은 아직 수행되지 않았다.

## Self-Check: PASSED

- FOUND: src/app/(tabs)/index.tsx
- FOUND: src/app/__tests__/today-wiring.test.ts
- FOUND commit: a7d0d06
- FOUND commit: fc7dd16

---
*Phase: 04-today-view*
*Completed: 2026-08-31*
