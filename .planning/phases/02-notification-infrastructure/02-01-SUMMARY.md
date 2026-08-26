---
phase: 02-notification-infrastructure
plan: 01
subsystem: infra
tags: [expo-notifications, typescript, jest, test-double, calendar-trigger]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: src/theme/tokens.ts 상수 모듈 규약, src/db/testing/nodeSqliteAdapter.ts 테스트
      더블 패턴(좁힌 타입 + 단일 캐스트), Jest 29 + jest-expo/ios 테스트 인프라
provides:
  - expo-notifications ~57.0.14 설치(app.json 무변경)
  - src/notifications/config.ts — NotificationFrequency/NotificationSettings/NotificationDeps
    타입, CALENDAR_TRIGGER_TYPE, PHASE2_NOTIFICATION_SETTINGS(하드코딩 매시간/회고 21시)
  - src/notifications/content.ts — 알림 문구 단일 출처(NOTIFICATION_CONTENT)
  - src/notifications/deps.ts — expo-notifications 런타임 import를 격리하는 유일한 파일,
    CALENDAR_TRIGGER_TYPE ↔ SDK enum 컴파일타임 정합성 단언
  - src/notifications/testing/fakeNotifications.ts — NotificationDeps를 만족하는 인메모리
    테스트 더블 + 10개 계약 테스트(fakeNotifications.test.ts)
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: [expo-notifications@~57.0.14]
  patterns:
    - "알림 모듈 타입 전용 import 격리: config.ts는 `import type * as Notifications`만
      사용, 런타임 import는 deps.ts 단 하나로 제한"
    - "테스트 더블은 프로덕션 인터페이스를 직접 import하지 않고, Parameters/ReturnType으로
      타입을 유도(NotificationDeps 기반) — nodeSqliteAdapter.ts와 동일한 '단일 캐스트,
      export 경계 밖으로 새지 않음' 규율"
    - "nominal string enum(SchedulableTriggerInputTypes, PermissionStatus) 값은 캐스트
      한 곳(deps.ts 단언, fakeNotifications.ts buildPermissionsStatus)에서만 흡수"

