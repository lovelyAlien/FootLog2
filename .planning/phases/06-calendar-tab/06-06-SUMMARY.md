---
phase: 06-calendar-tab
plan: 06
subsystem: ui
tags: [expo-router, react-native, settings, notifications, sqlite]

# Dependency graph
requires:
  - phase: 06-calendar-tab (plan 04)
    provides: SettingsScreen 본체(src/settings/SettingsScreen.tsx) + SETTINGS_COPY(src/settings/content.ts)
  - phase: 06-calendar-tab (plan 01)
    provides: settingsRepo.ts(getSettingsRow/resolveNotificationSettings/upsertSettings)
provides:
  - Today 뷰 상단 햄버거(≡) 진입점 → /settings push, 탭바 유지
  - src/app/(tabs)/index/settings.tsx 라우트(SettingsScreen 얇은 래퍼)
  - 포그라운드 자가진단이 영속 설정을 읽는 NotificationSelfHealGate 배선
  - settings-wiring.test.ts/tabs-wiring.test.ts 회귀 가드 확장(Test 20~25, Test 14 반전)
affects: [07-day-end-reflection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "라우트 파일은 db 배선 + 화면 렌더만 한다([id].tsx/settings.tsx 공유 계약)"
    - "SQLiteProvider 바깥 RootLayout 본문에서 useSQLiteContext가 필요한 로직은 Provider 자식의 UI-less 내부 컴포넌트(NotificationSelfHealGate)로 분리한다"

key-files:
  created:
    - src/app/(tabs)/index/settings.tsx
  modified:
    - src/app/(tabs)/index/_layout.tsx
    - src/app/(tabs)/index/index.tsx
    - src/app/_layout.tsx
    - src/app/__tests__/settings-wiring.test.ts
    - src/app/__tests__/tabs-wiring.test.ts
    - src/app/__tests__/checkin-wiring.test.ts

key-decisions:
  - "포그라운드 자가진단의 db 접근을 위해 RootLayout에 NotificationSelfHealGate 내부 컴포넌트를 신설 — useSQLiteContext는 SQLiteProvider 자식에서만 쓸 수 있어 기존 useEffect를 그대로 옮길 수 없었음"
  - "설정 읽기 실패 시 자가진단을 건너뛰지 않고 Phase 2 기본값(resolveNotificationSettings(null))으로 계속 진행(T-06-11)"

patterns-established:
  - "Pattern: db-dependent root-level effect는 SQLiteProvider 자식의 UI-less 컴포넌트로 분리"

requirements-completed: [REQ-settings-screen]

# Metrics
duration: 5min
completed: 2026-09-02
---

# Phase 6 Plan 06: 설정 화면 배선 Summary

**Today 뷰 햄버거(line.3.horizontal SF Symbol) → /settings push 배선 + 포그라운드 알림 자가진단이 무인자 기본값 대신 SQLite에 저장된 실제 설정을 읽도록 수정(06-RESEARCH.md Pitfall 5 회귀 차단)**

## Performance

- **Duration:** 약 5분(Task 1~3 커밋 간격 기준, 코드 읽기/설계 시간 제외)
- **Started:** 2026-09-02T11:24:05+09:00 (Task 1 커밋)
- **Completed:** 2026-09-02T11:28:41+09:00 (Task 3 커밋)
- **Tasks:** 3/3 완료
- **Files modified:** 6 (1 신규 + 5 수정)

## Accomplishments
- Today 뷰 상단 배너 위에 햄버거 진입점 추가 — 탭 시 탭바를 유지한 채 설정 화면으로 push(D-01/D-03)
- `src/app/(tabs)/index/settings.tsx` 신설 — `[id].tsx`와 동일한 "얇은 래퍼" 계약(useSQLiteContext + 화면 위임만)
- 루트 레이아웃의 포그라운드 자가진단이 하드코딩 기본값 대신 `getSettingsRow`/`resolveNotificationSettings`로 실제 저장된 알림 설정을 읽도록 배선 — 사용자가 알림을 "끔"으로 바꾼 뒤 백그라운드→포그라운드 전환해도 매시간 트리거가 되살아나지 않음
- Phase 4 fence 테스트(tabs-wiring Test 14)를 부재 단언 → 존재 단언으로 갱신, settings-wiring.test.ts에 라우트/자가진단 배선 회귀 가드 6개 추가

## Task Commits

Each task was committed atomically:

1. **Task 1: 설정 라우트 등록 + Today 뷰 햄버거 진입점** - `2ed3d17` (feat)
2. **Task 2: 포그라운드 자가진단이 영속 설정을 읽도록 배선(Pitfall 5)** - `2aa61c1` (fix)
3. **Task 3: 회귀 가드 — settings-wiring 확장 + tabs-wiring Test 14 갱신** - `a96dd33` (test)

_이 커밋들은 Task 3 커밋 안에 Rule 1 자동수정(checkin-wiring.test.ts Test 37)이 포함돼 있다 — 아래 Deviations 참고._

## Files Created/Modified
- `src/app/(tabs)/index/settings.tsx` - 설정 라우트 얇은 래퍼(신설)
- `src/app/(tabs)/index/_layout.tsx` - Today nested Stack에 `settings` 스크린 등록(headerShown: true, title)
- `src/app/(tabs)/index/index.tsx` - 배너 위 햄버거(`line.3.horizontal`) Pressable 추가, `handleSettingsPress` → `router.push('/settings')`
- `src/app/_layout.tsx` - `NotificationSelfHealGate` 내부 컴포넌트 신설, 자가진단이 영속 설정을 읽도록 배선
- `src/app/__tests__/settings-wiring.test.ts` - Test 20~25 append(라우트 얇은 래퍼/스크린 등록/자가진단 배선/캘린더 햄버거 부재)
- `src/app/__tests__/tabs-wiring.test.ts` - Test 14를 D-01/D-03 존재 단언으로 갱신(탭 3승격 부재는 유지)
- `src/app/__tests__/checkin-wiring.test.ts` - Test 37 정규식을 `orientationMode` 앵커로 수정(Rule 1 자동수정)

## Decisions Made
- `useSQLiteContext()`가 `SQLiteProvider` 자식 트리에서만 동작하는 제약 때문에, db 접근이 필요해진 자가진단 오케스트레이션 전체를 `RootLayout` 본문에서 `<SQLiteProvider>` 자식의 `NotificationSelfHealGate`(UI 없음, `null` 반환)로 옮김. 기존 "자가진단 호출 지점은 파일 전체에서 하나"라는 배선 규칙은 그대로 유지(호출부만 이동).
- 설정 읽기(`getSettingsRow`) 실패 시 자가진단을 건너뛰지 않고 `console.error` 후 `resolveNotificationSettings(null)`(Phase 2 기본값)로 계속 진행 — 읽기 실패가 자가진단 자체를 무력화하지 않도록(T-06-11).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] checkin-wiring.test.ts Test 37 회귀 — "첫 SymbolView" 매칭이 재센터 버튼을 더 이상 가리키지 않음**
- **Found during:** Task 3 (전체 테스트 스위트 재실행 중 발견)
- **Issue:** Task 1이 배너 위에 햄버거용 `<SymbolView name="line.3.horizontal" ... />`를 재센터 버튼보다 먼저 추가하면서, 기존 `checkin-wiring.test.ts` Test 37의 `codeOnly.match(/<SymbolView[\s\S]*?\/>/)`(파일 내 첫 SymbolView를 재센터 버튼으로 가정한 정규식)가 햄버거 SymbolView를 대신 매칭 → `colors.pin` 단언이 실패.
- **Fix:** 정규식을 `orientationMode`를 포함하는 SymbolView만 특정하도록 좁힘(`/<SymbolView[\s\S]*?orientationMode[\s\S]*?\/>/`) — 파일 내 등장 순서에 의존하지 않게 함.
- **Files modified:** `src/app/__tests__/checkin-wiring.test.ts`
- **Verification:** `npm test -- src/app/__tests__/checkin-wiring.test.ts` 77/77 통과, 전체 스위트 598/598 통과.
- **Committed in:** `a96dd33` (Task 3 커밋에 포함)

