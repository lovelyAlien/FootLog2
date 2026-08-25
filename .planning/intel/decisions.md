# Decisions

Source-type: ADR. **No documents in this ingest were classified as ADR.**

Per the classification set (`.planning/intel/classifications/*.json`), all 5
design/spec documents were manifest-overridden to `SPEC`, and 2 documents were
classified `DOC`. Zero `ADR` and zero `PRD` classifications exist in this
ingest, so there is nothing to enforce LOCKED precedence against, and the
LOCKED-vs-LOCKED / LOCKED-vs-existing-context blocker checks are not
applicable this round.

One classification carries an explicit note relevant to this file:

- `docs/designs/day-end-reflection-map.md` (classified SPEC via manifest
  override) — classifier note: "Content is actually an /office-hours
  design-review artifact mixing PRD-like elements (Premises, user-facing
  decisions, Approaches Considered, task list) with a SPEC-like Data Model
  section (DailyReflection schema) and review/decision-log structure (GSTACK
  REVIEW REPORT) resembling ADR status tracking." This doc, and
  `docs/designs/footlog-product-design.md`, both contain an internal
  "Decision Audit Trail" / "GSTACK REVIEW REPORT" log that functions like an
  informal ADR ledger, even though the doc as a whole was typed SPEC.

## Notable confirmed product/architecture decisions (informational — extracted from SPEC docs, not ADR-sourced, not LOCKED)

These are decisions stated as "확정" (confirmed) inside the SPEC-typed docs.
They carry SPEC-tier precedence only (not ADR/LOCKED) and can in principle be
revisited by a future ADR. Listed here so `gsd-roadmapper` doesn't have to
re-mine 1,193 lines to find them.

- **Phase 1 is local-only, no backend.** Spring Boot/Kotlin backend, Kakao
  OAuth2/PKCE, S3-compatible object storage, and local-first sync are all
  deferred to Phase 2. Reconfirmed after two in-session reversals.
  source: docs/designs/footlog-product-design.md (Recommended Approach, NOT in scope)
- **Check-in model is free-form, not slot-based.** Notifications are pure
  reminders; check-ins are always recorded at actual capture time; no
  "missed slot" / retroactive check-in concept exists.
  source: docs/designs/footlog-product-design.md (체크인 모델 — 자유형으로 재정의, 2026-08-22)
- **Notification scheduling = Method A (repeating calendar trigger, `repeats: true`, minute-only), not per-day rescheduling (Method B).** Snooze removed as a consequence. A lightweight foreground self-heal registry (`{id, kind, recreate()}`) mitigates the known "iOS repeating trigger silently stops" failure mode without reviving Method B.
  source: docs/designs/footlog-product-design.md (T2, Decision Audit Trail #30, #49)
- **Bottom tab bar (오늘/캘린더) introduced 2026-08-23**, replacing the prior "map edge-to-edge everywhere" principle for the two home screens; hidden on "기록에 집중" detail screens (T10, multiselect result, day-end reflection modal).
  source: DESIGN.md (Decisions Log, 2026-08-23 entries); docs/designs/footlog-product-design.md (네비게이션 section)
- **Day-end reflection is part of the core loop, not a Phase 2 extra** — this explicitly reverses `day-end-reflection-map.md`'s own parent-doc-inherited "NOT in scope" classification.
  source: docs/designs/day-end-reflection-map.md (Premises #1, Supersedes note)
- **Kill condition for the 1–2 week qualitative validation window is now explicit**: stop and do not proceed to Phase 2 if (a) 3+ consecutive days with zero check-ins (while notifications fired normally), or (b) memo/photo attachment rate <20% across the window. Written directly into Success Criteria on 2026-08-24.
  source: docs/designs/footlog-product-design.md (Success Criteria, Decision Audit Trail #45)
- **EAS Dev Client is required** (not Expo Go) because `react-native-maps` needs native modules — technical constraint, not reopened.
  source: docs/designs/footlog-product-design.md (Recommended Approach — 빌드 방식)
- **Calendar tab entry gesture determines destination**: single tap on month grid → T10 (single past-date, read-only); press-and-drag → multiselect result screen (Phase 2 only; Phase 1 ships tap-only grid, `CM-T1a`).
  source: docs/designs/calendar-multiselect-view.md (진입점 확정; 스코프 상태)
- **Progress/completion-rate numbers are never surfaced in UI (CRITICAL, cross-doc principle).** Applies to today view, day-end reflection ("오늘의 흔적" section had its count removed), and multiselect selection labels (must show actual dates/patterns, not counts).
  source: docs/designs/footlog-product-design.md; docs/designs/day-end-reflection-map.md (T3); docs/designs/calendar-multiselect-view.md (Premise 3)

None of the above are LOCKED; they are ordinary SPEC-tier statements and are superseded by any future ADR the project introduces.
