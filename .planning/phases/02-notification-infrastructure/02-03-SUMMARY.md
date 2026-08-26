---
phase: 02-notification-infrastructure
plan: 03
subsystem: notifications
tags: [expo-notifications, typescript, jest, calendar-trigger, tdd]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    plan: 01
    provides: src/notifications/config.ts(NotificationDeps/NotificationSettings/CALENDAR_TRIGGER_TYPE/PHASE2_NOTIFICATION_SETTINGS),
      src/notifications/content.ts(NOTIFICATION_CONTENT), src/notifications/testing/fakeNotifications.ts(createFakeNotifications)
provides:
  - src/notifications/scheduling.ts — 결정론적 identifier 상수(CHECKIN_HOURLY_ID/EVERY_3H_HOURS/DAILY_REFLECTION_ID),
    checkin3hId, expectedCheckinIds/expectedNotificationIds(순수 함수, Plan 05 자가진단 판정 기준),
    ALL_MANAGED_IDS(10개), scheduleById(id, deps), applyNotificationSettings(settings, deps)
affects: [02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "migrations.ts와 동일한 '라이브 상태 조회 → 델타 계산 → 델타만 적용' 순서를
      applyNotificationSettings에 그대로 적용 — 취소를 등록보다 먼저 수행해 빈도 전환
      중 고아 트리거가 남지 않도록 함(Pitfall 4)"
    - "scheduleById(id, deps) 2-파라미터 인터페이스 계약을 그대로 유지하면서, settings에
      의존하는 트리거 계산은 내부 헬퍼(scheduleWithSettings)로 분리 — 공개 계약은 고정,
      내부 구현만 유연하게 확장"
    - "it('Test N: [<키워드>] <설명>') 넘버링에서 다른 그룹의 ASCII 키워드(hourly/every3h)가
      설명문에 우발적으로 섞이지 않도록 표현을 조정 — jest -t 필터가 substring 매칭이므로
      그룹 간 keyword 오염이 필터 격리를 깨뜨림"

key-files:
  created:
    - src/notifications/scheduling.ts
    - src/notifications/scheduling.test.ts
  modified: []

key-decisions:
  - "checkin-3h-<hour> id 생성 규칙: 02-RESEARCH.md Summary(배열 인덱스 0~7)와 Pattern 2
    코드 예시(시각 값)가 서로 다르게 적혀 있어, 계획이 명시적으로 지정한 대로 Pattern 2(실제
    코드 예시, 시각 값 그대로)를 정본으로 채택 — id만 보고 발화 시각을 알 수 있어야 디버깅
    로그가 읽힘"
  - "scheduleById(id, deps)는 인터페이스 계약대로 2-파라미터를 유지하고, Phase 2 런타임에
    실제로 쓰이는 유일한 설정인 PHASE2_NOTIFICATION_SETTINGS를 내부에서 참조 —
    applyNotificationSettings는 임의 settings를 테스트/통합 검증용으로 받아야 하므로(D-01),
    settings를 명시적으로 받는 내부 헬퍼(scheduleWithSettings)로 등록 로직을 공유"
  - "테스트 it() 설명문에서 다른 그룹의 ASCII 키워드(hourly/every3h)가 우발적으로 섞이면
    jest -t 필터 격리가 깨짐을 발견 — Test 8/9/13/14 설명을 재작성해 그룹 간 substring
    충돌 제거(Task 1 RED 단계에서 -t hourly가 3개가 아니라 7개를 선택하는 것으로 발견)"

requirements-completed: [REQ-notification-scheduling]

# Metrics
duration: ~20min
completed: 2026-08-26
---

# Phase 2 Plan 3: Notification Scheduling Module Summary

**반복 캘린더 트리거(방법 A) 스케줄링 모듈 — 결정론적 identifier + 기대 id 집합 순수 함수 + 취소 후 등록(applyNotificationSettings), 14개 시나리오 테스트로 회귀 고정**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-26 (worktree base 정렬 후)
- **Completed:** 2026-08-26T18:44:07Z
- **Tasks:** 2 완료
- **Files modified:** 2 (신규 2개)

## Accomplishments
- `src/notifications/scheduling.ts` 생성: `CHECKIN_HOURLY_ID`/`EVERY_3H_HOURS`/`DAILY_REFLECTION_ID` 상수, `checkin3hId`(시각 값 기반), `ALL_MANAGED_IDS`(10개, 이 앱이 소유해 취소 가능한 identifier 전체 우주)
- `expectedCheckinIds`/`expectedNotificationIds` 순수 함수 구현 — 저장소 없이 "현재 설정에서 기대되는 identifier 집합"을 계산, Plan 05 자가진단의 판정 기준이 될 계약
- `applyNotificationSettings(settings, deps)` 구현: 라이브 상태 조회 → 델타 계산 → (관리 대상 범위 내에서만) 취소 → 등록 순서로 Pitfall 4(빈도 전환 중 고아 트리거)를 방지, `ALL_MANAGED_IDS` 밖의 id는 불가침(T-02-07)
- TDD(RED→GREEN)로 14개 시나리오 테스트 작성·통과: hourly(3)/every3h(2)/off(2)/orphan(3)/reflection(2)/expected(2)
- `-t hourly`/`-t every3h`/`-t off`/`-t orphan` 4개 필터 명령이 각각 의도한 그룹만 정확히 선택함을 확인(02-VALIDATION.md 계약)

## Task Commits

Each task was committed atomically:

1. **Task 1: scheduling.test.ts — 4개 시나리오 실패 테스트 작성 (RED)** - `b96fca2` (test)
2. **Task 2: scheduling.ts 구현 — 결정론적 id + 기대 집합 + 취소 후 등록 (GREEN)** - `316f7ad` (feat)

_REFACTOR 단계는 불필요 — GREEN 구현이 바로 깨끗한 상태로 완료되어 별도 정리 커밋 없음._

## Files Created/Modified
- `src/notifications/scheduling.ts` - 결정론적 identifier 상수 + 기대 id 집합 계산 순수 함수 + 취소 후 등록 로직
- `src/notifications/scheduling.test.ts` - 14개 시나리오(hourly/every3h/off/orphan/reflection/expected) 회귀 테스트

## Decisions Made
- `checkin-3h-<hour>` id 생성 규칙에서 RESEARCH.md 문서 내부 불일치(Summary 문단 vs Pattern 2 코드 예시)를 발견 — 계획이 명시한 대로 Pattern 2(시각 값 그대로 노출)를 정본으로 채택하고 주석으로 근거를 남김
- `scheduleById(id, deps)` 2-파라미터 인터페이스 계약을 그대로 지키기 위해, settings 의존 로직을 `scheduleWithSettings` 내부 헬퍼로 분리 — 공개 표면은 Plan 05가 기대하는 시그니처 그대로 유지
- jest `-t` 필터가 전체 테스트 이름에 대한 substring 매칭이라는 점 때문에, 다른 그룹 태그의 ASCII 키워드가 설명문에 우발적으로 섞이면 필터 격리가 깨짐을 발견하고 테스트 설명문을 재작성

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `it()` 설명문에서 그룹 간 ASCII 키워드(hourly/every3h) 우발적 substring 충돌로 `-t` 필터 격리가 깨짐**
- **Found during:** Task 1 RED 검증 (`-t hourly` 실행 결과가 3개가 아니라 7개 선택)
- **Issue:** Test 8/9/13/14의 한글 설명문에 `checkin-hourly`/`every3h`를 리터럴로 인용했더니, `-t hourly`/`-t every3h` 필터가 의도한 그룹 밖의 테스트까지 함께 선택함(예: `-t hourly`가 [orphan]/[expected] 태그 테스트까지 포함해 7개 매칭)
- **Fix:** 해당 설명문을 한글 표현("매시간", "3시간마다")으로 재작성해 ASCII 키워드 우발적 포함을 제거 — 테스트가 검증하는 동작(코드 내부의 `CHECKIN_HOURLY_ID`/`checkin3hId(0)` 등 실제 identifier 사용)은 변경 없음
- **Files modified:** src/notifications/scheduling.test.ts
- **Verification:** `-t hourly`=3, `-t every3h`=2, `-t off`=2, `-t orphan`=3 각각 정확히 매칭 확인
- **Committed in:** b96fca2 (Task 1 RED 커밋에 포함 — 커밋 전에 발견해 수정)

**2. [Rule 1 - Bug] `it('Test N: ...')` 리터럴 grep 패턴과 큰따옴표 문자열 불일치 (14 대신 8로 카운트됨)**
- **Found during:** Task 1 acceptance criteria 검증 (`grep -c "it('Test " scheduling.test.ts` == 8, 기준 14)
- **Issue:** Test 1/2/3/6/7/10 설명문에 작은따옴표(`'checkin-hourly'`, `'off'` 등)가 포함돼 있어 JS 문자열을 큰따옴표(`it("Test N: ...")`)로 작성했더니, acceptance criteria가 요구하는 `it('Test ` 리터럴 패턴과 불일치(02-01 Plan에서도 동일 이슈가 선례로 발견됨)
- **Fix:** 해당 6개 테스트를 전부 작은따옴표 문자열로 변경하고 내부 작은따옴표는 `\'`로 이스케이프
- **Files modified:** src/notifications/scheduling.test.ts
- **Verification:** `grep -c "it('Test " scheduling.test.ts` == 14
- **Committed in:** b96fca2 (Task 1 RED 커밋에 포함)

**3. [Rule 4 - Architectural, resolved without user input via plan's own contract] `scheduleById` 시그니처에 `settings` 파라미터가 필요했으나 인터페이스 계약은 2-파라미터로 고정**
- **Found during:** Task 2 GREEN 구현 초안 (daily_reflection 트리거의 `hour`를 계산하려면 `settings.dailyReflectionHour`가 필요했음)
- **Analysis:** 이건 실제로는 아키텍처 변경이 아니라 계획 `<interfaces>` 블록이 이미 못박아 둔 계약(`scheduleById(id, deps)` — Plan 05 소비 대상)을 어떻게 지킬지의 구현 디테일 문제였음. PROJECT.md 참고 없이 계획 문서 자체의 `<interfaces>` 섹션과 CONTEXT.md D-01(Phase 2 런타임 유일 설정 = `PHASE2_NOTIFICATION_SETTINGS`)로 답이 이미 정해져 있어 사용자 확인 없이 진행
- **Fix:** `scheduleById(id, deps)`는 계약대로 2-파라미터를 유지하고 내부에서 `PHASE2_NOTIFICATION_SETTINGS`를 참조, `applyNotificationSettings`는 임의 settings를 받는 내부 헬퍼(`scheduleWithSettings`)로 등록 로직을 공유
- **Files modified:** src/notifications/scheduling.ts
- **Verification:** 14개 테스트 green, `scheduleById` 시그니처가 `<interfaces>` 블록과 정확히 일치(`grep`으로 export 시그니처 육안 확인)
- **Committed in:** 316f7ad (Task 2 GREEN 커밋에 포함)

---

**Total deviations:** 3 auto-fixed (Rule 1 x2 — 테스트 검증 과정에서 발견된 필터/grep 패턴 버그, Rule 4 해당하나 계획 자체 계약으로 이미 답이 정해져 사용자 확인 불필요했던 구현 디테일 1건)
**Impact on plan:** 전부 테스트 표현/내부 구조 조정으로, 계획의 의도(결정론적 identifier, 기대 집합 순수 함수, 취소 후 등록 순서, Plan 05 소비 계약)는 변경 없음. 스코프 크리프 없음.

## TDD Gate Compliance

- RED 게이트: `test(02-03): scheduling 모듈 14개 시나리오 실패 테스트 작성 (RED)` — `b96fca2`
- GREEN 게이트: `feat(02-03): scheduling.ts 구현 - 결정론적 id + 기대 집합 + 취소 후 등록 (GREEN)` — `316f7ad`
- REFACTOR 게이트: 해당 없음 — GREEN 구현이 정리 없이 바로 green

## Issues Encountered
None — 위 Deviations 항목 외 추가 문제 없음.

## User Setup Required
None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 05(자가진단 레지스트리)가 `expectedNotificationIds`/`ALL_MANAGED_IDS`/`scheduleById`/`CHECKIN_HOURLY_ID` 등 `<interfaces>` 블록에 명시된 계약만으로 이 모듈을 소비 가능
- 전체 스위트 71개 테스트 green(Phase 1 41개 + Plan 01 10개 + Plan 02 infoPlist 관련 + 이 plan 14개 등), `tsc --noEmit` exit 0
- 블로커 없음

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-26*

## Self-Check: PASSED

- FOUND: src/notifications/scheduling.ts
- FOUND: src/notifications/scheduling.test.ts
- FOUND: .planning/phases/02-notification-infrastructure/02-03-SUMMARY.md
- FOUND: b96fca2, 316f7ad, 673da12 (git log --oneline -5 확인)
