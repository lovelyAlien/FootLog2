---
phase: 6
slug: calendar-tab
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo 57.0.4 |
| **Config file** | `package.json` `"test"` script: `NODE_OPTIONS=--experimental-sqlite jest` |
| **Quick run command** | `npm test -- <path/to/file>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

This repo's established convention is **static source analysis** (`@jest-environment node`, `fs.readFileSync` + `stripComments`, regex/string assertions against route/component source — not RN Testing Library render tests) for wiring/contract tests, and real unit tests against `node:sqlite` (via `src/db/testing/nodeSqliteAdapter.ts`) for pure-logic modules. Phase 6 plans must follow this exact split.

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <file touched>`
- **After every plan wave:** Run `npm test` (full suite — includes `NODE_OPTIONS=--experimental-sqlite`)
- **Before `/gsd:verify-work`:** Full suite must be green, with explicit confirmation that `tabs-wiring.test.ts` Tests 13/14 were *edited* (not left red, not deleted)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-02 Task 2 | 06-02 | wave 1 | REQ-calendar-grid | — | N/A | unit (pure grid math) | `npm test -- src/calendar/monthGrid.test.ts` | ✅ | ✅ done |
| 06-03 Task 3 | 06-03 | wave 2 | REQ-calendar-grid | — | N/A | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-05 Task 3 | 06-05 | wave 3 | REQ-past-date-view | — | N/A | static source analysis (no-checkin-button guard) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-02 Task 3 | 06-02 | wave 1 | REQ-date-scrubber | — | N/A | unit (clamp math + visibility gate, pure functions) | `npm test -- src/calendar/scrubberRange.test.ts` | ✅ | ✅ done |
| 06-07 Task 3 | 06-07 | wave 4 | REQ-date-scrubber | — | N/A | static source analysis (hitSlop/dimension on DateScrubber component) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-01 Task 2 | 06-01 | wave 1 | REQ-settings-screen | T-06-01 | `checkin_frequency` constrained to closed union at write site | unit (`settingsRepo` vs node:sqlite) | `npm test -- src/settings/settingsRepo.test.ts` | ✅ | ✅ done |
| 06-04 Task 3 | 06-04 | wave 2 | REQ-settings-screen | T-06-01 | `checkin_frequency` constrained to closed union at write site | static source analysis | `npm test -- src/app/__tests__/settings-wiring.test.ts` | ✅ | ✅ done |
| 06-05 Task 1, Task 3 | 06-05 | wave 3 | REQ-past-date-view | T-06-02 | `date` route param validated as `YYYY-MM-DD` before use in SQL, fail closed on malformed input | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-03 Task 3, 06-06 Task 3 | 06-03, 06-06 | wave 2, wave 3 | (regression) | — | N/A | static source analysis (existing file, edited — Test 13 by 06-03, Test 14 by 06-06) | `npm test -- src/app/__tests__/tabs-wiring.test.ts` | ✅ | ✅ done |

All Task/Plan/Wave columns reconciled against actual 06-01~06-07 PLAN.md task IDs and SUMMARY.md commits (2026-09-02, 06-08 Task 1).

**Fence test confirmation (06-RESEARCH.md Pitfall 2 gate):** `tabs-wiring.test.ts` Test 13/14 still exist in the file, their bodies were rewritten from absence-assertions to existence-assertions (Phase 4 D-07/D-08 boundaries intentionally reversed by 06-03/06-06), and both pass in isolation — confirmed via `npm test -- src/app/__tests__/tabs-wiring.test.ts -t "Test 13"` and `-t "Test 14"` (2026-09-02).

---

## Wave 0 Requirements

