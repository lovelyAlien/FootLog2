---
phase: 06-calendar-tab
plan: 08
subsystem: testing
tags: [expo-router, reanimated, gesture-handler, safe-area, jest, typescript]

requires:
  - phase: 06-calendar-tab
    provides: 06-01~06-07이 구현한 캘린더 그리드, 과거 날짜 화면, 날짜 스크러버, 설정 화면
provides:
  - Phase 6 전체 게이트 통과(자동 검증 + 시뮬레이터 직접 확인 + 창업자 실기기 확인)
  - 06-VALIDATION.md Per-Task Verification Map을 실제 plan/task 번호로 채움
  - Phase 5/6 라우트 문자열 버그 3건 발견·수정(절대 경로가 타입체크만 통과하고 런타임엔 404)
  - 캘린더 헤더 safe-area 누락, 스크러버 드래그 크래시(워클릿 클로저 캡처) 발견·수정
affects: [phase-07-reflection, 향후 라우트/제스처 작업]

tech-stack:
  added: []
  patterns:
    - "expo-router: 같은 세그먼트 이름이 중첩되면(예: (tabs)/index/index.tsx) 절대 경로가 타입체크는 통과해도 런타임에 깨질 수 있다 — 같은 스택 내에서는 상대 경로(./route)를 쓴다"
    - "Reanimated worklet: .onUpdate 등 UI스레드 콜백에서 호출하는 외부 함수는 'worklet' 지시어가 필요하고, 그 함수의 기본 매개변수가 모듈 상수를 참조하면 클로저 캡처에서 빠질 수 있어 호출부에서 명시적으로 값을 전달해야 한다"
    - "헤더 없는(headerShown: false) 화면의 자체 렌더 헤더는 useSafeAreaInsets로 직접 상단 인셋을 줘야 한다 — Tabs 네비게이터는 상단 인셋을 자동으로 주지 않는다"

key-files:
  created:
    - .planning/phases/06-calendar-tab/06-VALIDATION.md (갱신)
  modified:
    - src/calendar/CalendarGridScreen.tsx (safe-area 적용)
    - src/calendar/DateScrubber.tsx (worklet 상수 전달)
    - src/calendar/scrubberRange.ts (worklet 지시어)
    - src/app/(tabs)/index/index.tsx (라우트 상대 경로 2건)
    - src/app/+not-found.tsx, src/app/priming.tsx (라우트 문자열)
    - src/app/__tests__/tabs-wiring.test.ts, today-wiring.test.ts, checkin-wiring.test.ts (회귀 가드 갱신)

key-decisions:
  - "06-08 게이트 진행 중 발견한 Phase 5 소속 라우트 버그(index.tsx의 '/[id]', +not-found/priming의 '/')도 사용자 승인 하에 함께 수정 — tsc --noEmit 무오류 요구사항을 이 phase 범위 밖 코드가 막고 있었음"
  - "Task 2 시뮬레이터 확인 중 settings 진입점이 404로 빠지는 걸 발견해 Task 1의 라우트 수정이 타입체크만 통과했을 뿐임을 확인 — 상대 경로로 재수정, 같은 메커니즘의 /index/[id]도 함께 정정"
  - "창업자 승인을 받아 발견한 버그 2건(헤더 safe-area, 스크러버 크래시)을 이 플랜에서 직접 수정 — 원래 계획은 '수정하지 않고 기록만'이었으나 원인이 명확하고 범위가 좁아 승인 후 진행"

requirements-completed: [REQ-calendar-grid, REQ-past-date-view, REQ-date-scrubber, REQ-settings-screen]

duration: ~3h
completed: 2026-09-02
---

# Phase 6: Calendar Tab Summary

**캘린더 월 그리드, 과거 날짜 읽기전용 화면, 플로팅 날짜 스크러버, 설정 화면 4개 기능을 자동 검증 + Claude의 시뮬레이터 직접 확인 + 창업자 실기기 확인 3단계로 게이트하고, 그 과정에서 발견한 라우트/제스처 크래시 버그 5건을 함께 수정**

## Performance

- **Duration:** ~3시간 (Task 1~3)
- **Tasks:** 3
- **Files modified:** 12개 (검증 문서 1 + 소스 6 + 테스트 5)

