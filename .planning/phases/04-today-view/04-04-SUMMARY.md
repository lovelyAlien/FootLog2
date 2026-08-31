---
phase: 04-today-view
plan: 04
subsystem: ui
tags: [react-native, bottom-sheet, gorhom, reanimated, intl, typography, today-view]

# Dependency graph
requires:
  - phase: 04-today-view (04-01/04-02/04-03)
    provides: getTodayCheckins 공유 쿼리(checkinRepo.ts), CheckinRow 타입, TODAY_COPY 시작 키, (tabs) 라우트 셸
provides:
  - "@gorhom/bottom-sheet@5.2.14 도입(사람 승인 완료, npm 정당성 재확인)"
  - "formatLocalTime(HH:mm, Intl 기반, hourCycle h23) — src/checkin/localDate.ts"
  - "CheckinListRow — 시간+메모 미리보기 비인터랙티브 리스트 행(D-01/D-02/D-03)"
  - "TodayBottomSheet — CLOSED/OPEN 2-snapPoint 시트, animatedPosition 부모 노출(D-05 준비)"
affects: [04-05, 04-06, 04-07]

# Tech tracking
tech-stack:
  added: ["@gorhom/bottom-sheet@5.2.14"]
  patterns:
    - "readonly 튜플(typography.timestamp.fontVariant) 소비 측 얕은 복사 브리징 — as 캐스트 금지"
    - "useBottomSheetTimingConfigs로 motion.bottomSheetSnapMs를 WithTimingConfig로 변환"
    - "CLOSED 피크 높이를 LIST_ROW_MIN_HEIGHT + 핸들 상수에서 파생(리터럴 하드코딩 금지)"

key-files:
  created:
    - src/today/CheckinListRow.tsx
    - src/today/TodayBottomSheet.tsx
    - src/today/__tests__/todayUi.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/checkin/localDate.ts
    - src/checkin/localDate.test.ts
    - src/today/content.ts

key-decisions:
  - "@gorhom/bottom-sheet 설치를 사람이 명시적으로 승인함(아래 Task 1 기록 참고)"
  - "TodayBottomSheet의 snapPoints는 [CLOSED, OPEN] 2개만 사용 — DRAGGING은 별도 스냅이 아니라 animatedPosition으로 노출되는 연속 구간"
  - "enableDynamicSizing={false}로 명시 — 라이브러리가 콘텐츠를 자동 측정해 명시적 snapPoints와 충돌하지 않게 함"

patterns-established:
  - "재사용 가능한 표현 컴포넌트는 화면별 로직/absolute positioning을 갖지 않는다(NotificationDeniedBanner 계약을 TodayBottomSheet/CheckinListRow까지 확장)"

requirements-completed: [REQ-today-view]

# Metrics
duration: ~15min
completed: 2026-08-31
---

# Phase 4 Plan 04: 바텀시트 표현 계층(CheckinListRow + TodayBottomSheet) Summary

**@gorhom/bottom-sheet 기반 CLOSED/OPEN 2-snapPoint 시트 + 시간·메모 전용 비인터랙티브 리스트 행, formatLocalTime Intl 헬퍼 포함**

## Performance

- **Duration:** ~15분
- **Started:** 2026-08-31 (KST 오후)
- **Completed:** 2026-08-31T05:18:51Z
- **Tasks:** 3 (Task 1 사람 승인 게이트 + Task 2/3 자동 실행)
- **Files modified:** 7 (신규 3 + 수정 4, package-lock.json 포함)

