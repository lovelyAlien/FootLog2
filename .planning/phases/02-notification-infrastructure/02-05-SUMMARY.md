---
phase: 02-notification-infrastructure
plan: 05
subsystem: notifications
tags: [expo-notifications, typescript, jest, self-healing, tdd]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    plan: 03
    provides: "src/notifications/scheduling.ts(expectedNotificationIds/ALL_MANAGED_IDS/
      scheduleById/CHECKIN_HOURLY_ID/DAILY_REFLECTION_ID/EVERY_3H_HOURS/checkin3hId)"
  - phase: 02-notification-infrastructure
    plan: 04
    provides: "src/notifications/permissions.ts(fetchNotificationPermission)"
provides:
  - "src/notifications/registry.ts — buildNotificationRegistry(settings): RegistryEntry[],
    selfHeal(settings, deps): Promise<SelfHealReport>,
    runForegroundNotificationCheck(settings?, deps?): Promise<SelfHealReport | null>"
affects: [02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "migrations.ts의 '라이브 상태 조회 → 델타 계산 → 델타만 적용' 순서를 selfHeal에
      그대로 재적용 — 취소를 재생성보다 먼저 수행"
    - "레지스트리 배열이 '관리 대상 트리거 전부'를 항목으로 갖고 각 항목의 isEnabled()가
      현재 설정을 판정하는 구조 — 트리거 종류가 늘어도 자가진단 로직 자체는 불변(배열
      확장만으로 대응)"
    - "체크인 빈도 off일 때 후보 0개 대신 CHECKIN_HOURLY_ID 비활성 항목 1개를 남기는
      비대칭 설계 — 자가진단 리포트가 '꺼져서 건너뜀'을 표현할 수 있어야 함"
    - "포그라운드 오케스트레이터는 권한 게이트(early-return) → selfHeal(순수 판정
      함수, 로깅 없음) → 재생성/취소 발생 시에만 단일 console.log로 3단 분리 —
      selfHeal 자체는 테스트가 콘솔을 신경 쓰지 않아도 되는 순수 함수로 유지"

key-files:
  created:
    - src/notifications/registry.ts
    - src/notifications/registry.test.ts
  modified: []

key-decisions:
  - "Test 16의 console.log 인자 단언(재생성 id가 로그 문자열에 포함)을 만족시키기 위해
    구현의 로그 포맷을 객체 인자(`console.log('...', {recreated, cancelled})`) 대신
    템플릿 리터럴 문자열(`console.log(\`... recreated=${JSON.stringify(...)} ...\`)`)로
    작성 — 객체를 그대로 넘기면 mock.calls.flat().join(' ')이 '[object Object]'로
    직렬화돼 id를 못 찾음을 GREEN 검증 중 발견하고 수정. console.log 호출 지점은
    여전히 1곳(acceptance criteria 계약 유지)"
  - "Task 1 RED 초안에서 Test 1의 it() 설명문을 큰따옴표로 작성했다가 acceptance
    criteria의 grep -c \"it('Test \" == 17 리터럴 패턴과 불일치(16으로 카운트)를 발견 —
    Plan 01/03/04에서 반복된 동일 이슈, 작은따옴표로 통일해 해결"

requirements-completed: [REQ-notification-scheduling]

# Metrics
duration: ~15min
completed: 2026-08-27
---

# Phase 2 Plan 5: 알림 자가진단 레지스트리 Summary

**`[{id, kind, isEnabled, recreate}]` 자가진단 레지스트리 + selfHeal(누락만 재생성/꺼진
항목 스킵/부분 실패 집합 감지/고아 정리) + 포그라운드 오케스트레이터(권한 게이트 →
selfHeal → 콘솔 전용 로그)를 17개 시나리오 테스트로 회귀 고정**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-26 (worktree wave 3 base 정렬 후)
- **Completed:** 2026-08-27
- **Tasks:** 2 완료 (TDD RED → GREEN)
- **Files modified:** 2 (신규 생성)

## Accomplishments

