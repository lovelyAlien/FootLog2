---
phase: 06-calendar-tab
plan: 02
subsystem: database
tags: [sqlite, jest, pure-functions, date-math, calendar]

# Dependency graph
requires:
  - phase: 03-checkin-core-loop
    provides: src/checkin/checkinRepo.ts (MigratableDb 조회 패턴), src/checkin/localDate.ts (Intl 기반 local_date_key)
provides:
  - "getCheckinDateKeysInRange / getCheckinHistorySummary — 월 범위 기록 유무 + 전체 기록 요약 조회(SQL 1회씩)"
  - "src/calendar/monthGrid.ts — 일요일 시작 월 그리드 셀 생성, 월 이동, 헤더 포맷, date key fail-closed 검증"
  - "src/calendar/scrubberRange.ts — 스크러버 범위 생성, 하드 클램프, 가시성 게이트, 확정 치수 상수"
affects: [06-03, 06-04, 06-05, 06-06, 06-07, 06-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "순수 날짜 산수 모듈: 네이티브 모듈 import 없이 Date.UTC + Intl.DateTimeFormat(timeZone:'UTC')로 달력 좌표 계산 — @jest-environment node에서 실유닛 테스트"
    - "단일 범위 쿼리(BETWEEN ? AND ?, DISTINCT) 조회 함수 — 하루씩 N번 조회하는 루프 금지"

key-files:
  created:
    - src/calendar/monthGrid.ts
    - src/calendar/monthGrid.test.ts
    - src/calendar/scrubberRange.ts
    - src/calendar/scrubberRange.test.ts
  modified:
    - src/checkin/checkinRepo.ts
    - src/checkin/checkinRepo.test.ts

key-decisions:
  - "월 그리드/스크러버 날짜 산수는 사용자 로컬 타임존이 아니라 Date.UTC + timeZone:'UTC' 고정 — 달력 좌표 계산과 자정 경계 타임존 변환을 명확히 분리(모듈 헤더 주석에 근거 기록)"

patterns-established:
  - "isValidLocalDateKey: 정규식 + Date.UTC round-trip 이중 검증으로 존재하지 않는 날짜(2026-02-30 등)를 fail-closed 거부 — calendar/[date] 라우트의 유일한 방어선(T-06-02)"

requirements-completed: [REQ-calendar-grid, REQ-past-date-view, REQ-date-scrubber]

# Metrics
duration: 35min
completed: 2026-09-02
---

# Phase 6 Plan 02: 캘린더 순수 로직 계층 Summary

**일요일 시작 월 그리드 산수 + 스크러버 범위/클램프/가시성 판정 + 월간 기록 조회를 SQL 1회로 얻는 checkinRepo 확장, 전부 순수 함수 + 실유닛 테스트로 고정**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-02T01:20:00Z (추정)
- **Completed:** 2026-09-02T01:55:56Z
- **Tasks:** 3
- **Files modified:** 6 (신규 4, 기존 확장 2)

## Accomplishments
- `getCheckinDateKeysInRange`/`getCheckinHistorySummary`가 각각 SQL 1회로 월 범위 기록 유무와 전체 기록 요약(첫 기록일/고유 날짜 수)을 반환 — 하루씩 반복 조회하는 경로가 코드베이스에 존재하지 않음을 acceptance criteria로 게이트
- 월 그리드 셀 생성(`buildMonthGrid`)이 일요일 시작 7열, 5~6주 가변 길이, 경계월 채움 셀까지 실유닛 테스트로 고정(윤년 2월 29일 포함)
- 조작된 날짜 문자열(SQL 인젝션 시도 포함)을 fail-closed로 거부하는 `isValidLocalDateKey` 단일 검증 함수 확보 — T-06-02 완화 완료
- 스크러버의 범위/클램프/가시성 판정과 확정 치수(132/44/44/2/24)가 순수 모듈에 존재, 경계 넘김이 하드 클램프로 차단됨을 테스트로 확인(T1~T4 계약)

## Task Commits

Each task was committed atomically (RED → GREEN per TDD):

1. **Task 1: checkinRepo — 월 범위 기록 유무 조회 + 기록 요약**
   - `86e3538` (test) — 5개 behavior 실패 테스트 추가
   - `e10cff4` (feat) — getCheckinDateKeysInRange/getCheckinHistorySummary 구현
2. **Task 2: monthGrid — 일요일 시작 월 그리드 산수 + date key 검증**
   - `5a42b5b` (test) — behavior 전체 실패 테스트 추가
   - `a32db8a` (feat) — buildMonthGrid 등 8개 export 구현
3. **Task 3: scrubberRange — 범위 생성 · 하드 클램프 · 가시성 게이트 + 치수 상수**
   - `f2d323e` (test) — behavior 전체 실패 테스트 추가
   - `48a0298` (feat) — buildScrubberDateKeys 등 4개 함수 + 상수 5개 구현

**Plan metadata:** (SUMMARY.md 커밋은 이 작업 이후 별도로 수행)

_모든 태스크가 RED(실패 테스트) → GREEN(최소 구현) 순서로 각각 별도 커밋됨._

## Files Created/Modified
- `src/calendar/monthGrid.ts` - 월 그리드 셀/월 이동/헤더 포맷/date key 검증 순수 함수 모듈(신규)
- `src/calendar/monthGrid.test.ts` - 위 모듈의 전 behavior 실유닛 테스트(신규, `@jest-environment node`)
- `src/calendar/scrubberRange.ts` - 스크러버 범위/클램프/가시성 판정 + 치수 상수(신규)
- `src/calendar/scrubberRange.test.ts` - 위 모듈의 전 behavior 실유닛 테스트(신규)
- `src/checkin/checkinRepo.ts` - `getCheckinDateKeysInRange`/`getCheckinHistorySummary` 2개 함수 추가(기존 함수 변경 없음)
- `src/checkin/checkinRepo.test.ts` - 위 2개 함수의 behavior 7개 테스트 append(기존 테스트 변경 없음)

## Decisions Made
- None beyond what the plan specified — 플랜에 명시된 구현 규약(Date.UTC + timeZone:'UTC' 고정, resolveLocalDateKey 재사용, 파라미터 바인딩만 사용)을 그대로 따름.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/calendar/monthGrid.ts`/`src/calendar/scrubberRange.ts`/`checkinRepo`의 새 조회 함수가 06-03(월 그리드 화면), 06-04(과거 날짜 뷰), 06-05~06-06(스크러버 컴포넌트) 등 이후 플랜이 그대로 소비할 수 있는 계약으로 확정됨.
- `isValidLocalDateKey`가 존재하므로 06-04의 `calendar/[date]` 라우트가 쿼리 전에 이 함수를 호출해야 한다는 의존관계가 그대로 유효(T-06-02).
- 블로커 없음.

---
*Phase: 06-calendar-tab*
*Completed: 2026-09-02*

## Self-Check: PASSED

All created/modified files verified present on disk (src/calendar/monthGrid.ts,
src/calendar/monthGrid.test.ts, src/calendar/scrubberRange.ts,
src/calendar/scrubberRange.test.ts, src/checkin/checkinRepo.ts,
src/checkin/checkinRepo.test.ts). All 6 task commits (86e3538, e10cff4, 5a42b5b,
a32db8a, f2d323e, 48a0298) verified present in `git log`.
