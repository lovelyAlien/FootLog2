---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [design-tokens, typography, expo-google-fonts, newsreader, jest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation (Plan 01-01)
    provides: "Expo SDK 57 스캐폴드, jest-expo 테스트 러너, @expo-google-fonts/newsreader 런타임 의존성"
provides:
  - "src/theme/tokens.ts — colors/typography/spacing/motion/radius 5개 as const 상수, DESIGN.md 값과 1:1 대조"
  - "src/theme/fonts.ts — Newsreader 이탤릭 세리프 번들 폰트 맵(JOURNAL_FONT_FAMILY, newsreaderFonts)"
  - "20개 회귀 테스트(tokens 13 + fonts 5 + 교차검증 1 + smoke 1)로 토큰 드리프트 및 semantic 색상 재도입 회귀 차단"
affects: [01-04, "Phase 4-8 전 화면"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "src/theme/tokens.ts 단일 상수 파일 — 모든 화면이 이 하나에서만 디자인 토큰을 import(React Native 타입 import 금지, 순수 값 객체)"
    - "src/theme/fonts.ts를 커스텀 폰트 등록의 유일한 지점으로 삼고, tokens.ts는 JOURNAL_FONT_FAMILY를 리터럴 재선언 없이 참조"

key-files:
  created:
    - src/theme/tokens.ts
    - src/theme/tokens.test.ts
    - src/theme/fonts.ts
    - src/theme/fonts.test.ts
  modified: []

key-decisions:
  - "DESIGN.md의 'Newsreader는 Google Fonts CDN에서 로드' 문구를 문자 그대로 구현하지 않고 @expo-google-fonts/newsreader 번들 방식으로 구현 — PROJECT.md의 오프라인 우선 원칙과 충돌하는 런타임 CDN fetch를 배제하고 동일 폰트 파일을 번들에 정적 포함. 시각적 결과는 동일, 로딩 메커니즘만 플랫폼에 맞게 치환(디자인 의도 변경 아님, fonts.ts 상단 주석에 명시)"

patterns-established:
  - "디자인 토큰은 TextStyle 등 React Native 타입 애노테이션 없이 순수 as const 값 객체로 유지 — 리터럴 타입 추론을 보존해 회귀 테스트 단언이 좁혀지지 않도록 함"
  - "폰트 패밀리 리터럴은 fonts.ts 한 곳에서만 선언하고 tokens.ts를 포함한 모든 소비처는 그 상수를 참조 — 리터럴 재선언에 의한 드리프트 방지"

requirements-completed: [REQ-design-tokens]

# Metrics
duration: 12min
completed: 2026-08-26
---

# Phase 1 Plan 2: 디자인 토큰 상수 파일 + Newsreader 번들 폰트 Summary

**DESIGN.md의 컬러 12개·타이포 5종·스페이싱 8단계·radius 4단계·모션 4항목을 `src/theme/tokens.ts` 단일 `as const` 상수 파일로 전사하고, Newsreader 이탤릭 세리프를 `@expo-google-fonts/newsreader` 번들 폰트 맵(`src/theme/fonts.ts`)으로 등록해 두 파일을 `JOURNAL_FONT_FAMILY` 단일 출처로 연결했다.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-26T09:14:00Z (추정, PLAN 로드 시각 기준)
- **Completed:** 2026-08-26T09:26:43Z
- **Tasks:** 2
- **Files modified:** 4 (신규 4개: tokens.ts/tokens.test.ts/fonts.ts/fonts.test.ts)

## Accomplishments
- `DESIGN.md`를 직접 읽고 `<design_source_of_truth>` 표와 대조 검증 — 불일치 없음(컬러/타이포/스페이싱/radius/모션 값 전부 일치)
- `src/theme/tokens.ts`가 `colors`/`typography`/`spacing`/`motion`/`radius` 5개 named export만 `as const`로 제공, semantic 색상(success/warning/error/info/danger)과 bounce/spring 이징 부재를 회귀 테스트(Test 2, 12)와 grep 게이트로 이중 봉쇄
- `src/theme/fonts.ts`가 `@expo-google-fonts/newsreader`에서 `Newsreader_400Regular_Italic`을 번들 import해 `newsreaderFonts`/`JOURNAL_FONT_FAMILY`를 export, 런타임 CDN fetch(`fonts.googleapis.com`/`fetch(`/`https?://`) 문자열이 코드에 존재하지 않음을 테스트로 확인
- `tokens.ts`의 `typography.journalEntry.fontFamily`가 리터럴 대신 `fonts.ts`의 `JOURNAL_FONT_FAMILY`를 참조 — 두 파일 간 드리프트를 교차검증 테스트로 봉쇄
- `npm test` 전체 스위트(20개 테스트, 3개 스위트) green, `npx tsc --noEmit` exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: DESIGN.md 토큰을 src/theme/tokens.ts 단일 상수 파일로 전사** - `353dc4c` (feat)
2. **Task 2: Newsreader 이탤릭 세리프를 번들 폰트 맵으로 등록하고 tokens.ts와 연결** - `b2dd51f` (feat)

**Plan metadata:** (본 커밋에서 처리 예정)

_Note: 두 태스크 모두 `tdd="true"`였으나 RED(테스트 먼저 작성해 모듈 부재로 실패 확인) → GREEN(구현 후 통과) 단계가 각 태스크 내부에서 처리되어 하나의 feat 커밋으로 묶임 — RED 단계 자체가 별도 커밋으로 분리되지 않은 것은 계획의 TDD 서술이 "먼저 작성 후 실패 확인"을 액션 스텝 내 절차로 규정했기 때문(플랜 자체가 RED만의 독립 커밋을 요구하지 않음)._

## Files Created/Modified
- `src/theme/tokens.ts` - DESIGN.md 값을 전사한 `colors`/`typography`/`spacing`/`motion`/`radius` 5개 `as const` 상수, `journalEntry.fontFamily`는 `fonts.ts`의 `JOURNAL_FONT_FAMILY` 참조
- `src/theme/tokens.test.ts` - 13개 단언 테스트(컬러 12개 값·semantic 색상 부재·hex 포맷·타이포 5종·spacing/radius/motion 값·bounce/spring 부재·최상위 export 개수 5개 고정)
- `src/theme/fonts.ts` - `@expo-google-fonts/newsreader`에서 `Newsreader_400Regular_Italic` 번들 import, `JOURNAL_FONT_FAMILY`/`newsreaderFonts` export, CDN fetch 배제 근거 주석
- `src/theme/fonts.test.ts` - 5개 단언 테스트(폰트 패밀리 리터럴·폰트 맵 키/값·tokens.ts 교차검증·CDN 문자열 부재)

## Decisions Made
- DESIGN.md의 "Newsreader CDN 로딩" 문구 대신 번들 방식 채택 — PROJECT.md 오프라인 우선 원칙 준수(Deviations 섹션 참고, 플랜의 `<action>`이 이미 이 치환을 명시적으로 지시함)
- `tokens.ts`에 React Native `TextStyle` 타입 애노테이션을 붙이지 않고 순수 값 객체로 유지 — `as const` 리터럴 타입 추론 보존을 위해 플랜 지침 그대로 따름

## Deviations from Plan

None - plan executed exactly as written. (DESIGN.md CDN 문구 vs 번들 구현의 차이는 플랜이 처음부터 "의도적 구현 차이"로 명시하고 이를 fonts.ts 주석과 본 SUMMARY에 기록하도록 지시한 사항이라 별도 Rule 기반 자동 수정이 아니라 계획된 절차 이행임.)

## Issues Encountered
없음.

## User Setup Required
없음 - 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 01-04(루트 레이아웃 배선)가 `src/theme/fonts.ts`의 `newsreaderFonts`를 `useFonts(newsreaderFonts)`에 그대로 전달할 수 있음.
- Phase 4~8의 모든 화면이 `src/theme/tokens.ts`에서 `colors`/`typography`/`spacing`/`motion`/`radius`를 import해 하드코딩 없이 DESIGN.md 값을 참조할 수 있음.
- 블로킹 요소 없음.

## Self-Check: PASSED

- FOUND: src/theme/tokens.ts, src/theme/tokens.test.ts, src/theme/fonts.ts, src/theme/fonts.test.ts
- FOUND commits: 353dc4c, b2dd51f

---
*Phase: 01-foundation*
*Completed: 2026-08-26*