- `buildNotificationRegistry(settings)` 구현: 체크인은 빈도별 후보 id(`expectedCheckinIds`)를
  항목화하되, `off`일 때는 후보 0개 대신 `CHECKIN_HOURLY_ID` 비활성 항목 1개를 남겨
  자가진단 리포트가 "꺼져서 건너뜀"을 표현할 수 있게 함. `recreate`는 전부 Plan 03의
  `scheduleById`에 위임(트리거 형태/문구를 이 파일에서 재정의하지 않음)
- `selfHeal(settings, deps)` 구현: migrations.ts와 동일한 "라이브 조회 → 델타 계산 →
  델타만 적용" 순서. 누락분만 재생성(Pitfall 1), 꺼진 항목은 `skippedDisabled`에 담고
  절대 재생성하지 않음(Pitfall 2, T-02-12), 8개 중 일부만 사라진 부분 실패를 항목
  전체 순회로 집합 단위 감지(Pitfall 3), `ALL_MANAGED_IDS` 밖 id는 절대 취소하지 않는
  가드 내에서 이전 빈도 고아만 정리(Pitfall 4, T-02-13)
- `runForegroundNotificationCheck(settings?, deps?)` 구현: 권한 미승인 시 즉시 `null`
  반환(early-return, T-02-14 — DoS 방지), 승인 시 `selfHeal` 호출 후 재생성/취소가
  실제로 발생했을 때만 단일 `console.log`로 관찰 가능(D-07 — 사용자 대면 UI 신호 없음,
  T-02-15 — 로그에 identifier 문자열만 포함)
- TDD RED(17개 테스트, 스텁이 전부 'not implemented'로 실패) → GREEN(17개 전부 통과)
  순서 준수, `-t selfHeal`(3)/`-t disabledSkip`(2)/`-t partialFailure`(2) 필터 격리 확인
- `npx tsc --noEmit` exit 0, 전체 스위트 104개 테스트 green(기존 87개 + 이 plan 17개)

## Task Commits

Each task was committed atomically:

1. **Task 1: registry.test.ts — 자가진단 5개 시나리오 실패 테스트 작성 (RED)** - `b4be4ac` (test)
2. **Task 2: registry.ts 구현 — 레지스트리 배열 + selfHeal + 포그라운드 오케스트레이터 (GREEN)** - `c935f61` (feat)

_REFACTOR 단계는 불필요 — GREEN 구현이 바로 깨끗한 상태로 완료되어 별도 정리 커밋 없음._

## Files Created/Modified

- `src/notifications/registry.ts` - 자가진단 레지스트리 배열(`buildNotificationRegistry`) +
  판정 함수(`selfHeal`) + 포그라운드 오케스트레이터(`runForegroundNotificationCheck`)
- `src/notifications/registry.test.ts` - 17개 시나리오(registry/selfHeal/disabledSkip/
  partialFailure/orphanCleanup/foreground) 회귀 테스트

## Decisions Made

- Test 16(재생성 로그에 id 포함)을 통과시키기 위해 `console.log`의 두 번째 인자를
  객체 리터럴 대신 `JSON.stringify`로 직렬화한 템플릿 문자열로 작성 — GREEN 검증
  1차 시도에서 `mock.calls.flat().join(' ')`이 객체를 `[object Object]`로 뭉개는 것을
  발견하고 로그 포맷만 수정(호출 지점 수·의미는 변경 없음)
- Task 1 RED 단계에서 Test 1의 인용부호를 큰따옴표로 썼다가 `grep -c "it('Test "` 리터럴
  패턴과 불일치함을 발견 — Plan 01/03/04에서 이미 나온 동일 이슈라 즉시 작은따옴표로
  통일해 해결

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 16 로그 인자 단언이 객체 직렬화 방식과 불일치**
- **Found during:** Task 2 GREEN 1차 구현 검증 (`npm test -- registry.test.ts`가 Test 16만
  실패)
- **Issue:** `console.log('[notifications] self-heal:', { recreated, cancelled })`로
  구현했으나, 테스트가 `logSpy.mock.calls.flat().join(' ')`으로 로그 인자를 문자열화해
  id 포함 여부를 검증 — 객체 인자가 `'[object Object]'`로 뭉개져 `CHECKIN_HOURLY_ID`
  문자열을 찾지 못함
