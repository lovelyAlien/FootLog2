# Context

Source-type: DOC. 2 documents classified DOC in this ingest: `TODOS.md` and
`docs/designs/PHASE1-MASTER-CHECKLIST.md`.

## Topic: Phase 1 build order (canonical index)
`docs/designs/PHASE1-MASTER-CHECKLIST.md` is itself a consolidation doc — it
merges Phase 1 tasks from 4 SPEC docs (`footlog-product-design.md` =`PD`,
`day-end-reflection-map.md`=`DE`, `calendar-multiselect-view.md`=`CM`,
`calendar-date-scrubber.md`=`CS`) into one ordered checklist, M1–M34, grouped
into 8 stages (Foundation → Notification infra → Check-in core loop → Today
view → Check-in detail/edit → Calendar tab → Day-end reflection → Export →
Polish). It explicitly does **not** duplicate task detail — Surfaced-by/
Files/Verify fields live only in the original source docs. It flags one gap
none of the 4 source docs had captured as a numbered task: the day-end
reflection modal's own base build (M23, tagged `[신규발견]`). It also lists
"알려진 순서 유연성" (M2, M14, M19, M33/M34 have no hard dependency and may
be reordered during implementation) and an explicit Phase-2-do-not-start list
(CM-T1b/T2/T3/T4, and the entire "2단계 확장" block from the parent doc).
source: docs/designs/PHASE1-MASTER-CHECKLIST.md

## Topic: Deferred items — Phase 1 build-blast-radius (2026-08-23 /autoplan review)
- Lock-screen/home-screen widget quick check-in (P3) — needs WidgetKit native bridge, >1 day CC effort, outside Phase 1 blast radius. Revisit after Phase 1 validation.
- Competitive-landscape paragraph (Arc Timeline, Day One, Swarm) (P3) — documentation-only, non-blocking.
- Photo-permission-denied vs resize-failure copy split (P3) — currently one shared inline failure string covers 3 distinct failure causes (camera denial / library denial / resize failure), each with a different recovery path.
- First-check-in-of-day reward signal (P3) — flagged as genuinely in tension with the anti-gamification/anti-streak principle; explicitly marked as needing real design thought, not a quick fix.
- Multiselect-calendar month-view pin density/clustering (500–700 pins/month) (P3) — blocked on Phase 1 usage data; the multiselect result screen itself isn't even in Phase 1 scope yet.
- iOS Location Services global-off vs per-app-denial distinction (P3) — intentionally simplified to one shared deep link; revisit only if the app gets multiple users (Phase 2+).
source: TODOS.md

## Topic: Deferred items — /gstack-autoplan CEO review (2026-08-24)
- Kill-condition-for-validation gap — **STALE, see INGEST-CONFLICTS.md.** TODOS.md logs this as an open P1 item, but `footlog-product-design.md`'s Success Criteria section was directly edited the same day (2026-08-24) to add the explicit kill condition (3 consecutive 0-check-in days, or <20% memo/photo attachment rate). PHASE1-MASTER-CHECKLIST.md also marks `[PD-T27]` as done. TODOS.md itself was not updated to reflect this — user should close/remove this TODOS.md entry.
- Timezone-change repeating-trigger real-device verification (P2) — no code exists yet to test against; do after M1 (project setup) once a real device is available.
- VoiceOver alternate path for confirm-pin drag-correction (P3) — acknowledged as a genuine, undesigned interaction gap (not a quick fix); low urgency since the sole Phase 1 user is not a VoiceOver user.
- Apple Journal competitive-displacement question (P2, **user-decision-pending / "Final Approval Gate"**) — iOS 17+ ships a free built-in journaling app with overlapping location+photo+prompt functionality; flagged independently by two review voices; explicitly not auto-decided, awaiting founder judgment call.
- Weather/temperature auto-capture at check-in (P3) — explicitly declined by the founder (would require a network call, breaking Phase 1's zero-network-dependency posture).
source: TODOS.md

## Topic: Phase 2 scope (post-validation)
Spring Boot (Kotlin) backend + Spring Security/Kakao OAuth2 PKCE + S3-compatible
object storage + client-server local-first sync. Motivation is dual: learning/
portfolio (Kotlin/Spring Boot experience) and future productization option.
This decision reversed twice in-session before landing on "defer entirely to
Phase 2" (office-hours: include in Phase 1 for learning → eng-review early:
add auth+storage too → eng-review late, Codex outside voice: "Phase 1 stopped
being an MVP and became full-stack development" → reverted to local-only).
Suggested entry point once unblocked: Kakao developer console app registration
→ Spring Security + OAuth2 Client deps → PKCE flow → check-in CRUD API → S3-
compatible storage integration.
Depends on/blocked by: Phase 1 Success Criteria passing (see decisions.md kill
condition; note TODOS.md's own "Depends on" line for this item still cites an
older percentage-based gate ("체크인 완료율이 수기 일기보다 높고, 메모/사진
첨부율이 50% 이상") that predates the 2026-08-24 qualitative kill-condition
rewrite in footlog-product-design.md — see INGEST-CONFLICTS.md).
source: TODOS.md ("2단계: 백엔드/인증/클라우드 인프라")

## Topic: Already-resolved items (housekeeping, no action needed)
- "5개 설계 문서 태스크 통합 체크리스트 부재" — resolved by creating `docs/designs/PHASE1-MASTER-CHECKLIST.md` itself (2026-08-24).
source: TODOS.md
