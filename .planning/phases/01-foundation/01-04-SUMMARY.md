---
phase: 01-foundation
plan: 04
subsystem: infra
tags: [expo-router, expo-sqlite, expo-font, expo-splash-screen, react-native, jest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation (01-02)
    provides: "src/theme/tokens.ts (colors/typography/spacing/motion/radius), src/theme/fonts.ts (newsreaderFonts/JOURNAL_FONT_FAMILY)"
  - phase: 01-foundation (01-03)
    provides: "src/db/migrations.ts (migrateDbIfNeeded, DATABASE_NAME, MigratableDb)"
provides:
  - "배선된 src/app/_layout.tsx — useFonts(newsreaderFonts) 스플래시 게이팅 + SQLiteProvider onInit={migrateDbIfNeeded}"
  - "부팅 확인용 src/app/index.tsx — 5개 토큰 스타일 + DB 스키마 버전을 실제로 렌더하는 임시 진단 화면"
  - "src/app/__tests__/foundation-wiring.test.ts — onInit 배선/Pitfall 3 회귀/hex 하드코딩 금지/진행률 수치 금지를 정적 소스 분석으로 고정하는 7개 회귀 테스트"
affects: ["01-05", "Phase 4(REQ-today-view가 index.tsx를 대체)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "migrateDbIfNeeded는 SQLiteProvider의 onInit prop으로만 전달 — 컴포넌트 body/useEffect 직접 호출 금지(Pitfall 3), foundation-wiring.test.ts Test 2가 회귀 고정"
    - "readonly 배열 토큰(typography.timestamp.fontVariant)을 컴포넌트에서 소비할 때는 `as` 캐스트 대신 StyleSheet.create 내부에서 얕은 복사(`[...arr]`)로 mutable 배열을 만들어 tsc strict를 통과"
    - "src/ 전체(테스트 파일과 tokens.ts 제외)에서 hex 컬러 리터럴 0건을 정적 테스트로 강제 — Phase 4~8이 토큰 우회 경로를 원천 차단"

key-files:
  created:
    - src/app/__tests__/foundation-wiring.test.ts
  modified:
    - src/app/_layout.tsx
    - src/app/index.tsx

key-decisions:
  - "typography.timestamp를 index.tsx의 Text style에 직접 배열로 넣지 않고 StyleSheet.create의 timestampText로 감싸 fontVariant만 얕은 복사 — tokens.ts의 `as const` readonly 배열과 RN TextStyle의 mutable FontVariant[] 타입 불일치를 캐스트 없이 해결(01-02가 확정한 tokens.ts 인터페이스는 변경하지 않음)"

requirements-completed: [REQ-design-tokens, REQ-sqlite-migrations]

# Metrics
duration: 6min
completed: 2026-08-26
---

# Phase 1 Plan 4: 루트 레이아웃 배선 + 부팅 확인 화면 Summary

**src/app/_layout.tsx에 Newsreader 폰트 스플래시 게이팅과 SQLiteProvider onInit 마이그레이션을 배선하고, src/app/index.tsx를 SF Pro/ui-monospace/Newsreader 3계층 타이포와 DB 스키마 버전을 실제로 렌더하는 부팅 확인 화면으로 교체, 7개 정적 회귀 테스트로 배선 계약을 고정했다.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-26T18:35:20+09:00 (직전 플랜 완료 커밋 기준)
- **Completed:** 2026-08-26T18:40:49+09:00
- **Tasks:** 2
- **Files modified:** 3 (신규 1개: foundation-wiring.test.ts, 수정 2개: _layout.tsx, index.tsx)

## Accomplishments
- `src/app/_layout.tsx`가 모듈 최상단 `SplashScreen.preventAutoHideAsync()` → `useFonts(newsreaderFonts)` 완료 대기 → `SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}` → `<Stack screenOptions={{ headerShown: false }} />` 순서로 앱 부팅 시퀀스를 배선, `migrateDbIfNeeded` 직접 호출·`useSuspense`·하드코딩 hex·타입 캐스트가 전부 0건임을 grep으로 확인
- `src/app/index.tsx`가 `src/theme/tokens.ts`에서만 시각 값을 가져와 `screenTitle`(FootLog), `timestamp`(DB 스키마 버전, ui-monospace/tabular-nums), `journalEntry`(한국어 샘플 문장, Newsreader 이탤릭), `helperText`(임시 화면 안내) 4개 타이포 스타일을 렌더하고, `useSQLiteContext()` + `PRAGMA user_version`으로 실제 스키마 버전을 읽음(진행률 수치·`colors.accent` 사용 없음)
- `src/app/__tests__/foundation-wiring.test.ts`가 `@jest-environment node`로 7개 계약(onInit 배선/직접호출 부재/useFonts+SplashScreen/토큰 import/hex 0건(tokens.ts·테스트 파일 제외)/accent 부재/진행률 수치 부재)을 정적 소스 분석으로 고정
- `npm test` 전체 스위트(5개 스위트, 35개 테스트) green, `npx tsc --noEmit` exit 0, `npx expo start` 후 `node_modules/expo-router/entry.bundle?platform=ios` 요청이 1234개 모듈을 에러 없이 번들링(`iOS Bundled 4525ms` 로그로 확인)

## Task Commits

Each task was committed atomically:

1. **Task 1: 루트 레이아웃에 폰트 스플래시 게이팅과 SQLiteProvider onInit 마이그레이션을 배선한다** - `e015dbf` (feat)
2. **Task 2: 토큰 소비를 실증하는 부팅 확인 화면과 배선 회귀 가드 테스트를 작성한다** - `626a7f4` (feat)

**Plan metadata:** (본 커밋에서 처리 예정)

## Files Created/Modified
- `src/app/_layout.tsx` - Plan 01-01 플레이스홀더(`<Stack />`만 있던 상태)를 폰트 스플래시 게이팅 + `SQLiteProvider onInit` 배선으로 교체
- `src/app/index.tsx` - 템플릿 데모 텍스트를 부팅 확인용 진단 화면(토큰 4종 타이포 + DB 스키마 버전 표시)으로 교체, 상단 주석에 Phase 4 대체 예정 명시
- `src/app/__tests__/foundation-wiring.test.ts` - 배선 계약 회귀 가드 7개 테스트(신규)

## Decisions Made
- `typography.timestamp.fontVariant`의 `as const` readonly 배열을 index.tsx에서 그대로 Text style에 넣으면 RN `TextStyle`(mutable `FontVariant[]`)과 타입 불일치가 발생 — 캐스트(`as`) 대신 `StyleSheet.create` 안에서 `fontVariant: [...typography.timestamp.fontVariant]`로 얕은 복사한 `timestampText` 스타일을 정의해 해결. `tokens.ts` 자체(01-02 산출물)는 수정하지 않음 — 소비 측에서만 타입 브리징

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] typography.timestamp의 readonly fontVariant 타입 불일치 해결**
- **Found during:** Task 2 (`npx tsc --noEmit` 실행 중 발견)
- **Issue:** `typography.timestamp`를 `<Text style={[typography.timestamp, ...]}>`처럼 직접 배열에 넣으면 `fontVariant: readonly ["tabular-nums"]`가 RN `TextStyle`의 `fontVariant?: FontVariant[]`(mutable)에 할당 불가능해 `npx tsc --noEmit`이 TS2769로 실패
- **Fix:** `StyleSheet.create`에 `timestampText: { ...typography.timestamp, fontVariant: [...typography.timestamp.fontVariant] }`를 정의해 얕은 복사로 mutable 배열을 생성 — 캐스트(`as`) 없이 해결, `tokens.ts`의 readonly 계약은 그대로 유지
- **Files modified:** `src/app/index.tsx`
- **Verification:** `npx tsc --noEmit` exit 0, `npm test` green
- **Committed in:** `626a7f4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 × 1)
**Impact on plan:** tokens.ts(01-02 산출물)의 계약을 변경하지 않고 소비 측 타입 문제만 해결한 순수 버그 수정 — 스코프 확장 없음. Task 1/2의 산출물은 계획이 요구한 그대로 완성됨.

## Issues Encountered
없음 — 위 Deviations 섹션에서 유일한 이슈를 다룸(발견 즉시 자동 수정, 아키텍처 변경 없음).

## User Setup Required
없음 - 외부 서비스 설정 불필요(EAS 빌드/실기기 human-verify는 Plan 01-05에서 처리 예정).

## Next Phase Readiness
- Plan 01-05(실기기 human-verify)가 이 화면(`src/app/index.tsx`)을 통해 Newsreader 렌더·DB 스키마 버전·토큰 소비를 육안으로 확인할 수 있음.
- Phase 4(REQ-today-view)가 `src/app/index.tsx`를 완전히 대체할 때, 이 플랜이 확정한 배선 패턴(`_layout.tsx`의 onInit/useFonts 순서)은 그대로 유지되어야 함.
- 블로킹 요소 없음.

## Self-Check: PASSED

- FOUND: src/app/_layout.tsx, src/app/index.tsx, src/app/__tests__/foundation-wiring.test.ts
- FOUND commits: e015dbf, 626a7f4

---
*Phase: 01-foundation*
*Completed: 2026-08-26*