---

**Total deviations:** 1 auto-fixed (Rule 1 - 버그)
**Impact on plan:** 이 플랜의 파일 변경이 직접 유발한 인접 파일(다른 phase 소유) 테스트 회귀를 정규식 앵커링으로 해결 — 재센터 버튼 자체 동작/스타일은 전혀 바뀌지 않았고, 어떤 SymbolView를 검사 대상으로 특정할지만 수정. 스코프 확장 없음.

## Issues Encountered

- 계획의 Task 2 acceptance_criteria 중 `grep -c "subscribeToForegroundActive" src/app/_layout.tsx`가 1이어야 한다는 항목은 문자 그대로 만족 불가능함을 확인 — `subscribeToForegroundActive`를 실제로 호출하려면 최소 import 1줄 + 호출부 1줄, 총 2줄이 매칭된다(사전 존재하던 코드에서도 이미 2였음, 이 플랜이 새로 만든 문제 아님). 같은 계획의 인접 기준(`runForegroundNotificationCheck` Test 2)은 명시적으로 import 줄을 제외하고 세는데 이 기준만 그 처리가 없어 생긴 계획 작성상의 부정합으로 판단. 실질적 게이트인 자동화 테스트(`notification-wiring.test.ts` 10/10)와 `npx tsc --noEmit`은 모두 통과 확인 완료 — 차단 이슈 아님, 참고용 기록.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- Phase 7(day-end-reflection)의 "설정에서 끌 수 있는 토글" 요구사항(REQ-reflection-notification)이 의존하는 설정 화면 진입 경로가 이제 실제로 배선됨 — Phase 7 착수 전 선행 조건 충족.
- 검증: `npm test` 전체 598/598 green, `npx tsc --noEmit` 에러 없음. 이 플랜은 checkpoint 태스크가 없어(전부 `type="auto"`) 시뮬레이터 수동 검증 게이트가 발생하지 않았음 — 자동화 테스트(정적 소스 분석 기반 배선 계약)로 아이콘 렌더링/라우팅/탭바 유지/자가진단 배선 전부를 커버.
- 실기기/시뮬레이터에서 실제 탭 제스처로 최종 확인하는 것은 여전히 유효한 QA 단계이나, 이 플랜의 acceptance_criteria/verification에는 명시되지 않아 이번 실행 범위에 포함하지 않음.

---
*Phase: 06-calendar-tab*
*Completed: 2026-09-02*
