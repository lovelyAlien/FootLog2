---
phase: 03-check-in-core-loop
verified: 2026-08-28T02:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "SAVED 카드가 떠 있는 상태에서 지도의 빈 영역(핀/카드가 아닌 곳)을 탭한다."
    expected: "SAVED 카드가 닫히고 체크인 알약버튼이 다시 나타나 두 번째 체크인을 즉시 시작할 수 있다 (앱 재실행 없이)."
    why_human: "코드 리뷰(03-REVIEW.md CR-01)가 'SAVED에서 IDLE로 돌아갈 방법이 없어 세션당 체크인 1회만 가능'한 크리티컬 버그를 발견했고, 수정(03-REVIEW-FIX.md)은 '지도 빈 영역 탭 → DISMISS' 제스처를 새로 발명해 배선했다. 이 제스처는 03-UI-SPEC.md 어디에도 정의되어 있지 않다 (grep 결과 tap/dismiss/닫기/맵 탭 관련 언급 없음) — CLAUDE.md의 'DESIGN.md/UI-SPEC 이탈 시 명시적 사용자 승인 필요' 규칙에 따라 이 제스처가 의도한 제품 동작과 일치하는지 사람의 확인이 필요하다. 또한 03-11-SUMMARY.md의 실기기 검증 5개 항목은 이 수정(commit 8381f80, 2026-08-27 이후 리뷰에서 발견)보다 먼저 실행되어 새 제스처를 실기기에서 검증하지 않았다."
---

# Phase 3: Check-in Core Loop Verification Report

**Phase Goal:** 사용자가 자유형 체크인(위치 + 선택적 사진/메모)을 GPS·저장 실패를 포함해 안정적으로 남길 수 있다.
**Verified:** 2026-08-28T02:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 체크인을 탭하면 사진/메모 입력이 가능해지기 전에 기기 위치를 캡처해 즉시 SQLite에 저장한다 | ✓ VERIFIED | `src/app/index.tsx:211-270` `handleCheckinPress` → `resolveCheckinLocation` → `dispatch(CAPTURE_RESOLVED)` → `upsertDraft(db, ...)` (SQLite `drafts` table, `src/checkin/draftRepo.ts:32-48`) all run before `phase` can reach `SAVED`. `canEditNoteAndPhoto(state)` (`checkinFlow.ts:113-115`) returns true only for `SAVED`, and `CheckinActionCard.tsx` mounts the note/photo JSX only inside the `phase === 'SAVED'` branch (not merely disabled). |
| 2 | 사용자는 (GPS 성공/실패/저정확도 관계없이) 항상 드래그로 보정 가능한 확인 핀을 보며, 5초 타임아웃 시 마지막으로 알려진 위치로 폴백한다 | ✓ VERIFIED | `src/checkin/location.ts:33-92` `captureWithTimeout` races `getCurrentPositionAsync` against a `setTimeout(5000)` promise (`Promise.race`); all three outcomes (`auto`, `timeout_os_cache`, `need_fallback_chain`) flow into `resolveCheckinLocation`, which always returns a `ResolvedLocation` → `CAPTURE_RESOLVED` always fires → `CONFIRM` phase always reached. `index.tsx:485-495` renders a `draggable` `<Marker>` whenever `state.pin && showActionCard`. |
| 3 | 저장이 실패하면 앱이 자동으로 한 번 재시도한 뒤 명확한 실패 메시지와 재시도 버튼을 보여주며, 저장이 성공할 때까지 메모/사진 입력을 막는다 | ✓ VERIFIED | `src/checkin/checkinRepo.ts:35-49` `runWithSingleRetry` attempts exactly twice before returning `{ok:false}`. `CheckinActionCard.tsx:131-156` `SAVE_FAILED` branch renders `저장하지 못했어요` headline + `다시 시도` button with **no** note/photo JSX in that branch. Reducer guard (`checkinFlow.ts:87-100`, WR-02 fix) additionally rejects `PHOTO_PICKED`/`PHOTO_FAILED`/`NOTE_CHANGED` events unless `phase === 'SAVED'` (defense-in-depth). |
| 4 | 위치 권한이 거부되면 사용자는 알림 거부와 동일한 조용한 배너+설정 딥링크 패턴을 보며, (OS 캐시가 아닌) 앱 소유의 폴백 위치가 뒷받침한다 | ✓ VERIFIED | `src/checkin/location.ts:161-164` — when `!permission.granted`, the function returns immediately via `resolveFallbackChain` **without calling any `deps` function** (no OS cache read). `LocationDeniedBanner.tsx` renders an opaque grey banner (`colors.surface`/`colors.textMuted`, no warning/error color) with `onPress={openSettings}` (`Linking.openSettings()`), matching `NotificationDeniedBanner`'s established pattern. |
| 5 | 진행 중인 체크인 드래프트는 저장되거나 명시적으로 폐기될 때까지 앱 백그라운드 전환/재실행을 버텨내며, 날짜 경계 만료와 단일 드래프트 전용 엣지케이스를 포함한다 | ✓ VERIFIED | `draftRepo.ts` uses a fixed `DRAFT_ROW_ID` primary key with `INSERT OR REPLACE` (`upsertDraft`) enforcing exactly one row. `loadRecoverableDraft` (`draftRepo.ts:91-104`) silently deletes and returns `null` when `draft.local_date_key !== todayKey` (date-boundary expiry, no recovery prompt). `checkinRepo.ts:82` deletes the draft row only inside the same transaction *after* the `checkins` INSERT succeeds — a crash during retry leaves the draft intact for recovery on relaunch (`index.tsx:163-187` boot-time `loadRecoverableDraft` effect). |