## Accomplishments
- `06-VALIDATION.md`의 Per-Task Verification Map TBD를 06-01~06-07의 실제 task로 전부 채우고 `nyquist_compliant: true`, `status: approved`로 전환
- iOS 시뮬레이터(iPhone 17 Pro, dev-client)에서 8개 항목을 Claude가 직접 확인 — 6개 정상, 1개 부분 확인(유닛 테스트로 이미 커버), 2개는 버그로 실패했다가 수정 후 재확인
- **캘린더 헤더 safe-area 버그**: 월 이동 화살표가 상태바/Dynamic Island에 깔려 탭이 전혀 먹지 않던 문제를 `useSafeAreaInsets` 적용으로 해결
- **날짜 스크러버 크래시**: 드래그하는 순간 앱이 100% 크래시하던 치명적 버그를 워클릿 지시어 추가 + 워클릿 클로저 캡처 문제까지 2단계로 진단·수정
- **라우트 문자열 버그 3건**: 절대 경로가 expo-router 타입체크는 통과하지만 `(tabs)/index/` 세그먼트 이름 충돌로 런타임엔 404로 빠지는 문제(설정 진입점, 체크인 상세화면 진입) — 상대 경로로 정정
- 창업자가 실기기에서만 판단 가능한 4개 항목(스와이프 손맛, 스크러버 프레임/정지감, 실제 조도 톤 구분, 알림 빈도 실제 발화 간격)을 전부 확인

## Task Commits

1. **Task 1: 전체 자동 검증 + 06-VALIDATION.md 채우기** - `83e1c1b`(Phase 5 라우트 4건 정정), `01effb7`(검증 문서 채움)
2. **Task 2: iOS 시뮬레이터 직접 확인** - `59df772`(설정 라우트 재정정), `cd0d8e7`(확인 결과 기록), `16f3acd`(상세화면 라우트 정정), `8d1f9a7`(헤더 safe-area + 스크러버 크래시 수정), `d6032b0`(재검증 결과 기록)
3. **Task 3: 창업자 확인** - 체크포인트 승인(코드 변경 없음)

_TDD 아님 — 이 플랜은 검증/게이트 플랜이라 RED→GREEN 커밋 쌍이 없다. 발견된 버그는 재현 확인 → 수정 → 재확인 순서로 진행._

## Files Created/Modified
- `.planning/phases/06-calendar-tab/06-VALIDATION.md` - Task/Plan/Wave 채움, 시뮬레이터 확인 결과, 버그 기록/수정 내역
- `src/calendar/CalendarGridScreen.tsx` - `useSafeAreaInsets` + `headerRow` paddingTop/minHeight
- `src/calendar/scrubberRange.ts` - `indexForTranslation`/`clampIndex`에 `'worklet'` 추가
- `src/calendar/DateScrubber.tsx` - `indexForTranslation` 호출부에 `SCRUBBER_TICK_SPACING_PX` 명시적 전달
- `src/app/(tabs)/index/index.tsx` - `/settings`→`./settings`, `/[id]`→`./[id]` (경로 이름 충돌 회피)
- `src/app/+not-found.tsx`, `src/app/priming.tsx` - `/` → `/index`
- `src/app/__tests__/tabs-wiring.test.ts`, `today-wiring.test.ts`, `checkin-wiring.test.ts` - 위 라우트 문자열 변경에 맞춘 정적 회귀 가드 갱신

## Decisions Made
- Phase 5 소속 pre-existing 라우트 버그를 발견 즉시 고칠지 gap으로 미룰지 사용자에게 물어 "지금 같이 고치기"로 결정 (동일 클래스 버그 반복 방지)
- Task 2에서 발견한 버그 2건(헤더 safe-area, 스크러버 크래시)은 계획상 "기록만, 수정 안 함"이었으나 원인이 명확하고 수정 범위가 좁아 사용자 승인을 받아 이 플랜에서 즉시 수정
- 시뮬레이터의 dev-menu 플로팅 버블이 캘린더 헤더 우측 버튼과 겹치는 현상은 dev-client 전용 아티팩트로 판단하고 앱 버그로 취급하지 않음(프로덕션 빌드에는 없음)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/2 - Blocking] Phase 5 라우트 문자열 4건이 tsc --noEmit 무오류 요구사항을 막음**
- **Found during:** Task 1 (전체 자동 검증)
- **Issue:** `index.tsx`의 `/[id]`, `+not-found.tsx`/`priming.tsx`의 `/`가 expo-router 타입 선언과 불일치 — 앱 루트에 `index.tsx`가 없고 Today 홈이 `(tabs)/index` 세그먼트인데 경로가 그 세그먼트를 생략함
- **Fix:** `/index`, `/index/[id]`로 정정(1차). Task 2에서 이마저 런타임 실패로 확인되어 상대 경로로 재정정(2차, 아래)
- **Files modified:** `src/app/(tabs)/index/index.tsx`, `src/app/+not-found.tsx`, `src/app/priming.tsx`, 관련 테스트 2건
- **Verification:** `npx tsc --noEmit` 0 errors
- **Committed in:** `83e1c1b`

