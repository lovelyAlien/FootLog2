---
phase: 05-check-in-detail-edit
plan: 02
subsystem: database
tags: [sqlite, intl, expo-file-system, checkin-repo, testing-doubles]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: checkinRepo.ts (commitCheckin/getLatestCheckinCoordinate/updateCheckinNoteAndPhoto), localDate.ts (resolveTimeZone/formatLocalTime), config.ts/deps.ts PhotoStorageDeps 포트 원형
  - phase: 04-today-view
    provides: checkinRepo.ts getTodayCheckins (오늘 뷰 조회 쿼리)
provides:
  - "getCheckinById(db, id) — 체크인 단건 조회, 존재하지 않으면 null"
  - "deleteCheckin(db, id) — 체크인 단건 삭제(멱등, 사진 파일 정리는 책임 밖)"
  - "formatLocalMonthDay(iso, timeZone?) — 로컬 월/일 문자열(예: '8월 31일'), Intl 기반"
  - "PhotoStorageDeps.deleteFile(uri) 포트 + 실구현(new File(uri).delete()) + 테스트 더블(__deletions())"
affects: [05-03 (상세화면), 05-05 (스와이프 삭제 지연 커밋), 05-06/05-07 (사진 교체/삭제 배선)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "repo 함수는 항상 같은 파일에 같은 스타일로 추가(SQL은 checkinRepo.ts에만, 파라미터 바인딩만 사용)"
    - "네이티브 삭제는 deps.ts 단일 소유 규약 유지, config.ts는 타입 포트만 확장"
    - "테스트 더블은 프로덕션 포트 타입을 그대로 만족하며 __copies()/__deletions() 같은 대칭 인스펙터를 노출"

key-files:
  created: []
  modified:
    - src/checkin/checkinRepo.ts
    - src/checkin/checkinRepo.test.ts
    - src/checkin/localDate.ts
    - src/checkin/localDate.test.ts
    - src/checkin/config.ts
    - src/checkin/deps.ts
    - src/checkin/testing/fakePhotoStorage.ts

key-decisions:
  - "deleteCheckin은 DB row만 책임지고 사진 파일 정리는 호출자(05-05)가 PhotoStorageDeps.deleteFile로 별도 수행 — 05-RESEARCH.md Open Question #2에 대한 이 phase의 확정 답"
  - "formatLocalMonthDay는 ko-KR 로케일 사용(formatLocalTime의 en-GB와 다름) — 이 문자열은 사용자에게 한국어로 직접 노출되는 문구이기 때문"

patterns-established:
  - "PhotoStorageDeps 포트 확장 시 config.ts/deps.ts/fakePhotoStorage.ts 3자를 원자적으로(한 커밋으로) 갱신"

requirements-completed: [REQ-checkin-detail-base, REQ-checkin-detail-layout, REQ-checkin-swipe-delete]

# Metrics
duration: 20min
completed: 2026-09-01
---

# Phase 5 Plan 02: 체크인 상세/삭제 데이터 레이어 확장 Summary

**checkinRepo.ts에 단건 조회/삭제, localDate.ts에 Intl 기반 로컬 월/일 포맷, PhotoStorageDeps에 사진 삭제 포트를 추가해 상세화면·스와이프 삭제 plan이 SQL/expo-file-system을 직접 만지지 않고도 동작하게 함**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-31T17:00Z (대략)
- **Completed:** 2026-08-31T17:21:05Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- `getCheckinById(db, id)` / `deleteCheckin(db, id)` — 실제 SQLite 엔진 테스트(9개 케이스, `getTodayCheckins`와의 상호작용 케이스 포함) 통과
- `formatLocalMonthDay(iso, timeZone?)` — Intl 기반, 자정 경계·타임존별 차이·연도 미포함까지 4개 케이스로 고정
- `PhotoStorageDeps.deleteFile` 포트 — 실구현(`new File(uri).delete()`) + 테스트 더블(`__deletions()`) + `tsc --noEmit`/네이티브 격리 가드 통과

## Task Commits

TDD 태스크(Task 1, 2)는 RED/GREEN을 별도 커밋으로 분리했다:

1. **Task 1: checkinRepo에 getCheckinById/deleteCheckin 추가**
   - `2bdb5dd` (test) — RED: 5개 케이스 작성, 함수 미구현으로 실패 확인
   - `b27cbf7` (feat) — GREEN: 두 함수 구현, 20/20 테스트 통과
2. **Task 2: localDate에 formatLocalMonthDay 추가**
   - `687157b` (test) — RED: 4개 케이스 작성, 함수 미구현으로 실패 확인
   - `3d889cf` (feat) — GREEN: 함수 구현, 13/13 테스트 통과
3. **Task 3: PhotoStorageDeps에 deleteFile 포트 추가** - `0816dbc` (feat, 3파일 원자적 커밋)

**Plan metadata:** (이 커밋 이후 별도로 기록)

## Files Created/Modified
- `src/checkin/checkinRepo.ts` - `getCheckinById`/`deleteCheckin` 추가(SQL은 파라미터 바인딩만, 이 파일에만 존재)
- `src/checkin/checkinRepo.test.ts` - 위 두 함수의 5개 동작 케이스(실제 SQLite 엔진)
- `src/checkin/localDate.ts` - `formatLocalMonthDay` 추가(Intl `ko-KR`, month/day만)
- `src/checkin/localDate.test.ts` - 4개 케이스(자정 경계 포함)
- `src/checkin/config.ts` - `PhotoStorageDeps` 타입에 `deleteFile(uri): Promise<void>` 추가
- `src/checkin/deps.ts` - `defaultPhotoStorageDeps.deleteFile` 실구현(`new File(uri).delete()`)
- `src/checkin/testing/fakePhotoStorage.ts` - `deleteFile` 더블 + `__deletions()` 인스펙터

## Decisions Made
- `deleteCheckin`은 checkins row 삭제만 책임지고 `photo_path` 파일 정리를 하지 않는다 — 호출자(05-05-PLAN.md 지연 삭제 커밋 경로)가 `PhotoStorageDeps.deleteFile`로 별도 수행. RESEARCH.md Assumption A3 / Open Question #2에 대한 phase 확정 답이며, 다음 phase가 repo 함수에 파일 I/O를 밀어 넣는 것을 이 주석이 방지한다.
- `formatLocalMonthDay`는 기존 `formatLocalTime`(en-GB)과 다르게 `ko-KR` 로케일을 쓴다 — 시간 표시와 달리 이 문자열은 사용자에게 한국어로 직접 노출되기 때문(상세화면 헤더 타이틀).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 워크트리 브랜치가 잘못된 base 커밋에 anchor돼 있어 재설정**
- **Found during:** 실행 시작 직후, Task 1 RED 작성 전
- **Issue:** worktree 브랜치(`worktree-agent-aa7bef0fb285a2751`)의 HEAD가 Phase 3 완료 커밋(`a010833`)에 고정돼 있었다 — Phase 4(today-view, `getTodayCheckins` 등)와 Phase 5 계획 문서 커밋들이 전혀 반영되지 않은 상태였다. 이 plan의 interfaces 절이 전제하는 `getTodayCheckins`/`updateCheckinNoteAndPhoto` 등 기존 시그니처가 실제로는 checkout에 존재하지 않았다.
- **Fix:** `worktree-agent-*` 브랜치임을 확인한 뒤(`git rev-parse --abbrev-ref HEAD`), 이 phase의 실제 기반인 `gsd/phase-04-today-view` 브랜치 tip(`e53b790`, Phase 4 완료 + Phase 5 계획 문서 커밋 포함)으로 `git reset --hard`했다. 리셋 전 워킹트리에는 이 실행 중 만든 미커밋 편집 1건만 있었고(재작업 예정이었으므로 손실 없음), 다른 미커밋 변경은 없었다.
- **Files modified:** 없음(브랜치 포인터만 이동)
- **Verification:** 리셋 후 `src/checkin/checkinRepo.ts`가 main 체크아웃에서 읽은 내용과 동일함을 확인, `git log --oneline -3`으로 Phase 5 계획 문서 커밋이 HEAD에 있음을 확인
- **Committed in:** 해당 없음(리셋은 커밋이 아님, 이후 모든 Task 커밋이 올바른 base 위에서 이뤄짐)

**2. [Rule 1 - Bug] deps.ts 주석의 리터럴 문자열이 acceptance criteria grep 게이트를 오탐시킴**
- **Found during:** Task 3 acceptance criteria 검증
- **Issue:** Task 3의 gate(`grep -v '^//' src/checkin/deps.ts | grep -Ec "deleteAsync|expo-file-system/legacy"`가 0이어야 함)가 2를 반환했다 — 실제 코드가 아니라 들여쓰기된(`  //`) 설명 주석이 "deleteAsync"/"expo-file-system/legacy" 문자열을 그대로 포함해, `^//`(들여쓰기 없는 줄만 제외)로는 걸러지지 않았다.
- **Fix:** 같은 rationale을 유지하되 "deleteAsync"/"expo-file-system/legacy" 리터럴 문자열 대신 "구 버전(legacy) 모듈의 삭제 함수"로 재서술
- **Files modified:** `src/checkin/deps.ts`
- **Verification:** `grep -v '^//' src/checkin/deps.ts | grep -Ec "deleteAsync|expo-file-system/legacy"` = 0, `npx tsc --noEmit` 통과
- **Committed in:** `0816dbc` (Task 3 커밋에 포함, 별도 커밋 아님)

---

**Total deviations:** 2 auto-fixed (1 blocking - 브랜치 base 정합화, 1 bug - acceptance criteria grep 오탐 해소)
**Impact on plan:** 두 건 모두 계획 실행을 정상 궤도로 되돌리는 데 필요했다. 스코프 확장 없음.

## Issues Encountered
없음 — 위 두 건은 Deviations 절에서 다룸.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `getCheckinById`/`deleteCheckin`/`formatLocalMonthDay`/`PhotoStorageDeps.deleteFile` 네 가지가 모두 구현·테스트로 고정됨 — 05-03(상세화면), 05-05(스와이프 삭제 지연 커밋), 05-06/05-07(사진 교체/삭제)이 SQL이나 expo-file-system을 직접 만지지 않고 이 함수들만 호출하면 됨.
- 전체 `src/checkin/` 테스트(11 suites, 119 tests) 및 `npx tsc --noEmit` 그린 확인됨.
- 워크트리가 이제 `gsd/phase-04-today-view` tip(Phase 5 계획 문서 포함) 위에 정확히 anchor돼 있으므로, 05-01(라우트 재구성) 등 이 wave의 다른 병렬 plan과 병합 시 base 불일치 리스크가 해소됨 — 다만 다른 worktree(`worktree-agent-a5897311173973eb6`)도 동일한 base 정합성 문제를 겪었을 가능성이 있어 오케스트레이터가 병합 전 확인할 필요 있음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: src/checkin/checkinRepo.ts
- FOUND: src/checkin/checkinRepo.test.ts
- FOUND: src/checkin/localDate.ts
- FOUND: src/checkin/localDate.test.ts
- FOUND: src/checkin/config.ts
- FOUND: src/checkin/deps.ts
- FOUND: src/checkin/testing/fakePhotoStorage.ts
- FOUND commits: 2bdb5dd, b27cbf7, 687157b, 3d889cf, 0816dbc (git log --oneline 2bdb5dd..0816dbc)
