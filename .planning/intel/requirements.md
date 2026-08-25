# Requirements

Source-type: PRD. **No documents in this ingest were classified as PRD.**

`docs/designs/footlog-product-design.md` is structured like a PRD (Problem
Statement, Demand Evidence, Target User & Narrowest Wedge, Premises,
Approaches Considered, Success Criteria, NOT in scope) but was
manifest-overridden to `SPEC` type, per its classification JSON
(`manifest_override: true`). Because no PRD-typed source exists, the entries
below are extracted from that SPEC doc and its three child SPEC docs
(`day-end-reflection-map.md`, `calendar-multiselect-view.md`,
`calendar-date-scrubber.md`), using the build-order index already
consolidated by `docs/designs/PHASE1-MASTER-CHECKLIST.md` (itself a DOC-typed
source) as the canonical decomposition. Treat these as SPEC-precedence
requirements, not PRD-precedence.

Every requirement traces to an `M`-id in `PHASE1-MASTER-CHECKLIST.md`, which
in turn points at the original task ID in its source doc (`PD-T*` =
footlog-product-design.md, `DE-T*` = day-end-reflection-map.md, `CM-T*` =
calendar-multiselect-view.md, `CS-T*` = calendar-date-scrubber.md). Consult
those source docs directly for full acceptance detail (each task has
Surfaced-by / Files / Verify fields not reproduced here in full).

## Phase 1 — local-only MVP (in scope now)

### 0. Foundation
- **REQ-foundation-setup** (M1, PD-T1) — Expo project init + EAS Dev Client build. source: docs/designs/footlog-product-design.md
- **REQ-design-tokens** (M2, PD-T21) — DESIGN.md tokens exported as a constants file for import across screens. source: docs/designs/footlog-product-design.md; DESIGN.md
- **REQ-sqlite-migrations** (M3, PD-T23) — SQLite migration framework (`PRAGMA user_version` + migration functions) before any schema-writing task. source: docs/designs/footlog-product-design.md (Dependencies)

### 1. Notification infrastructure
- **REQ-notification-scheduling** (M4, PD-T2/T22/T31) — Repeating calendar trigger scheduling (Method A) + self-heal registry pattern covering both `checkin` and `daily_reflection` trigger kinds; registry must distinguish "off by user setting" from "missing unexpectedly," detect partial failure across multi-trigger frequencies, and clean up orphaned triggers on frequency change. source: docs/designs/footlog-product-design.md T2, T22, T31
- **REQ-permission-copy** (M5, PD-T18) — Confirm copy for 4 iOS permission prompts (location/camera/photo library/notifications).
- **REQ-notification-denied-flow** (M6, PD-T8, depends on M4/M5) — Priming screen → OS prompt → quiet status banner + Settings deep link on denial, `AppState`-based recheck.