- **Fix:** 로그 포맷을 `console.log(\`[notifications] self-heal: recreated=${JSON.stringify(...)} cancelled=${JSON.stringify(...)}\`)` 템플릿 문자열 단일 인자로 변경 — 콘솔 호출
  지점은 여전히 1곳(acceptance criteria `console.log` 개수 계약 유지), 로그에 담기는
  정보(재생성/취소된 identifier)는 동일
- **Files modified:** src/notifications/registry.ts
- **Verification:** 17개 테스트 전부 green, `grep -v '^ *//' registry.ts | grep -c "console.log"` == 1
- **Committed in:** c935f61 (Task 2 GREEN 커밋에 포함 — 커밋 전에 발견해 수정)

**2. [Rule 1 - Bug] `it('Test 1: ...')` 리터럴 grep 패턴과 큰따옴표 문자열 불일치**
- **Found during:** Task 1 acceptance criteria 검증 (`grep -c "it('Test " registry.test.ts` == 16, 기준 17)
- **Issue:** Test 1 설명문을 큰따옴표(`it("Test 1: ...")`)로 작성해 acceptance criteria가
  요구하는 `it('Test ` 리터럴 패턴과 불일치 — 02-01/02-03/02-04 Plan에서도 동일 이슈가
  선례로 발견된 반복 패턴
- **Fix:** Test 1을 작은따옴표 문자열로 변경
- **Files modified:** src/notifications/registry.test.ts
- **Verification:** `grep -c "it('Test " registry.test.ts` == 17
- **Committed in:** b4be4ac (Task 1 RED 커밋에 포함 — 커밋 전에 발견해 수정)

---

**Total deviations:** 2 auto-fixed (Rule 1 — 테스트 검증 과정에서 발견된 로그 직렬화/grep
패턴 이슈, 둘 다 커밋 전에 발견해 수정)
**Impact on plan:** 전부 구현 세부사항 조정으로, 계획의 의도(관리 대상 트리거 전부를
항목화한 레지스트리, 누락분만 재생성, 꺼진 항목 스킵, 집합 단위 부분 실패 감지, 고아
정리, 권한 게이트, 콘솔 전용 관찰)는 변경 없음. 스코프 크리프 없음.

## TDD Gate Compliance

- RED 게이트: `test(02-05): registry 자가진단 17개 시나리오 실패 테스트 작성 (RED)` — `b4be4ac`
- GREEN 게이트: `feat(02-05): registry.ts 구현 - 레지스트리 배열 + selfHeal + 포그라운드 오케스트레이터 (GREEN)` — `c935f61`
- REFACTOR 게이트: 해당 없음 — GREEN 구현이 정리 없이 바로 green

## Issues Encountered

None — 위 Deviations 항목 외 추가 문제 없음. `npm test` 전체 실행 시 `expo-notifications`가
`registry.ts` → `permissions.ts`/`deps.ts` 경로로 전이 로드되며 Expo Go push usage 경고
콘솔 출력이 있으나, 이는 `deps.ts`가 이미 소유한 기존 런타임 import 경로의 부작용이고
(permissions.test.ts에서도 이미 발생) 테스트 결과에는 영향 없음(104개 전부 green).

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- Plan 07(실기기 배선)이 `runForegroundNotificationCheck`를 `src/app/_layout.tsx`의 단일
  `AppState` 리스너에서 호출하기만 하면 됨 — `<interfaces>` 블록에 명시된 3개 export
  (`buildNotificationRegistry`/`selfHeal`/`runForegroundNotificationCheck`)만으로 코드베이스
  추가 탐색 없이 소비 가능
- 전체 스위트 104개 테스트 green(기존 87개 + 이 plan 17개), `tsc --noEmit` exit 0
- 블로커 없음

---

*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/notifications/registry.ts
- FOUND: src/notifications/registry.test.ts
- FOUND: .planning/phases/02-notification-infrastructure/02-05-SUMMARY.md
- FOUND: b4be4ac, c935f61 (git log --oneline --all 확인)
