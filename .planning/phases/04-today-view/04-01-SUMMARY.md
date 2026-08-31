---
phase: 04-today-view
plan: 01
subsystem: database
tags: [sqlite, expo-sqlite, node:sqlite, jest, tdd, data-layer]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: MigratableDb 타입, nodeSqliteAdapter 테스트 하네스, checkinRepo.ts의 commitCheckin/getLatestCheckinCoordinate/updateCheckinNoteAndPhoto
provides:
  - "MigratableDb.getAllAsync — 다중 row 조회를 프로덕션 타입과 테스트 어댑터 양쪽에서 지원"
  - "getTodayCheckins(db, localDateKey) — 리스트/지도 핀이 공유할 단일 조회 함수(D-11)"
  - "buildTrajectoryCoordinates(checkins) — CheckinRow[] → Polyline 좌표 파생 순수 함수"
affects: [04-today-view, 06-calendar-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "단일 공유 쿼리 원칙(D-11): 리스트와 지도 핀은 동일한 getTodayCheckins 결과를 소비하고, 별도 쿼리를 만들지 않는다"
    - "정렬 책임 분리: ORDER BY는 SQL 조회 함수(getTodayCheckins)가 단독으로 소유, 파생 함수(buildTrajectoryCoordinates)는 재정렬하지 않는다"
    - "순수 모듈 격리: src/today/trajectory.ts처럼 네이티브 모듈/지도 라이브러리를 import하지 않는 파생 로직은 @jest-environment node로 온전히 단위 테스트 가능"

key-files:
  created:
    - src/today/trajectory.ts
    - src/today/trajectory.test.ts
  modified:
    - src/db/migrations.ts
    - src/db/testing/nodeSqliteAdapter.ts
    - src/db/testing/nodeSqliteAdapter.test.ts
    - src/checkin/checkinRepo.ts
    - src/checkin/checkinRepo.test.ts

key-decisions:
  - "getTodayCheckins 시그니처는 임의의 localDateKey를 받도록 유지 — Phase 6(캘린더 과거 날짜 뷰)이 같은 함수를 재사용"
  - "MigratableDb 확장은 정확히 한 줄만 변경 — 마이그레이션 러너 본문/DATABASE_VERSION은 절대 건드리지 않음(migration_discipline #2)"

patterns-established:
  - "Pattern: getAllAsync 구현은 기존 getFirstAsync/runAsync와 동일하게 resolveBindArgs 헬퍼를 재사용해 배열/가변인자 바인드 파라미터 계약을 통일 유지"

requirements-completed: [REQ-today-view, REQ-trajectory-line]

# Metrics
duration: ~20min
completed: 2026-08-31
---

# Phase 4 Plan 01: 오늘 뷰 데이터 레이어 Summary

**오늘 뷰(지도 핀 + 바텀시트 리스트 + 궤적선)가 공유할 데이터 레이어: MigratableDb.getAllAsync 확장, checkinRepo.getTodayCheckins 단일 조회, trajectory.buildTrajectoryCoordinates 순수 함수 — 화면 배선 없이 41개 테스트로 검증 완료**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-31T04:27:36Z
- **Tasks:** 3 completed (모두 TDD RED→GREEN)
- **Files modified:** 7 (신규 2, 수정 5)

## Accomplishments
- `MigratableDb`가 `getAllAsync`를 지원하도록 확장하고, `node:sqlite` 테스트 어댑터에 실제 SQLite 엔진 기반 구현을 추가(기존 `resolveBindArgs` 헬퍼 재사용)
- `checkinRepo.ts`에 `getTodayCheckins(db, localDateKey)` 단일 공유 쿼리 추가 — 리스트와 지도 핀이 정확히 하나의 조회 함수를 공유(D-11)
- `src/today/trajectory.ts`에 `buildTrajectoryCoordinates` 순수 함수 추가 — 0/1건은 빈 배열, 2건 이상은 입력 순서 그대로 `{ latitude, longitude }` 매핑, 지도/네이티브 모듈 미의존

## Task Commits

Each task followed TDD RED→GREEN and was committed atomically:

1. **Task 1: MigratableDb에 getAllAsync 추가 + node:sqlite 어댑터 구현**
   - `5d11582` test(04-01): getAllAsync 실패 테스트 추가 (RED)
   - `2fe6fdf` feat(04-01): MigratableDb에 getAllAsync 추가 + node:sqlite 어댑터 구현 (GREEN)
2. **Task 2: getTodayCheckins — 리스트/지도 핀 공용 단일 쿼리**
   - `a97cb2b` test(04-01): getTodayCheckins 실패 테스트 추가 (RED)
   - `e414441` feat(04-01): getTodayCheckins — 리스트/지도 핀 공용 단일 쿼리 추가 (GREEN)
3. **Task 3: buildTrajectoryCoordinates — 궤적선 좌표 파생(순수 함수)**
   - `4d16dd0` test(04-01): buildTrajectoryCoordinates 실패 테스트 추가 (RED)
   - `4503228` feat(04-01): buildTrajectoryCoordinates — 궤적선 좌표 파생(순수 함수) 추가 (GREEN)

_각 task는 RED(실패 테스트) → GREEN(최소 구현) 순서로 커밋됨._

## Files Created/Modified
- `src/db/migrations.ts` - `MigratableDb`에 `getAllAsync` 추가(1줄 diff만, 마이그레이션 러너 본문 무변경)
- `src/db/testing/nodeSqliteAdapter.ts` - `getAllAsync` 구현 추가(`resolveBindArgs` 재사용)
- `src/db/testing/nodeSqliteAdapter.test.ts` - `getAllAsync` 테스트 3종(빈 결과/순서 보존/바인드 파라미터 동등성)
- `src/checkin/checkinRepo.ts` - `getTodayCheckins(db, localDateKey)` 추가(`?` 플레이스홀더만 사용)
- `src/checkin/checkinRepo.test.ts` - `getTodayCheckins` 테스트 4종(날짜 필터/정렬/빈 결과/전체 컬럼)
- `src/today/trajectory.ts` (신규) - `buildTrajectoryCoordinates` 순수 함수, `TrajectoryCoordinate` 타입
- `src/today/trajectory.test.ts` (신규) - `buildTrajectoryCoordinates` 테스트 4종(0/1/2건 이상/순서 비재정렬)

## Decisions Made
- `getTodayCheckins`가 시각/타임존 판단을 하지 않는 순수 조회로 유지되도록, `localDateKey` 계산은 호출자(화면)에게 위임 — Phase 6 캘린더가 동일 함수를 재사용할 수 있게 함
- `MigratableDb` 타입 확장을 정확히 한 줄로 제한해 마이그레이션 러너의 "이전 버전 블록 사후 수정 금지" 규율(migration_discipline #2)을 acceptance criteria 레벨에서 강제

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] trajectory.ts 헤더 주석의 리터럴 문자열이 acceptance criteria의 grep 게이트와 충돌**
- **Found during:** Task 3 (buildTrajectoryCoordinates 구현 후 acceptance criteria 검증)
- **Issue:** 헤더 주석에 "react-native-maps"와 "ORDER BY"라는 문자열을 그대로 적어 `grep -c "react-native-maps\|expo-"`와 `grep -c "sort\|ORDER BY"` 게이트가 각각 1을 반환(0이어야 함) — 순수 모듈/비재정렬 계약을 코드로는 지키고 있었으나 주석 문구가 리터럴 매칭을 오염시킴
- **Fix:** 동일한 의미를 "지도 렌더링 라이브러리", "시간순 정렬 쿼리"로 바꿔 표현, 코드/동작은 변경 없음
- **Files modified:** src/today/trajectory.ts
- **Verification:** `grep -c "react-native-maps\|expo-" src/today/trajectory.ts` → 0, `grep -c "sort\|ORDER BY" src/today/trajectory.ts` → 0, 재실행한 4개 테스트 전부 green
- **Committed in:** `4503228` (Task 3 commit — 별도 fix 커밋 없이 GREEN 커밋에 포함)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - 사소한 문서 문구 조정, 동작 변경 없음)
**Impact on plan:** 코드 로직 변경 없이 주석 표현만 조정. Scope creep 없음.