key-files:
  created:
    - src/notifications/config.ts
    - src/notifications/content.ts
    - src/notifications/deps.ts
    - src/notifications/testing/fakeNotifications.ts
    - src/notifications/testing/fakeNotifications.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "content.ts 헤더 주석에서 '오늘 돌아보기' 중복 언급과 'body' 리터럴을 제거 — Task 1
    acceptance criteria(grep -c 정확히 1회/0회)와 문구 그레핑 규칙이 주석 텍스트까지
    포함해 검사하므로, 주석 표현을 규칙에 맞게 재구성"
  - "테스트 파일의 CALENDAR 트리거 입력은 NotificationDeps에서 Parameters로 유도한 타입에
    캐스트해 구성 — SchedulableTriggerInputTypes가 nominal string enum이라 플레인 문자열
    리터럴 'calendar'가 캐스트 없이 대입되지 않음(deps.ts의 컴파일타임 단언과 동일 이슈)"
  - "it('Test N: ...') 한글 넘버링 규약을 acceptance criteria의 리터럴 grep 패턴에 맞춰
    전부 단일따옴표로 통일(내부 작은따옴표는 \\'로 이스케이프) — Test 7~10 설명에 작은
    따옴표가 포함돼 처음엔 큰따옴표로 썼다가 grep -c \"it('Test \" == 10 기준에 맞게 수정"

requirements-completed: [REQ-notification-scheduling]

# Metrics
duration: ~15min
completed: 2026-08-27
---

# Phase 2 Plan 1: Notification Contract Layer Summary

**expo-notifications ~57.0.14 설치 + 알림 타입/상수/네이티브 바인딩 계약 4모듈과 10개 테스트로 검증된 인메모리 알림 테스트 더블**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-27 (worktree base 정렬 후)
- **Completed:** 2026-08-27T03:32:49+09:00
- **Tasks:** 2 완료
- **Files modified:** 7 (package.json, package-lock.json + 신규 5개)

## Accomplishments
- `npx expo install expo-notifications`로 SDK 57 호환 버전(`~57.0.14`) 설치, `app.json` 무변경 확인
- 알림 타입/상수 단일 출처 3모듈(`config.ts`/`content.ts`/`deps.ts`) 생성 — `expo-notifications` 런타임 import가 `deps.ts` 한 곳으로 격리됨
- `CALENDAR_TRIGGER_TYPE` 리터럴과 실제 SDK `SchedulableTriggerInputTypes.CALENDAR` 값의 컴파일타임 정합성 단언(`deps.ts`) 구현
- TDD(RED→GREEN)로 인메모리 알림 테스트 더블(`fakeNotifications.ts`) 구현 — 예약/취소/덮어쓰기/자동 id/권한 3상태 전이/시드 헬퍼를 10개 테스트로 고정
- 02-VALIDATION.md Wave 0 gap(테스트 더블 부재) 해소 — Plan 03~07이 네이티브 모듈 없이 유닛 테스트 가능

## Task Commits

Each task was committed atomically:

1. **Task 1: expo-notifications 설치 + 계약 상수/타입 모듈 3개 생성** - `26271b7` (feat)
2. **Task 2: 인메모리 알림 테스트 더블 + 그 계약 테스트** - `093c1c1` (test, RED) → `2aefeee` (feat, GREEN)

_TDD 태스크(Task 2)는 계획대로 test→feat 2단계 커밋으로 분리됨. REFACTOR 단계는 불필요(코드 정리 없이 바로 green)._

**Plan metadata:** (다음 커밋 — 이 SUMMARY와 함께 기록)

## Files Created/Modified
- `package.json`, `package-lock.json` — `expo-notifications: ~57.0.14` 의존성 추가
- `src/notifications/config.ts` - `NotificationFrequency`/`NotificationSettings`/`NotificationDeps` 타입, `CALENDAR_TRIGGER_TYPE`, `PHASE2_NOTIFICATION_SETTINGS`(매시간/회고 기본 켜짐·21시)
- `src/notifications/content.ts` - 알림 문구 단일 출처(`체크인할 시간이에요`/`오늘 돌아보기`)
- `src/notifications/deps.ts` - `expo-notifications`를 실제로 바인딩하는 유일한 파일, SDK enum 정합성 컴파일타임 단언
- `src/notifications/testing/fakeNotifications.ts` - `NotificationDeps`를 만족하는 인메모리 더블(Map 기반 저장소)
- `src/notifications/testing/fakeNotifications.test.ts` - 더블의 계약을 고정하는 10개 테스트

## Decisions Made
- `content.ts`/테스트 파일의 acceptance-criteria용 grep 패턴이 주석 텍스트도 그대로 검사한다는 점을 발견 — 문구를 규칙에 맞춰 재작성(아래 Deviations 참고)
- 테스트 더블은 `expo-notifications`를 전혀 import하지 않고, `NotificationDeps`(`../config.ts`)에서 `Parameters`/`ReturnType`으로 필요한 타입을 전부 유도 — 계약(타입) 결합은 유지하되 런타임 결합은 완전히 제거
- 권한 상태(`PermissionStatus`)와 트리거 타입(`SchedulableTriggerInputTypes`)이 TypeScript nominal string enum이라 리터럴 문자열을 캐스트 없이 대입할 수 없음을 확인 — `nodeSqliteAdapter.ts`의 "단일 캐스트, 경계 밖으로 안 샘" 규율을 그대로 적용해 `deps.ts`(1곳)와 `fakeNotifications.ts`의 `buildPermissionsStatus`(1곳), 테스트 파일의 트리거 캐스트(1곳)로 캐스트를 격리

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] content.ts 헤더 주석이 자체 acceptance criteria(grep -c)와 충돌**
- **Found during:** Task 1 검증
- **Issue:** `content.ts` 헤더 주석에 "확정 섹션명 '오늘 돌아보기'"와 "body 문구를 창작하지 않는다"라는 설명을 넣었더니, `grep -c "오늘 돌아보기"` == 2(기준 1)와 `grep -c "body"` == 2(기준 0)로 acceptance criteria를 위반
- **Fix:** 주석 문구를 "확정 섹션명"(중복 언급 제거), "부가 설명 필드"(body 리터럴 대체)로 재작성 — 의미는 동일하게 유지
- **Files modified:** src/notifications/content.ts
- **Verification:** `grep -c "오늘 돌아보기" content.ts` == 1, `grep -c "체크인할 시간이에요" content.ts` == 1, `grep -c "body" content.ts` == 0 전부 통과
- **Committed in:** 26271b7 (Task 1 커밋에 포함 — 커밋 전에 발견해 수정)