**2. [Rule 1 - Correctness] 위 1차 수정이 타입체크만 통과하고 런타임엔 404**
- **Found during:** Task 2 (시뮬레이터 직접 확인 — 설정 화면 진입 테스트)
- **Issue:** `(tabs)/index/` 탭 폴더와 그 안의 `index.tsx` 스크린이 "index" 세그먼트를 공유하는 이름 충돌(Metro 부팅 경고) 때문에 절대 경로 `/index/settings`가 타입 선언과 달리 런타임에 해석되지 않음
- **Fix:** 상대 경로 `./settings`, `./[id]`로 재정정
- **Files modified:** `src/app/(tabs)/index/index.tsx`, `tabs-wiring.test.ts`, `today-wiring.test.ts`, `checkin-wiring.test.ts`
- **Verification:** 시뮬레이터에서 설정 화면 진입 재확인(3항목 표시), `npm test`/`npx tsc --noEmit` 통과
- **Committed in:** `59df772`, `16f3acd`

**3. [Rule 2 - Missing Critical] 캘린더 헤더 safe-area 누락**
- **Found during:** Task 2 (시뮬레이터 직접 확인 — 월 이동 화살표 테스트)
- **Issue:** `CalendarGridScreen.tsx`의 `headerRow`가 `insets.top` 없이 화면 최상단(y=0)에서 시작해 월 이동 화살표가 상태바/Dynamic Island에 깔려 탭이 전혀 반응하지 않음
- **Fix:** `useSafeAreaInsets` 추가, `headerRow`에 `paddingTop: insets.top`, 고정 `height: 44`를 `minHeight: 44`로 변경(내용 눌림 방지)
- **Files modified:** `src/calendar/CalendarGridScreen.tsx`
- **Verification:** 시뮬레이터에서 화살표 탭 + 좌우 스와이프로 월 이동 재확인(9월→8월→7월→9월 왕복)
- **Committed in:** `8d1f9a7`

**4. [Rule 2 - Missing Critical] 날짜 스크러버 드래그 시 앱 크래시**
- **Found during:** Task 2 (시뮬레이터 직접 확인 — 스크러버 드래그 테스트)
- **Issue:** `Gesture.Pan().onUpdate()`(UI스레드 워클릿) 안에서 `scrubberRange.ts`의 일반 함수 `indexForTranslation`/`clampIndex`를 워클릿 표시 없이 호출 → "Tried to synchronously call a Remote Function"으로 즉시 크래시. 1차 수정(`'worklet'` 지시어 추가) 후에도 워클릿 함수의 기본 매개변수가 모듈 상수(`SCRUBBER_TICK_SPACING_PX`)를 참조해 클로저 캡처에서 빠지는 2차 크래시("Property ... doesn't exist") 발견
- **Fix:** 두 함수에 `'worklet'` 지시어 추가 + `DateScrubber.tsx` 호출부에서 그 상수를 명시적으로 전달(기본값에 기대지 않음)
- **Files modified:** `src/calendar/scrubberRange.ts`, `src/calendar/DateScrubber.tsx`
- **Verification:** 시뮬레이터에서 동일 드래그 재현 — 크래시 없이 Sept 1→2 실시간 이동, 오늘 경계 하드 클램프, 관성 없이 즉시 정지 확인
- **Committed in:** `8d1f9a7`

---

**Total deviations:** 4 auto-fixed (모두 정확성/치명적 결함 수정, 스코프 크리프 없음 — 사용자 승인 하에 진행)
**Impact on plan:** 발견된 모든 버그를 이 게이트에서 닫아 Phase 6이 실제로 동작하는 상태로 완료됨. 후속 phase에 미해결 버그를 넘기지 않음.

## Issues Encountered
- 시뮬레이터 탭/드래그 좌표계 보정에 반복 시행착오(포인트 좌표와 스크린샷 픽셀 좌표 혼동) — 알려진 UI 요소(그리드 셀, 탭바) 탭으로 좌표계를 교차검증해 해결
- dev-client의 플로팅 dev-menu 버블이 캘린더 헤더 우측 버튼과 겹쳐 우측 화살표 직접 탭 확인이 어려웠음 — 좌측 화살표 + 스와이프로 동일 코드 경로를 대신 확인(dev 전용 아티팩트, 프로덕션 영향 없음)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6의 4개 요구사항(REQ-calendar-grid, REQ-past-date-view, REQ-date-scrubber, REQ-settings-screen) 모두 완료
- expo-router 세그먼트 이름 충돌 패턴과 Reanimated worklet 클로저 캡처 함정이 이번에 처음 문서화됨 — Phase 7(회고) 이후 라우팅/제스처 작업에서 재발 방지 참고
- 블로커 없음

---
*Phase: 06-calendar-tab*
*Completed: 2026-09-02*