**Score:** 5/5 truths verified

### Additional truth checked beyond roadmap (implicit in "core loop" / CR-01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | 사용자는 앱을 재실행하지 않고도 세션 안에서 두 번째 이상의 체크인을 할 수 있다 (반복 가능한 "코어 루프") | ⚠ CODE VERIFIED / HUMAN NEEDED | `03-REVIEW.md` (CR-01) found this was **broken** — no path from `SAVED` back to `IDLE` existed prior to the fix, meaning only one check-in was possible per app launch. `03-REVIEW-FIX.md` + `git log` (`8381f80`) confirm a fix landed on this branch: `index.tsx:382-386` `handleMapPress` dispatches `DISMISS` (returns reducer to `initialCheckinState`, confirmed in `checkinFlow.ts:102-103`) when `phase === 'SAVED'`, wired to `<MapView onPress={handleMapPress}>` (`index.tsx:483`). This closes the functional gap at the code level and passes the full test suite (192/192). **However**, this exact gesture ("tap empty map area to dismiss the SAVED card") is a fixer-invented UX affordance — grep of `03-UI-SPEC.md` for tap/dismiss/닫기/맵 탭 finds no matching contract, and the SUMMARY explicitly flags `fixed: requires human verification`. It also postdates the only real-device verification pass (03-11-SUMMARY.md, executed before the review found CR-01), so this specific gesture has never been tested on hardware. See Human Verification section below. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/checkin/config.ts` | Native dep types, no runtime import | ✓ VERIFIED | Type-only, no debt markers |
| `src/checkin/deps.ts` | Single runtime-import point for 4 native deps | ✓ VERIFIED | `defaultLocationDeps`/`defaultImagePickerDeps`/`defaultPhotoStorageDeps`/`defaultCryptoDeps` all present |
| `src/checkin/fallbackLocation.ts` | D-07 founder-confirmed coordinate + validity helper | ✓ VERIFIED | `FALLBACK_COORDINATE = {lat: 37.3789, lng: 127.1145}` with sourcing comment; not `(0,0)` placeholder; gate test exists (`fallbackLocation.test.ts`) |
| `src/db/schema.ts` + `src/db/migrations.ts` | `drafts` DDL + `DATABASE_VERSION` 2 migration | ✓ VERIFIED | `CREATE_DRAFTS_TABLE_SQL` exists; `DATABASE_VERSION = 2`; `currentDbVersion === 1` block adds drafts table without touching v1 blocks |
| `src/checkin/localDate.ts` / `draftRepo.ts` / `checkinRepo.ts` | Single retry, delete-after-insert-only, date-key expiry, single draft | ✓ VERIFIED | All exports present and match must_have contracts (see truths 3/5 above) |
| `src/checkin/permissions.ts` + `src/components/LocationDeniedBanner.tsx` | Quiet banner, foreground recheck, undetermined-only prompt | ✓ VERIFIED | `shouldShowLocationDeniedBanner` gates on `status === 'denied'`; `requestLocationPermission` only calls native request when `status === 'undetermined'`; banner reuses `subscribeToForegroundActive` |
| `src/checkin/photos.ts` | Camera/library action sheet, documentDirectory copy, UUID filenames, source preserved | ✓ VERIFIED | `buildPhotoFileName(source, uuid)` embeds source prefix; `storage.copyIntoDocumentDirectory` is the only write path; destination never reuses picker's original uri/filename |
| `src/checkin/location.ts` | 5s timeout race, 3-stage fallback chain, 5 location_source values | ✓ VERIFIED | `captureWithTimeout`, `resolveFallbackChain` (latest checkin → last map coord → `FALLBACK_COORDINATE`), all 5 `LocationSource` values mapped to distinct code paths |
| `src/checkin/checkinFlow.ts` + `src/components/CheckinActionCard.tsx` | State machine + phase-gated action card | ✓ VERIFIED | Full `IDLE→CAPTURING→CONFIRM→SAVING→SAVED/SAVE_FAILED` graph implemented; note/photo unmounted (not disabled) outside `SAVED` |
| `src/app/index.tsx` | Full map screen wiring (all waves) | ✓ VERIFIED | All key links present (see below); `handleMapPress`/CR-01 fix, WR-01 through WR-05 fixes all landed and confirmed in source |
| `src/app/__tests__/checkin-wiring.test.ts` | Static wiring regression guard | ⚠ PARTIAL | 28 tests cover waves 5 (03-09) through drafts recovery (03-10 Task 3), but **no test was added for the CR-01 fix** (`handleMapPress`/`onPress={handleMapPress}`/dismiss-from-SAVED wiring) — the regression guard for this fix relies only on the pre-existing generic test suite passing, not a targeted contract test. Not a blocker (code path is simple and directly readable), but noted as a coverage gap. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `checkinRepo.ts` | `drafts DELETE` | `INSERT INTO checkins` success only, same transaction | ✓ WIRED | `checkinRepo.ts:64-83` — DELETE only reached after INSERT succeeds, before COMMIT |
| `draftRepo.ts` | `drafts` table | `INSERT OR REPLACE` param binding | ✓ WIRED | `draftRepo.ts:33-48` |
| `LocationDeniedBanner.tsx` | `permissions.ts` | `useLocationPermissionBanner` hook | ✓ WIRED | `LocationDeniedBanner.tsx:18` |
| `location.ts` | `getCurrentPositionAsync` | `Promise.race` + `setTimeout(5000)` | ✓ WIRED | `location.ts:41-58` |
| `location.ts` | `FALLBACK_COORDINATE` | Last stage of 3-step chain | ✓ WIRED | `location.ts:132-140` |
| `index.tsx` | `location.ts` | `resolveCheckinLocation` → `CAPTURE_RESOLVED` | ✓ WIRED | `index.tsx:229-235` |
| `index.tsx` | `draftRepo.ts` | `upsertDraft` on capture, `updateDraftCoordinate` on drag | ✓ WIRED | `index.tsx:238-246, 284-291` |
| `index.tsx` | `LocationDeniedBanner.tsx` | Stacked under `NotificationDeniedBanner` | ✓ WIRED | `index.tsx:498-501` |
| `index.tsx` | `checkinRepo.ts` | `commitCheckin` → `SAVE_SUCCEEDED`/`SAVE_FAILED` | ✓ WIRED | `index.tsx:334-354` |
| `index.tsx` | `draftRepo.ts` | Boot-time `loadRecoverableDraft` | ✓ WIRED | `index.tsx:163-187` |
| `index.tsx` | `ActionSheetIOS` | `PHOTO_ACTION_SHEET_OPTIONS` consumption | ✓ WIRED | `index.tsx:421-424` |
| `index.tsx` (CR-01 fix) | `checkinFlow.ts` | `MapView onPress` → `DISMISS` when `phase === 'SAVED'` | ✓ WIRED (code) / UNVERIFIED (hardware, no UI-SPEC contract) | `index.tsx:382-386, 483` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full check-in domain test suite | `npx jest src/checkin src/components src/db src/app` | 18 suites, 192 tests, all passed | ✓ PASS |
| Type safety | `npx tsc --noEmit` | No errors | ✓ PASS |
| Debt markers (TBD/FIXME/XXX/TODO/HACK) in phase-modified files | `grep -rn "TBD\|FIXME\|XXX\|TODO\|HACK" <15 modified src files>` | No matches | ✓ PASS |
| Fix commits present on this branch | `git log --oneline \| grep -E "8381f80\|9331b8f\|519954a\|3312078\|96321e5\|f99a714"` | All 6 present | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventions or explicit probe declarations found in this phase's PLAN/SUMMARY files. Step 7c: SKIPPED (no declared or conventional probes for this phase).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| REQ-checkin-core | 03-01, 03-04, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11 | 체크인 탭 → 위치 캡처 → 즉시 SQLite 저장 → 선택적 사진/메모 | ✓ SATISFIED | Truths 1, 2 verified; photo/note flow verified in `photos.ts`/`CheckinActionCard.tsx` |
| REQ-checkin-write-failure-ui | 03-04, 03-08, 03-10, 03-11 | 자동 재시도 1회 + 실패 메시지 + 재시도 버튼 + 저장 전 입력 차단 | ✓ SATISFIED | Truth 3 verified |
| REQ-checkin-confirm-pin | 03-01, 03-02, 03-03, 03-04, 03-07, 03-08, 03-09, 03-10, 03-11 | 항상 드래그 가능한 확인 핀 + 5초 타임아웃 폴백 + 드래프트 영속화(4 엣지케이스) | ✓ SATISFIED | Truths 2, 5 verified |
| REQ-location-denied-flow | 03-02, 03-05, 03-07, 03-09 | 위치 거부 시 앱 소유 폴백 위치 + 알림 거부와 동일 배너 패턴 | ✓ SATISFIED | Truth 4 verified |