**2. [Rule 3 - Blocking] TypeScript nominal enum으로 인한 트리거 리터럴 타입 불일치**
- **Found during:** Task 2 GREEN 이후 `npx tsc --noEmit`
- **Issue:** 테스트 파일에서 `{ type: 'calendar', minute: 0, repeats: true }`를 트리거로 바로 대입하면 `SchedulableTriggerInputTypes.CALENDAR`가 nominal string enum이라 타입 에러(`TS2322`) 발생
- **Fix:** `NotificationDeps['scheduleNotificationAsync']`에서 `Parameters`로 트리거 타입을 유도해 캐스트(`as ScheduleTrigger`) — `'expo-notifications'`를 직접 import하지 않고도 타입 정합성 확보
- **Files modified:** src/notifications/testing/fakeNotifications.test.ts
- **Verification:** `npx tsc --noEmit` exit 0, 전체 스위트 green
- **Committed in:** 093c1c1 (RED 커밋에 포함 — GREEN 구현 전 수정 완료)

**3. [Rule 3 - Blocking] acceptance criteria의 `it('Test ` 리터럴 grep 패턴과 실제 코드 불일치**
- **Found during:** Task 2 GREEN 이후 acceptance criteria 재검증
- **Issue:** Test 7~10 설명문에 작은따옴표(`'denied'`, `['x','y']` 등)가 포함돼 있어 JS 문자열을 큰따옴표(`it("Test 7: ...")`)로 작성했더니, `grep -c "it('Test "` == 6(기준 10)으로 acceptance criteria 위반
- **Fix:** Test 7~10을 전부 작은따옴표 문자열로 변경하고 내부 작은따옴표는 `\'`로 이스케이프
- **Files modified:** src/notifications/testing/fakeNotifications.test.ts
- **Verification:** `grep -c "it('Test " fakeNotifications.test.ts` == 10, 10개 테스트 전부 green
- **Committed in:** 093c1c1 (RED 커밋에 포함)

---

**Total deviations:** 3 auto-fixed (전부 Rule 3 — acceptance criteria 검증 과정에서 발견된 차단 이슈)
**Impact on plan:** 전부 검증 스크립트/타입 시스템 제약에 맞춘 표현 수정으로, 계획의 의도(문구 출처, 계약 타입, 테스트 커버리지)는 변경 없음. 스코프 크리프 없음.

## Issues Encountered
None — 위 Deviations 항목 외 추가 문제 없음.

## User Setup Required
None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 03~07이 `<interfaces>` 블록(NotificationDeps/NotificationSettings/CALENDAR_TRIGGER_TYPE/NOTIFICATION_CONTENT/createFakeNotifications)만으로 코드베이스 탐색 없이 구현 가능
- 02-VALIDATION.md Wave 0 gap 중 "`src/notifications/__mocks__/expo-notifications.ts` 수동 모킹"과 "`AppState` 모킹 헬퍼"는 이 plan의 스코프 밖(스케줄링/레지스트리/권한 로직을 다루는 후속 plan 소관) — `fakeNotifications.ts`가 그 로직들이 의존성 주입으로 받을 대체 구현체 역할을 함
- 전체 스위트 51개 테스트 green(Phase 1 41개 + 이 plan 10개), `tsc --noEmit` exit 0
- 블로커 없음

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*