### 2. Check-in core loop
- **REQ-checkin-core** (M7, PD-T3) — Location capture → immediate SQLite save → optional photo/memo.
- **REQ-checkin-write-failure-ui** (M8, PD-T4, extends M7) — Auto-retry once, then "저장하지 못했어요" + retry button; blocks memo/photo entry until save succeeds.
- **REQ-checkin-confirm-pin** (M9, PD-T5/T24/T32) — Always-shown draggable confirm pin (GPS success/failure/low-accuracy all same path), 5s timeout with last-known-location fallback, plus draft persistence across the confirm-pin window covering 4 edge cases: expiry at day boundary, delete-on-save, single-draft-only, permission-change robustness.
- **REQ-location-denied-flow** (M10, PD-T19, extends M9) — App-owned fallback position (not OS cached location — corrected in Eng review, see decisions.md audit trail #24), same banner pattern as notification-denied.

### 3. Today view
- **REQ-today-view** (M11, PD-T6) — Map + 3-snap bottom sheet (CLOSED/DRAGGING/OPEN, 220ms), real check-ins only in time order, floating check-in button independent of sheet state. Note: does NOT include the "오늘 돌아보기" row yet — that's added later in M28.
- **REQ-photo-resize** (M12, PD-T7) — Resize to max 1600px, store under `documentDirectory` (not `cacheDirectory` — OS-purgeable), inline failure text. 2026-08-24 extension: distinguish camera vs library source for downstream EXIF tagging (M31 depends on this).
- **REQ-onboarding-empty-state** (M13, PD-T9) — Notification priming = entire onboarding; location permission requested contextually at first check-in tap.
- **REQ-trajectory-line** (M14, PD-T14) — Thin low-saturation connecting line across today's check-ins in time order; no distance/time labels.

### 4. Check-in detail/edit
- **REQ-checkin-detail-base** (M15, PD-T13) — Tap completed row → detail screen, edit memo/photo anytime.
- **REQ-checkin-detail-layout** (M16, PD-T28, extends M15) — Fixed layout order: time (mono) → static map preview → "지도 앱에서 열기" → photo → memo.
- **REQ-checkin-detail-flush** (M17, PD-T29, extends M15) — Force-flush unsaved memo on `AppState` background transition.
- **REQ-maps-deeplink** (M18, PD-T26, depends on M17) — "지도 앱에서 열기" deep link; must not lose unsaved edits (hence depends on M17).
- **REQ-checkin-swipe-delete** (M19, PD-T11) — Swipe-to-delete, olive-green delete affordance (not red), 4s undo snackbar on **all** deletes regardless of memo/photo presence.

### 5. Calendar tab
- **REQ-calendar-grid** (M20, CM-T1a + CM-T5) — Month grid home screen, tap-only (no drag) in Phase 1, accent underline on "today."
- **REQ-past-date-view** (M21, PD-T10, depends on M20) — Read-only map+sheet for a past date, no check-in button.
- **REQ-date-scrubber** (M22, CS-T1..T4, extends M21) — Floating horizontal date scrubber overlay: force-collapses bottom sheet on touch, hard-clamps at range boundaries (no rubber-banding), 44×44pt touch targets, 44pt header height.

### 6. Day-end reflection
- **REQ-reflection-base** (M23, `[신규발견]` no source task ID — spec lives in day-end-reflection-map.md's Premises/Visual Design Decisions/Data Model prose, not a numbered task) — Reflection modal: reused static map + 2 prompts + `DailyReflection` model + entry point wiring. **Flagged by PHASE1-MASTER-CHECKLIST.md itself as a gap no source doc had captured as an explicit build task** — treat this as the single most likely underspecified item for planning purposes.
- **REQ-reflection-autosave** (M24, DE-T2) — 5s debounce + `AppState` background flush + modal-dismiss (✕/swipe) flush — two independent flush triggers, same save function.
- **REQ-reflection-save-failure-ui** (M25, DE-T1) — Same retry pattern as check-in save failure.
- **REQ-reflection-copy-fix** (M26, DE-T3) — Rename "오늘의 흔적" section, remove check-in count display (progress-exposure-ban principle).
- **REQ-reflection-notification** (M27, DE-T4, depends on M4) — Daily fixed-time trigger, default ON, settings toggle.
- **REQ-reflection-today-entry** (M28, `[연계]` linked item, extends M11) — "오늘 돌아보기" row pinned atop today-view bottom sheet list, always visible even at 0 check-ins.
- **REQ-past-reflection-edit** (M29, DE-T5, depends on M23) — T10 (past-date view) gains editable reflection prompts, reversing the doc's own original "read-only" NOT-in-scope call (see decisions.md).

### 7. Export
- **REQ-export** (M30, PD-T20) — Manual local export (JSON + photos as zip) — corrected from a JSON-only "backup" misnomer (Decision Audit Trail #25).
- **REQ-exif-geotag** (M31, PD-T25, depends on M12) — EXIF GPS tagging on export, **camera-sourced photos only** (library-picked photos must NOT get false location metadata injected — Decision Audit Trail #46).
- **REQ-exif-disclosure** (M32, PD-T30, extends M31) — Disclosure copy on export screen ("사진에 위치 정보가 포함됩니다").

### 8. Polish
- **REQ-app-name** (M33, PD-T15) — "FootLog" display name in priming/settings only, not in daily today-view.
- **REQ-accessibility-baseline** (M34, PD-T16) — 44px touch targets, 4.5:1 contrast, VoiceOver labels on icon-only buttons. **Known gap explicitly NOT covered**: VoiceOver has no alternate path for the drag-to-correct confirm-pin gesture — tracked in TODOS.md as deferred (P3), not part of this requirement's acceptance.

### Already-done documentation task
- **[PD-T27]** Kill condition — already written directly into Success Criteria on 2026-08-24; no build work remains. See decisions.md and the conflicts report (INFO entry) for a related TODOS.md staleness note.

## Phase 2 — explicitly deferred (not in scope until Phase 1 kill-condition-passing validation completes)

- **REQ-phase2-backend** — Spring Boot (Kotlin) backend, Spring Security + Kakao OAuth2/PKCE, S3-compatible object storage, client-server local-first sync. source: TODOS.md ("2단계: 백엔드/인증/클라우드 인프라"); docs/designs/footlog-product-design.md (2단계 확장 section)
- **REQ-calendar-multiselect-drag** (CM-T1b, CM-T2, CM-T3, CM-T4) — Drag-multiselect promotion + multiselect result screen (map+sheet aggregate view, index-range selection, discontinuous-pattern handling). Explicitly held out of Phase 1 by `docs/designs/calendar-multiselect-view.md`'s own "스코프 상태" section and reconfirmed by PHASE1-MASTER-CHECKLIST.md's "Phase 2 — 지금 하지 않음" list.
- Weekly repeat-pattern analysis, day-review writing beyond the reflection modal, weather/temperature auto-capture (explicitly declined by user, breaks Phase 1's zero-network-dependency principle), widget/lock-screen quick check-in, Apple Watch companion — all tracked in TODOS.md.

## Open / user-pending items surfaced in DOC sources (not requirements yet)
- Apple Journal competitive-displacement question — flagged as "User Challenge" awaiting Final Approval Gate decision (TODOS.md, 2026-08-24 CEO review).
- Photo-permission-denied vs resize-failure copy split (P3, TODOS.md).
- First-check-in-of-day reward signal design tension with the anti-gamification principle (P3, TODOS.md — explicitly flagged as needing real design thought, not a quick fix).
- Timezone-change repeating-trigger real-device verification (P2, TODOS.md).
