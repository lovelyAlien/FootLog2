# Constraints

Source-type: SPEC. 5 documents classified SPEC in this ingest:
`DESIGN.md`, `docs/designs/footlog-product-design.md`,
`docs/designs/day-end-reflection-map.md`,
`docs/designs/calendar-multiselect-view.md`,
`docs/designs/calendar-date-scrubber.md`.

All 5 carry equal (default) precedence — no per-doc `precedence` override and
no `locked` ADR exists to rank them against. Where they reference each other
they are, by design, a single iteratively-reconciled corpus (each doc
documents its own supersessions/corrections against its siblings with
dates) — see INGEST-CONFLICTS.md for the one cross-doc staleness found
outside that self-reconciliation.

## Platform / tech-stack constraints
- type: nfr — Native iOS only, Expo/React Native, EAS Dev Client required (not Expo Go) because `react-native-maps` needs native modules. source: docs/designs/footlog-product-design.md
- type: nfr — Target device: founder's own iPhone, 390×844pt baseline (iPhone 12/13/14/15 class), portrait-only, system Dynamic Type only, Reduce Motion is a no-op (existing motion already short/functional). source: docs/designs/footlog-product-design.md (2026-08-24 Design review)
- type: nfr — Foreground-only location permission (no "Always"/background) — deliberate to avoid App Store review friction. source: docs/designs/footlog-product-design.md
- type: nfr — Fully offline / zero network dependency in Phase 1 (no backend, no external APIs — explicitly why weather auto-capture was declined). source: docs/designs/footlog-product-design.md; TODOS.md
- type: protocol — Notification scheduling must use repeating calendar triggers (`repeats: true`, minute-only component) rather than per-day rescheduling, to stay under iOS's 64-pending-notification cap and avoid daily reschedule logic. source: docs/designs/footlog-product-design.md (T2)
- type: nfr — Apple Developer Program is the paid tier ($99/yr, already held by founder) — resolves the "Personal Team free tier / 7-day provisioning expiry wipes local SQLite risk" that was open as of 2026-08-23; confirmed resolved 2026-08-24. source: docs/designs/footlog-product-design.md (Constraints section)

## Data model / schema
- type: schema — `Checkin` table (single table, no user/auth tables — Phase 1 has no backend): `id`, `timestampUtc`, `localDateKey` (e.g. "2026-08-23", drives "today" boundary logic, not lat/lng), `timezoneAtCapture` (IANA tz string), `lat`, `lng`, `accuracyMeters`, `locationSource: "gps_auto" | "gps_dragged" | "gps_low_accuracy_fallback" | "manual_denied" | "manual_no_signal"`, `note`, `photoPath`, `createdAt`, `updatedAt`, `schemaVersion`. source: docs/designs/footlog-product-design.md (로컬 데이터 모델 스키마)
- type: schema — `DailyReflection` table (one row per day, not per check-in): `id`, `date` (local YYYY-MM-DD), `newPlaceAnswer` (fixed-prompt answer), `freeReflection` (unconstrained length/format), `createdAt`, `updatedAt`. source: docs/designs/day-end-reflection-map.md (Data Model)
- type: nfr — Schema is versioned via `PRAGMA user_version` + migration functions — the schema already changed once mid-Phase-1 (`locationSource` field added), so it must not be treated as fixed. source: docs/designs/footlog-product-design.md (Dependencies; Decision Audit Trail #22)
- type: nfr — Photos persist under `documentDirectory`, never `cacheDirectory` (OS may purge cache and silently break stored `photoPath` references). source: docs/designs/footlog-product-design.md (T7; Decision Audit Trail #23)
- type: nfr — EXIF GPS geotagging on export applies to camera-sourced photos only — must not inject location metadata into library-picked photos (correctness fix, not style). source: docs/designs/footlog-product-design.md (Decision Audit Trail #46)

## Design system constraints (DESIGN.md)
- type: nfr — Typography: 3-tier separation — system font (SF Pro) for UI chrome only; monospace (SF Mono, tabular) for system-recorded timestamps; italic serif (Newsreader, loaded from Google Fonts CDN) exclusively for user-authored memo/journal text — never for UI labels. source: DESIGN.md
- type: nfr — Color: single accent `#7C8660` (olive green) — background `#F4F1EA`, surface `#FBFAF6`, surface-soft `#ECE8DF`, text primary `#2F302C`, text muted `#79786F`, text faint `#A7A49A`, line `#DDD8CD`. No semantic (success/warning/error) colors exist anywhere — errors render as muted-tone text, never red. Accent is scoped to exactly 6 approved uses (check-in button, current-location ring, map marker, trajectory line, today's-date underline in calendar, scrubber selected-position indicator) — "지금·기록됨·살아있음" meaning only, never tied to completion/failure. source: DESIGN.md (Color, Decisions Log 2026-08-23 accent-expansion entry)
- type: nfr — Spacing: 8px base unit, scale 4/8/12/16/24/32/48/64. source: DESIGN.md
- type: nfr — Motion: bottom-sheet snap 220ms, confirm-pin drop 160ms, save-state crossfade 180ms; enter=ease-out, exit=ease-in, move=ease-in-out; no bounce/spring easing anywhere. source: DESIGN.md
- type: nfr — Progress/completion-rate numbers or badges (e.g. "3/8", "1/4") are banned from all UI, CRITICAL priority — explicitly rejected multiple times when AI-generated mockups reintroduced them. source: DESIGN.md; docs/designs/footlog-product-design.md
- type: nfr — Touch targets ≥44×44px everywhere, including the scrubber's visually-thin tick-mark drag surface. source: docs/designs/calendar-date-scrubber.md; docs/designs/footlog-product-design.md (T16)
- type: nfr — Body text contrast ≥4.5:1 against background; muted/faint text on the map is banned (must live on the bottom-sheet surface instead) since the map background is not contrast-guaranteed. source: docs/designs/footlog-product-design.md (Decision Audit Trail #12)

## Navigation shell (structural constraint, cross-doc)
- type: protocol — Root: 2-tab bottom bar (오늘/캘린더), visible only on each tab's "home" screen; hidden on push-navigated detail screens (T10, multiselect result). Day-end reflection is a full-screen **modal** (covers the tab bar), not a push — deliberately exempt from the "hide tab bar" decision entirely. source: docs/designs/footlog-product-design.md (네비게이션 셸 구조 diagram); docs/designs/day-end-reflection-map.md (Premise 5)
- type: protocol — Calendar tab home gesture routing: single tap → T10 (push); press-and-drag → multiselect promotion (Phase 2 only in Phase 1 build). source: docs/designs/calendar-multiselect-view.md

## Interaction-timing constraints (intentionally divergent, documented as non-bug)
- type: nfr — Date scrubber (`calendar-date-scrubber.md`): map/sheet update in real time during drag, no momentum, hard-clamp (no rubber-band) at range boundaries.
- type: nfr — Multiselect calendar (`calendar-multiselect-view.md`): map updates only on drag-release, not per-frame — deliberately different from the scrubber because a multiselect drag can span up to a month of cells per gesture (perf/distraction risk), while the scrubber only ever moves one day at a time. Both docs cross-reference this difference explicitly so it is not later "fixed" as an inconsistency. source: docs/designs/calendar-multiselect-view.md (Open Questions)