## Accomplishments
- `@gorhom/bottom-sheet@5.2.14`를 사람의 명시적 승인 이후 설치(Task 1 게이트 통과)
- `formatLocalTime` — `Intl.DateTimeFormat` 기반 `HH:mm` 포맷, `hourCycle: 'h23'`로 자정을 `00:00`으로 고정(단위 테스트 4종)
- `CheckinListRow` — 시간(모노스페이스) + 메모 미리보기(세리프 이탤릭, 있을 때만 1줄)만으로 구성, 장소명/사진 아이콘/탭 어포던스 없음(D-01/D-02/D-03)
- `TodayBottomSheet` — `BottomSheetFlatList` 기반 CLOSED/OPEN 2-snapPoint 시트, `animatedPosition`을 부모 소유 SharedValue로 그대로 노출(D-05 준비), 체크인 0건 시 `TODAY_COPY.emptyState` 렌더
- 정적 분석 회귀 가드(`todayUi.test.ts`) 20개 테스트로 D-01/D-02/D-03, 토큰 규율(hex 금지, accent 미사용), Anti-Pattern(플레인 FlatList/중첩 GestureHandlerRootView 금지) 전부 커버

## Task Commits

Each task was committed atomically:

1. **Task 1: `@gorhom/bottom-sheet` 패키지 정당성 확인 게이트** — 코드 변경 없음, 승인 기록만(아래 "Task 1 — 사람 승인 기록" 참고)
2. **Task 2: `@gorhom/bottom-sheet` 설치 + `formatLocalTime` + `CheckinListRow`** — `2ef5b30` (feat)
3. **Task 3: `TodayBottomSheet` — 3단 스냅 시트 + 리스트/빈 상태** — `b08879a` (feat)

**Plan metadata:** (이 커밋, docs: complete plan)

## Task 1 — 사람 승인 기록 (checkpoint:human-verify, gate="blocking-human")

이 게이트는 실행 시작 전 상위 오케스트레이터 대화에서 이미 사용자에게 제시되어 해결되었다 (본 실행 에이전트 스폰 이전).

- **사용자 응답:** "설치 진행 (권장)" — 명시적 설치 승인.
- **확인된 저장소 URL:** `git+https://github.com/gorhom/react-native-bottom-sheet.git` (`https://www.npmjs.com/package/@gorhom/bottom-sheet` 페이지와 일치, 오탈자 변종 아님).
- **승인 시점 npm 레지스트리 라이브 검증 수치**(승인 근거로 사용자에게 제시된 값):
  - 최신 버전: `5.2.14`, 배포일 `2026-05-09T18:28:46.604Z`(1년 이내)
  - 주간 다운로드: `3,313,861`
- **acceptance_criteria 충족 여부:**
  - [x] 사용자가 "설치 진행"으로 명시적으로 응답했다
  - [x] 응답 내용과 확인된 저장소 URL이 이 SUMMARY에 기록됨
  - [x] 사용자 응답 없이 Task 2의 `npm install`이 실행되지 않았다 (Task 1 승인 확인 후 Task 2에서 설치 진행)

설치 후 실제 확인:
```
$ npm ls @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated
+-- @gorhom/bottom-sheet@5.2.14
| +-- react-native-gesture-handler@2.32.0 deduped
| `-- react-native-reanimated@4.5.1 deduped
+-- react-native-gesture-handler@2.32.0
`-- react-native-reanimated@4.5.1
```
peer dependency 경고 없이 정상 종료.

## Files Created/Modified
- `src/today/CheckinListRow.tsx` - 시간+메모 미리보기 비인터랙티브 리스트 행, `LIST_ROW_MIN_HEIGHT` export
- `src/today/TodayBottomSheet.tsx` - CLOSED/OPEN 2-snapPoint 바텀시트, `animatedPosition`/`containerHeight`/`checkins` prop 계약
- `src/today/__tests__/todayUi.test.ts` - 정적 분석 회귀 가드 20종(CheckinListRow 8 + TodayBottomSheet 12)
- `src/checkin/localDate.ts` - `formatLocalTime(isoTimestamp, timeZone?)` 추가
- `src/checkin/localDate.test.ts` - `formatLocalTime` 단위 테스트 4종 추가
- `src/today/content.ts` - `TODAY_COPY.emptyState` 키 추가
- `package.json`/`package-lock.json` - `@gorhom/bottom-sheet@^5.2.14` 의존성 추가