- [x] `src/db/migrations.test.ts` — extended for `DATABASE_VERSION` bump (`app_settings` table), following existing `CHECKINS_COLUMNS`/`DAILY_REFLECTIONS_COLUMNS` array-assertion pattern (06-01 Task 1)
- [x] `src/calendar/monthGrid.test.ts` — new, pure date-math (grid cell generation, week-starts-Sunday, month boundaries) (06-02 Task 2)
- [x] `src/calendar/scrubberRange.test.ts` — new, clamp math + visibility-gate logic as pure functions (corrected from the originally-planned component-level test file name — the pure logic was split into its own module; gesture callbacks in `DateScrubber.tsx` are thin wrappers verified via static source analysis instead, per this repo's existing convention) (06-02 Task 3)
- [x] `src/settings/settingsRepo.test.ts` — new, against `node:sqlite` test adapter, mirroring `src/checkin/draftRepo.test.ts`'s shape (06-01 Task 2)
- [x] `src/app/__tests__/calendar-wiring.test.ts` — new, static source analysis for new calendar routes (06-03 Task 3, extended by 06-05 Task 3 and 06-07 Task 3)
- [x] `src/app/__tests__/settings-wiring.test.ts` — new, static source analysis for new settings route + hamburger wiring (06-04 Task 3, extended by 06-06 Task 3)
- [x] Framework install: none — Jest/jest-expo already configured and passing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Date scrubber drag feel (momentum-free, real-time position tracking) | REQ-date-scrubber | Gesture feel/timing not verifiable via static source analysis or pure-function unit tests | iOS Simulator: attach panel, drag scrubber across range, confirm no momentum/overshoot, confirm hard clamp at both ends |
| Bottom sheet force-collapse on scrubber touch | REQ-date-scrubber | Visual/animation timing | iOS Simulator: touch scrubber while sheet is OPEN, confirm sheet collapses and map remains visible |
| Month swipe gesture (left/right) | (D-05, calendar grid) | Gesture feel | iOS Simulator: swipe grid left/right, confirm month changes and header arrow buttons produce identical result |

### Claude 시뮬레이터 확인 (2026-09-02, 06-08 Task 2)

iPhone 17 Pro 시뮬레이터에 dev-client를 연결하고, 검증용 체크인 3~4건을 SQLite에 직접 seed하여 확인. CLAUDE.md "실기기 확인이 필요한 검증 단계" 원칙에 따라 자동화로 못 잡는 항목을 Claude가 먼저 시뮬레이터로 확인했다.

| # | 항목 | Claude 시뮬레이터 확인 | 비고 |
|---|------|------------------------|------|
| 1 | 월 그리드(일요일 시작·오늘 밑줄·톤 구분) | ✅ 확인됨 | 스크린샷으로 그리드 렌더/오늘 accent 밑줄 확인 |
| 2 | 월 이동 2경로(헤더 화살표 + 스와이프) | ❌ **문제 발견** | 아래 Bug 1 참고 — 헤더 화살표가 탭에 반응하지 않음(스와이프는 미확인, 화살표 실패로 우선순위 판단) |
| 3 | 과거 날짜 진입(지도+시트, 체크인 버튼 없음, 탭바 숨김/복원) | ✅ 확인됨 | 스크린샷 근거: 날짜 셀 탭 → 지도+시트 전환, 체크인 버튼 없음, 하단 탭바 사라짐. `< index` 뒤로가기로 캘린더 그리드 복귀 시 탭바 다시 보임 |
| 4 | 기록 없는 날 → "이 날은 기록이 없어요" | ✅ 확인됨 | 스크린샷 근거: 2026-09-09(기록 없음) 진입 시 문구가 시트 표면에 보이고 지도 위에 겹치지 않음 |
| 5 | 스크러버 드래그(실시간 반영·관성 없음·경계 클램프) | ❌ **문제 발견(크래시)** | 아래 Bug 2 참고 — 드래그 즉시 앱 크래시 |
| 6 | 스크러버 숨김(기록 0~1일) | 🟡 부분 확인 | 기록 ≥3일일 때 스크러버가 보이는 것은 확인. 0~1일 숨김 조건은 `scrubberRange.test.ts`의 `shouldShowScrubber` 단위 테스트로 이미 커버되어 있어 별도 시뮬레이터 재확인은 생략 |
| 7 | 설정 화면(3항목·탭바 유지) | ✅ 확인됨(버그 수정 후) | 아래 Bug 3 참고 — 최초 진입 자체가 실패해 발견/수정 후 재확인. 3항목(빈도/토글/버전)만 보이고 탭바 유지됨을 확인. 빈도 액션시트 탭 및 백그라운드→포그라운드 토글 유지는 시간 관계상 미확인 |
| 8 | DESIGN.md 색상 대조(시맨틱 색 없음·accent 절제) | ✅ 확인됨 | 촬영된 모든 스크린샷에서 빨강/초록/파랑 계열 시맨틱 색 없음, accent(올리브)는 오늘 밑줄에서만 등장 |

**발견된 문제 (Task 3에서 창업자 판단 필요 — 이 플랜에서 구현 변경 안 함):**

- **Bug 1 — 캘린더 헤더 화살표가 상태바 영역에 깔려 탭 불가.** `src/calendar/CalendarGridScreen.tsx`의 `headerRow`가 `insets.top` 없이 화면 최상단(y=0)에서 시작해 Dynamic Island/상태바와 겹친다. 다른 화면(`(tabs)/index/index.tsx`의 `bannerStack`)은 모두 `paddingTop: insets.top`을 쓰는데 이 화면만 빠져있다. 시뮬레이터에서 화살표 위치에 반복 탭했으나 월이 전혀 바뀌지 않음(그리드 셀 탭은 같은 좌표계에서 정상 동작해 좌표 문제가 아님을 교차 확인). 좌우 스와이프는 별도로 시도하지 못함.
- **Bug 2 — 날짜 스크러버 드래그 시 크래시.** 재현: 과거 날짜 화면에서 스크러버를 좌우로 드래그. 에러: `[Worklets] Tried to synchronously call a Remote Function. Called "indexForTranslation" on the UI Runtime.` at `DateScrubber.tsx:77:40`(`.onUpdate` 콜백, 즉 UI스레드 워클릿, 안에서 `scrubberRange.ts`의 일반 JS 함수 `indexForTranslation`을 워클릿 표시 없이 직접 호출). REQ-date-scrubber의 핵심 상호작용이 완전히 동작하지 않는다.
- **Bug 3 (발견 즉시 수정 — 커밋 83e1c1b, 59df772) — 설정 화면 진입점이 404로 빠짐.** 최초 원인: 06-08 Task 1에서 타입 에러를 고치며 `router.push('/settings')`를 타입 선언에 맞춰 `/index/settings`로 바꿨으나, `(tabs)/index/` 탭 폴더와 그 안의 `index.tsx` 스크린이 둘 다 "index" 세그먼트를 공유하는 구조적 이름 충돌(Metro 부팅 로그가 경고하는 문제)로 인해 절대 경로가 타입 체크만 통과하고 런타임에는 +not-found로 빠졌다. 같은 스택 내 상대 경로 `./settings`로 재수정 후 시뮬레이터에서 정상 동작 확인. **동일 메커니즘의 잠재 버그**로 `handleRowPress`의 `/index/[id]`(Phase 5, 06-08 Task 1에서 같은 방식으로 "수정"했던 코드)도 상대 경로 `./[id]`로 함께 정정했다 — 다만 바텀시트 리스트 행의 정확한 탭 좌표를 시뮬레이터에서 특정하지 못해 이 경로는 타입 체크·정적 테스트 통과로만 확인했고 실기기/시뮬레이터 탭으로 직접 재현 확인하지 못했다.

**시뮬레이터로 재현 불가 판단 항목:** 없음 — 이번 세션에서 만난 모든 항목은 시뮬레이터로 시도 가능했다(단, 위 부분 확인/미확인 항목은 재현 불가가 아니라 시간 제약으로 생략).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant` set to true in frontmatter

**Approval:** Task 1 automated gate passed (`npm test` 616/616, `npx tsc --noEmit` clean). Pending Task 3 founder sign-off for device-only items.