**Orphaned requirements check:** `.planning/REQUIREMENTS.md` maps exactly these 4 IDs to Phase 3 (lines 119-122), and all 4 appear in at least one PLAN's `requirements:` frontmatter field. No orphaned requirements found.

### Anti-Patterns Found

None (Blocker or Warning level). No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder patterns found in any of the 15 non-test source files modified across this phase. `IN-01` (hardcoded `'사진 변경'`/`'변경'` strings outside `CHECKIN_COPY`, `03-REVIEW.md`) and `IN-02` (`LOCATION_SOURCE_MAPPING_NOTE` duplicated doc string) remain unfixed — both are Info-severity per the code review and explicitly out of the fix scope (`findings_in_scope: 6`, CR-01/WR-01–05 only). These do not block the phase goal.

### Human Verification Required

### 1. CR-01 fix gesture: "tap empty map area to dismiss SAVED card"

**Test:** Complete a check-in through to the `SAVED` state (confirm pin → 확인 → 저장 완료 카드), then tap an empty area of the map (not the pin, not the card).
**Expected:** The SAVED card closes and the floating "체크인" pill button reappears, allowing a second check-in in the same app session without relaunching.
**Why human:** This interaction was invented by the code-fixer to close a Critical bug (CR-01: no path from SAVED back to IDLE, meaning only one check-in was possible per app session) and is **not specified anywhere in `03-UI-SPEC.md`** (verified via grep — no tap/dismiss/닫기/지도 탭 pattern exists in that document). Per `CLAUDE.md`'s design-system rule ("Do not deviate [from DESIGN.md/UI-SPEC] without explicit user approval"), this gesture needs a decision: does "tap the map to dismiss" match the intended product behavior, or should a dedicated affordance (e.g., an explicit "새 체크인 시작"/닫기 button) be used instead? Additionally, the only real-device verification pass for this phase (03-11-SUMMARY.md) ran **before** this fix existed (the code review that found CR-01 happened after wave 7/03-11 was merged), so this specific gesture — and the "second check-in in one session" flow it enables — has never been exercised on actual hardware.

## Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria are code-verified with passing tests (192/192) and no debt markers. One item requires human sign-off before considering the phase fully closed: the CR-01 fix's map-tap-to-dismiss gesture is a fixer-invented UX affordance outside the documented UI-SPEC contract, and it has not been exercised on a real device. This does not block Phase 4 planning but should be confirmed (or replaced) by the founder before shipping.

---

_Verified: 2026-08-28T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