## Decisions Made
- `@gorhom/bottom-sheet` 도입 — 사람 승인 완료(Task 1 기록 참고), peer dependency(`react-native-gesture-handler@2.32.0`, `react-native-reanimated@4.5.1`) 충돌 없음 확인.
- `snapPoints` 배열은 `[CLOSED, OPEN]` 2개만 사용 — DRAGGING은 별도 스냅 지점이 아니라 `animatedPosition`(부모 소유 SharedValue)으로 노출되는 연속 구간이며, `onChange(index)` 콜백에만 의존하지 않음(스냅 도달 시점에만 발화해 D-05가 요구하는 실시간 추적과 배치되기 때문).
- `useBottomSheetTimingConfigs({ duration: motion.bottomSheetSnapMs })`로 220ms 애니메이션을 라이브러리의 `WithTimingConfig` 형태로 변환 — 새 모션 토큰을 발명하지 않음.
- `enableDynamicSizing={false}`를 명시 — 라이브러리 기본값(`true`)이 콘텐츠를 자동 측정해 우리가 명시한 숫자 `snapPoints`와 충돌할 가능성을 차단.
- `typography.timestamp.fontVariant`가 `tokens.ts`에서 `as const` readonly 튜플로 고정돼 있어 `Text`의 `style` 배열에 그대로 넣으면 TS 컴파일 에러(`readonly ["tabular-nums"]`가 mutable `FontVariant[]`에 미할당) — 소비 측(`CheckinListRow.tsx`)에서만 `fontVariant: [...typography.timestamp.fontVariant]` 얕은 복사로 브리징, `tokens.ts`의 `as const` 계약 자체는 변경하지 않음.

## Deviations from Plan

None - plan을 그대로 실행했다. `04-04-PLAN.md`가 참조한 "`src/app/(tabs)/index.tsx`가 쓰는 얕은 복사 브리징 방식"은 실제로는 아직 그 파일에 존재하지 않았음(grep으로 확인) — 참조가 앞서 나간 계획 문구였을 뿐, `npx tsc --noEmit`으로 문제를 직접 재현한 뒤 동일한 취지(얕은 복사, `as` 캐스트 미사용)의 브리징을 `CheckinListRow.tsx`에 새로 작성했다. 이는 계획이 이미 지시한 해결 방향을 실제 코드로 옮긴 것이라 별도 deviation 규칙 적용 대상은 아니라고 판단.

## Issues Encountered
- 최초 `formatLocalTime` 구현 주석에 acceptance criteria가 grep하는 리터럴 문자열(`hourCycle: 'h23'`, `getHours`)을 코드 설명용으로 그대로 인용해 grep count가 1이 아니라 2로 나옴 — 주석 문구를 리터럴을 우회하는 표현으로 다시 써서 해결(코드 동작 변화 없음).

## User Setup Required

None - 외부 서비스 설정 불필요. `npm install`은 이미 이 실행 중에 완료됨(worktree 로컬 `node_modules`).

## Next Phase Readiness
- `CheckinListRow`/`TodayBottomSheet`는 04-05(화면 배선)가 그대로 import해 `checkins`/`containerHeight`/`animatedPosition` prop만 채우면 된다 — 화면 배선(마운트 시점, `showActionCard` 게이팅, D-05 버튼 오프셋 계산)은 이 plan 범위 밖으로 04-05/04-06이 담당.
- `src/app/(tabs)/index.tsx`는 이 plan에서 전혀 변경되지 않았다(`git diff --name-only` 확인) — verification 요구사항 충족.
- 블로커 없음.

## Self-Check: PASSED

- FOUND: src/today/CheckinListRow.tsx
- FOUND: src/today/TodayBottomSheet.tsx
- FOUND: src/today/__tests__/todayUi.test.ts
- FOUND: src/checkin/localDate.ts
- FOUND: src/today/content.ts
- FOUND commit: 2ef5b30 (Task 2)
- FOUND commit: b08879a (Task 3)

---
*Phase: 04-today-view*
*Completed: 2026-08-31*