## Issues Encountered
- 워크트리에 `node_modules`가 없어 `npm ci`로 의존성을 먼저 설치(기존 `package-lock.json` 기준 복원, 새 패키지 추가 아님)
- 워크트리 HEAD가 기대 base 커밋(6b3cf9c)보다 1커밋 뒤처져 있어(a010833) `git reset --hard`로 base를 일치시킴(uncommitted 변경 없음을 사전 확인)

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- 오늘 뷰 화면(지도 핀 + 바텀시트 리스트 + 궤적선) 배선에 필요한 조회/파생 로직 3종이 모두 실 SQLite 엔진 테스트로 검증됨 — 다음 plan은 화면 컴포넌트에서 `getTodayCheckins`와 `buildTrajectoryCoordinates`를 그대로 소비하면 됨
- 스키마 버전(`DATABASE_VERSION = 2`)과 마이그레이션 블록은 변경되지 않아 기존 체크인 데이터와의 호환성에 영향 없음
- `npm test` 전체 스위트(27 suites, 329 tests) 전부 green — 회귀 없음

## Verification Log

- `NODE_OPTIONS=--experimental-sqlite npx jest src/db src/checkin/checkinRepo.test.ts src/today` → 4 suites, 41 tests, 전부 통과
- `npx tsc --noEmit` → exit 0
- `npm test` (전체 스위트) → 27 suites, 329 tests, 전부 통과
- `git diff src/db/migrations.ts` → 1줄만 변경(`MigratableDb` 정의), `DATABASE_VERSION = 2` 불변 확인

## Self-Check: PASSED

- 신규/수정 파일 7개 전부 FOUND (`src/db/migrations.ts`, `src/db/testing/nodeSqliteAdapter.ts`, `src/db/testing/nodeSqliteAdapter.test.ts`, `src/checkin/checkinRepo.ts`, `src/checkin/checkinRepo.test.ts`, `src/today/trajectory.ts`, `src/today/trajectory.test.ts`)
- 커밋 해시 6개 전부 FOUND (`5d11582`, `2fe6fdf`, `a97cb2b`, `e414441`, `4d16dd0`, `4503228`)

---
*Phase: 04-today-view*
*Completed: 2026-08-31*
