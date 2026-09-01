# Phase 6: Calendar Tab - Research

**Researched:** 2026-09-01
**Domain:** React Native/Expo calendar UI + gesture-driven date scrubber + settings screen + notification preference persistence, inside an already-mature Expo Router / SQLite / Reanimated codebase
**Confidence:** HIGH (stack/architecture — verified against installed package.json + existing code patterns), MEDIUM (some UI-composition decisions not literally specced), LOW (none — no unverified external claims remain after mockup/doc review)

## Summary

Phase 6 does not need any new npm dependency. Every mechanism it requires — gesture-driven dragging, bottom-sheet imperative control, SQLite migrations, notification trigger cancel/recreate, nested-stack route hiding of the tab bar, native chevron icons — already exists in this codebase from Phases 1–5 and only needs to be *composed* in a new way. The single most important discovery is that `getTodayCheckins(db, localDateKey)` in `src/checkin/checkinRepo.ts` **already accepts an arbitrary `localDateKey`** and its own header comment explicitly says Phase 6 will reuse it unchanged — no new `getCheckinsByDate` function is required (an alias export is optional, not necessary).

The second major discovery is a **pre-existing regression-test contract that Phase 6 is required to break intentionally**: `src/app/__tests__/tabs-wiring.test.ts` Test 13 asserts `calendar.tsx` contains no `Pressable`/`useState`/`FlatList` etc. (Phase 4's placeholder guard), and Test 14 asserts neither `(tabs)/index/index.tsx` nor `(tabs)/_layout.tsx` contain `headerRight`/`settings`/`≡` (Phase 4's D-08 boundary guard). Both tests must be edited as part of this phase's own diff, or CI fails on work that is explicitly in-scope.

The third major discovery is that notification settings persistence is a **known, already-flagged gap**: `src/notifications/config.ts` states in a comment that Phase 2 does not persist `NotificationSettings` and explicitly names Phase 6 as the owner of persistence + UI. `applyNotificationSettings(settings, deps)` in `src/notifications/scheduling.ts` already implements the full cancel-then-recreate delta logic — the settings screen only needs to call it, not reimplement it. `src/app/_layout.tsx`'s foreground self-heal call (`runForegroundNotificationCheck()`) currently uses zero arguments (hardcoded default) and must be updated to read the persisted settings once Phase 6 creates them.

**Primary recommendation:** Add one new SQLite migration (`DATABASE_VERSION` 2→3) for a single-row `app_settings` table (same "fixed-PK single row" pattern as `drafts`), extend the calendar tab into a nested Stack (`calendar/_layout.tsx` + `calendar/index.tsx` + `calendar/[date].tsx`), reuse `CheckinDetailScreen` and `getTodayCheckins` unchanged, build the date scrubber with `react-native-gesture-handler`'s `Gesture.Pan()` + Reanimated shared values (not `PanResponder`, not the `ReanimatedSwipeable` wrapper — those are the wrong abstraction level for continuous drag), and hand-roll the settings grouped-list UI with existing `View`/`Pressable` + tokens rather than introducing `@expo/ui`'s native SwiftUI `List`/`Section` (which would render native iOS system colors that conflict with DESIGN.md's warm-neutral palette).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Month grid rendering + swipe/arrow month navigation | Client (RN component) | — | Pure UI state, no persistence; renders from a client-side computed date range |
| "Which dates have a checkin" (muted-tone density) | Client (RN component) | Database (SQLite read) | Grid needs a per-month presence query; existing `local_date_key` index already supports it |
| Past-date read-only map+sheet view | Client (RN component) | Database (SQLite read via `getTodayCheckins`) | Reuses Phase 4's "single query feeds map pins + list" pattern (04-CONTEXT.md D-11) |
| Date scrubber drag interaction | Client (gesture-handler + Reanimated worklets) | — | Must be 1:1 real-time, UI-thread-driven; no server/DB round-trip per frame |
| Hamburger entry point | Client (Today view header) | — | Pure navigation affordance |
| Settings screen (frequency / toggle / version) | Client (RN component) | Database (SQLite read/write) + Notification scheduling (native) | Settings screen renders UI, persists to SQLite, and calls existing `applyNotificationSettings` to reconcile native triggers |
| Notification frequency persistence | Database (SQLite, new `app_settings` table) | — | Must survive app restart; existing `drafts`-table single-row pattern is the established convention (not AsyncStorage — see Don't Hand-Roll) |
| Notification trigger cancel/recreate on settings change | Client → Notification scheduling (`expo-notifications` via `applyNotificationSettings`) | — | Already built in Phase 2; Phase 6 is a caller, not an implementer |
| Foreground self-heal reading correct frequency | Client (`src/app/_layout.tsx`) | Database (SQLite read of persisted settings) | Currently hardcoded to `PHASE2_NOTIFICATION_SETTINGS`; must be wired to read persisted settings once they exist |

## Standard Stack

### Core (all already installed — no new dependency required)

| Library | Installed Version | Purpose in this phase | Why Standard |
|---------|---------|---------|--------------|
| `react-native-gesture-handler` | ~2.32.0 [VERIFIED: package.json] | `Gesture.Pan()` for the date scrubber's continuous horizontal drag | Already used in this codebase for `ReanimatedSwipeable` (swipe-to-delete); root already wrapped in `GestureHandlerRootView` in `src/app/_layout.tsx`, whose comment explicitly anticipates "Phase 6(캘린더 스크러버)" |
| `react-native-reanimated` | 4.5.1 [VERIFIED: package.json] | Shared values for scrub position/offset, `useAnimatedStyle`, worklet-driven real-time updates | Already used for `sheetPosition`/`floatingButtonStyle` in Today view; Reanimated 4.x requires the separate `react-native-worklets` package, already installed (0.10.1) |
| `@gorhom/bottom-sheet` | ^5.2.14 [VERIFIED: package.json] | Imperative `snapToIndex(0)`/`close()` to force-collapse the sheet the instant the scrubber is touched | Already the sheet implementation for Today view; past-date view should reuse the same `TodayBottomSheet`-style component in read-only mode, not a new sheet library |
| `expo-sqlite` | ~57.0.1 [VERIFIED: package.json] | New `app_settings` table + migration bump | Already the single persistence layer for this app (checkins/drafts/reflections) |
| `expo-symbols` (`SymbolView`) | ~57.0.2 [VERIFIED: package.json] | Hamburger icon (`line.3.horizontal`), chevrons, back button | Already used for `chevron.left`/`trash`/`camera` throughout Phases 3–5 |
| `expo-constants` | ~57.0.14 [VERIFIED: package.json, installed but currently unused in `src/`] | App version string for the settings screen "버전" row | Standard Expo API (`Constants.expoConfig?.version`); no code in this repo uses it yet, so this is a first-use, not a pattern-continuation |
| `expo-router` | ~57.0.16 [VERIFIED: package.json] | New nested routes: `calendar/_layout.tsx`, `calendar/index.tsx`, `calendar/[date].tsx`, and a settings push route inside the Today tab's stack | Same nested-stack-inside-tab convention already established by `(tabs)/index/_layout.tsx` (05-01-PLAN.md) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Intl.DateTimeFormat` (native JS, no package) | n/a | Month-grid date generation, weekday-of-month math, locale-correct month/day labels | Already the sole date-formatting mechanism in `src/checkin/localDate.ts` (`resolveLocalDateKey`, `formatLocalMonthDay`) — Phase 6 must extend this file's convention, not introduce `date-fns`/`dayjs`/`moment` |
| `ActionSheetIOS` (React Native core) | bundled | Notification-frequency picker (3 options) | Already used for the photo-source picker in `checkin/photos.ts` / `CheckinDetailScreen.tsx`; reusing it for a 3-option frequency choice avoids adding a 4th route just for a picker (see Open Questions) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled month-grid date math | `react-native-calendars` or similar calendar library | Rejected: no calendar library is installed or referenced anywhere in this codebase; the grid requirement (7×N cells, muted-tone presence marks, today underline, sun-start week) is simple enough that a library would import an entire theming/interaction surface (range selection, multi-dot markers, its own color system) that fights DESIGN.md's fully custom, minimal, three-typography-tier system. Every other date computation in this repo is hand-rolled via `Intl.DateTimeFormat` for exactly this reason. |
| `Gesture.Pan()` (react-native-gesture-handler Gesture API) | `PanResponder` (React Native core) | Rejected: `PanResponder` runs entirely on the JS thread and cannot drive Reanimated shared values without a bridge round-trip per touch move — this directly conflicts with the scrubber spec's "실시간 1:1 추적" (real-time 1:1 tracking) and "모멘텀 없음" requirements, which need worklet-thread precision. `Gesture.Pan()` is already the library installed and used (via `ReanimatedSwipeable`) in this exact codebase. |
| Hand-rolled `View`/`Pressable` grouped-list UI for Settings | `@expo/ui`'s SwiftUI `List`/`Section`/`Picker`/`Switch` (installed, ~57.0.13, currently unused anywhere in `src/`) | Rejected for this phase: `@expo/ui`'s SwiftUI primitives render with native iOS system colors/backgrounds (`Host` + `List` uses the OS grouped-list gray, not DESIGN.md's `#F4F1EA`/`#FBFAF6` warm palette), and no other screen in this app uses native SwiftUI components — every screen is a custom-styled RN `View`/`Pressable` tree using `theme/tokens.ts`. Introducing `@expo/ui` here would be the only screen in the app with native-OS chrome, breaking the "personal field log" aesthetic consistency DESIGN.md defines as the entire point. **This is a case where the modern/idiomatic library choice is wrong for this specific codebase's established conventions — flag for the planner, not a default recommendation to disable.** |
| SQLite `app_settings` table | `AsyncStorage` / `expo-secure-store` for notification frequency | Rejected: Phase 3 (03-CONTEXT.md D-03/D-04) already made this exact decision for `drafts` — SQLite over AsyncStorage — specifically so all local state lives in one durable, inspectable store with the existing migration discipline. Introducing a second storage mechanism for one small settings blob would fragment the persistence story for no benefit. |

**Installation:** None required — no `npm install` needed for this phase.

**Version verification:** All versions above pulled directly from the repo's `package.json` (2026-09-01) via `cat package.json`, not from training-data assumption. `@expo/ui` (~57.0.13) confirmed installed via `find node_modules/@expo/ui` — present but zero references in `src/` confirmed via `grep -rln "@expo/ui" src/`.

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** Every library referenced above is already present in `package.json` and already `npm install`ed in `node_modules` (verified by direct filesystem inspection). The Package Legitimacy Gate (slopcheck + registry verification) is therefore not applicable — there is nothing new to audit. If a planner discovers mid-plan that a new package is actually needed (e.g., a calendar library), that package must go through the full audit protocol before being added to a plan, and should not be assumed pre-approved by this research.

## Architecture Patterns

### System Architecture Diagram

```
RootTabNavigator (existing, (tabs)/_layout.tsx)
│
├── 오늘 탭 — Stack ((tabs)/index/_layout.tsx, EXISTS)
│    ├─ index.tsx (Today view, EXISTS)
│    │    └─ [NEW] hamburger icon (top area, alongside banner stack)
│    │         └─ router.push → settings route (same stack ⇒ tab bar visible for free)
│    ├─ [id].tsx (Checkin detail, EXISTS — tab bar visible, no code change needed)
│    └─ [NEW] settings.tsx
│         ├─ reads app_settings row (SQLite) on mount
│         ├─ "알림 빈도" row → ActionSheetIOS (3 options) → write app_settings
│         │     → applyNotificationSettings(newSettings, defaultNotificationDeps)
│         ├─ "하루 마무리 알림 토글" row → Switch → write app_settings
│         │     → applyNotificationSettings(newSettings, defaultNotificationDeps)
│         └─ "버전" row → Constants.expoConfig?.version (read-only, no chevron)
│
└── 캘린더 탭 — Stack ([NEW] (tabs)/calendar/_layout.tsx, replaces flat calendar.tsx)
     ├─ [NEW] index.tsx (month grid — becomes the tab's home; tab bar visible by default)
     │    ├─ query: per-month checkin-presence (new lightweight SQLite read)
     │    ├─ swipe (Pan gesture) + header arrow buttons → change visible month
     │    ├─ today cell → accent underline
     │    ├─ presence cells → colors.textMuted (has record) / colors.textFaint (no record)
     │    └─ any date tap → router.push to [date].tsx
     └─ [NEW] [date].tsx (past-date view — MUST explicitly hide tab bar)
          ├─ on mount: navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })
          │    cleanup on unmount: restore { display: 'flex' }  (or undefined)
          ├─ MapView + read-only bottom sheet, reusing getTodayCheckins(db, dateFromParam)
          ├─ NO checkin button rendered (unlike Today view)
          ├─ row tap → router.push to CheckinDetailScreen route (existing [id].tsx pattern,
          │    reused via a thin route wrapper the same way (tabs)/index/[id].tsx does)
          └─ [NEW] DateScrubber floating card (132pt above bottom, only if ≥2 distinct
               checkin dates exist across all history)
               ├─ Gesture.Pan() onBegin (runOnJS) → force bottomSheetRef.snapToIndex(0)
               ├─ onUpdate (worklet) → shared value tracks drag offset, hard-clamped
               │    between [earliestCheckinDate, today] — no rubber-banding
               └─ onChange of resolved date (runOnJS, debounced-by-frame not by timer)
                    → router.setParams / state update → re-query getTodayCheckins
```

### Recommended Project Structure

```
src/app/(tabs)/
├── _layout.tsx                  # UNCHANGED (Tabs shell, already registers "calendar" segment)
├── index/
│   ├── _layout.tsx              # UNCHANGED (Stack: index, [id])
│   ├── index.tsx                # MODIFIED — add hamburger icon + push to settings
│   ├── [id].tsx                 # UNCHANGED (thin wrapper, already reusable)
│   └── settings.tsx             # NEW — thin route wrapper, same pattern as [id].tsx
└── calendar/                    # NEW folder (calendar.tsx flat file is DELETED)
    ├── _layout.tsx              # NEW — Stack: index, [date]
    ├── index.tsx                # NEW — thin wrapper around CalendarGridScreen
    └── [date].tsx               # NEW — thin wrapper around PastDateScreen

src/calendar/                    # NEW module directory (mirrors src/checkin/, src/today/)
├── CalendarGridScreen.tsx       # month grid presentational component
├── PastDateScreen.tsx           # read-only map+sheet, reuses TodayBottomSheet-style rendering
├── DateScrubber.tsx             # floating gesture card
├── monthGrid.ts                 # pure date-math functions (Intl-based, mirrors localDate.ts)
├── content.ts                   # CALENDAR_COPY constants (mirrors today/content.ts)
└── __tests__/ (or co-located .test.ts files, matching repo convention)

src/settings/                    # NEW module directory
├── SettingsScreen.tsx           # grouped-list presentational component
├── settingsRepo.ts              # SQLite read/write for app_settings row
└── content.ts                   # SETTINGS_COPY constants

src/checkin/checkinRepo.ts        # UNCHANGED — getTodayCheckins(db, localDateKey) reused as-is
src/notifications/scheduling.ts   # UNCHANGED — applyNotificationSettings(settings, deps) reused as-is
src/notifications/config.ts       # UNCHANGED (type NotificationSettings reused for app_settings shape)
src/db/schema.ts                  # MODIFIED — add CREATE_APP_SETTINGS_TABLE_SQL
src/db/migrations.ts              # MODIFIED — DATABASE_VERSION 2 → 3, append new if-block
src/app/_layout.tsx               # MODIFIED — runForegroundNotificationCheck(persistedSettings)
```

### Pattern 1: Thin route wrapper + presentational screen component (already established, Phase 5)

**What:** Route files under `src/app/` do nothing but read params/context and render a screen component that lives outside `src/app/`.
**When to use:** Every new route this phase adds (`calendar/index.tsx`, `calendar/[date].tsx`, `index/settings.tsx`).
**Example:**
```typescript
// Source: src/app/(tabs)/index/[id].tsx (existing, verified in this repo)
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckinDetailScreen } from '../../../checkin/CheckinDetailScreen';

export default function CheckinDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  return <CheckinDetailScreen db={db} checkinId={id} />;
}
```
The past-date route (`calendar/[date].tsx`) should follow this exact shape, passing the `date` param and `db` into a `PastDateScreen` component that lives in `src/calendar/`.

### Pattern 2: Nested Stack inside a Tab (already established, Phase 5, 05-RESEARCH.md Pattern 1)

**What:** Each tab that needs push navigation while keeping the tab bar visible gets its own `_layout.tsx` (a `Stack`) inside its own folder. The root `Tabs` screenOptions sets `headerShown: false`, but this per-tab `Stack` is a *separate instance* that does not inherit that — every screen inside it must set `headerShown` explicitly.
**When to use:** The calendar tab needs exactly this (`calendar/_layout.tsx` wrapping `index` + `[date]`), mirroring what `(tabs)/index/_layout.tsx` already does for the Today tab.
**Pitfall carried over from 05-RESEARCH.md Pitfall 2:** Forgetting `headerShown: false` on the grid's own `index` screen produces an unwanted empty native nav bar at the top of the month grid.

### Pattern 3: Hiding the tab bar on one specific pushed screen

**What:** By default, every screen inside a tab's nested `Stack` keeps the parent `Tabs` bar visible (this is what Pattern 2 gives you for free, and is exactly what Phase 6 wants for the settings screen and for the calendar grid home). The **past-date view is the one screen in this phase that needs the opposite** — CONTEXT.md D-07/canonical_refs are explicit that it must hide the tab bar, unlike the checkin-detail screen.
**When to use:** Only `calendar/[date].tsx`.
**Example (imperative override — the correct approach for this codebase; see rationale below):**
```typescript
// Pattern verified against react-navigation.org "Hiding tab bar in screens" docs
// and github.com/expo/router discussions #313/#901 (2026-09-01 WebSearch/WebFetch).
import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';

useLayoutEffect(() => {
  const parent = navigation.getParent();
  parent?.setOptions({ tabBarStyle: { display: 'none' } });
  return () => {
    parent?.setOptions({ tabBarStyle: { display: 'flex' } });
  };
}, [navigation]);
```
**Why the imperative override, not the "officially recommended" restructure:** React Navigation's current docs recommend *avoiding* this imperative pattern by restructuring so the `Stack` wraps the `Tabs` (tab bar disappears automatically outside the tab tree) instead of `Tabs` wrapping per-tab `Stack`s. That restructure is the architecturally "cleaner" answer in a greenfield app, but **this codebase already committed to the opposite structure in Phase 5** (`Tabs` wrapping nested per-tab `Stack`s, explicitly citing "Expo 공식 문서 nesting a stack navigator inside of a tab" as the chosen pattern) specifically so the checkin-detail screen and (now) the settings screen keep the tab bar visible by default. Restructuring now would touch every existing route and re-litigate a decision Phase 5 already shipped and tested. The imperative `getParent().setOptions()` override, scoped to the one screen that needs to diverge, is the smaller, consistent, lower-risk change — and it is still a documented, supported pattern, just not React Navigation's newest "if starting fresh" recommendation. [CITED: reactnavigation.org/docs/hiding-tabbar-in-screens, github.com/expo/router discussions #313/#901]

### Pattern 4: Force-collapse the bottom sheet on scrubber touch

**What:** `calendar-date-scrubber.md` Task T1 (CRITICAL, already CLEARED) requires the sheet to snap to CLOSED the instant the scrubber is touched, using the *same* 220ms snap animation already defined in `motion.bottomSheetSnapMs`.
**When to use:** `PastDateScreen`'s scrubber `Gesture.Pan().onBegin(...)`.
**Example:**
```typescript
// @gorhom/bottom-sheet exposes an imperative ref API (snapToIndex/close) — this is
// the standard mechanism for parent-driven sheet control, distinct from the
// animatedPosition SharedValue this repo already uses for read-only position tracking
// (src/today/TodayBottomSheet.tsx). CLOSED is snap index 0 in the existing snapPoints
// array convention ([closedPeak, openPeak]).
const bottomSheetRef = useRef<BottomSheet>(null);

const panGesture = Gesture.Pan()
  .onBegin(() => {
    'worklet';
    runOnJS(collapseSheet)();
  })
  .onUpdate((event) => {
    'worklet';
    // hard clamp — no rubber-banding (calendar-date-scrubber.md Premise 10)
    dragOffset.value = clamp(event.translationX, minOffset, maxOffset);
  });

function collapseSheet() {
  bottomSheetRef.current?.snapToIndex(0);
}
```
[CITED: @gorhom/bottom-sheet ref API is the same library already imported and used in `src/today/TodayBottomSheet.tsx` — imperative ref control (`snapToIndex`/`close`) is documented core API, distinct from the `animatedPosition` prop this repo already consumes read-only.]

### Pattern 5: Single-row settings table (mirrors the `drafts` pattern)

**What:** `src/db/schema.ts`'s `drafts` table uses a fixed literal primary key (`DRAFT_ROW_ID = 'draft'`) so there is always exactly one row, upserted via `INSERT OR REPLACE`. `app_settings` should follow the identical shape.
**Example:**
```sql
-- New in src/db/schema.ts, following CREATE_DRAFTS_TABLE_SQL's exact convention
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  checkin_frequency TEXT NOT NULL,
  daily_reflection_enabled INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
```
```typescript
// src/db/migrations.ts — append-only, never edit prior blocks (migration_discipline #2)
if (currentDbVersion === 2) {
  await db.execAsync(CREATE_APP_SETTINGS_TABLE_SQL);
  currentDbVersion = 3;
}
```
Default row (`checkin_frequency: 'hourly'`, `daily_reflection_enabled: 1`) should be seeded on first read-if-missing (mirrors how `PHASE2_NOTIFICATION_SETTINGS` currently hardcodes the same defaults), not inserted unconditionally at migration time — keeps the migration a pure schema change, consistent with every existing migration block in this file.

### Anti-Patterns to Avoid

- **Writing a new `getCheckinsByDate` that duplicates `getTodayCheckins`'s SQL:** The existing function already takes an arbitrary `localDateKey`; its own comment says Phase 6 reuses it verbatim. Do not fork the query.
- **Using `PanResponder` or manual `onTouchMove` math for the scrubber:** breaks the "real-time 1:1, no momentum" requirement and duplicates what `Gesture.Pan()` + Reanimated already solve, and diverges from the one gesture pattern already proven in this codebase.
- **Reaching for `@expo/ui`'s native `List`/`Section` for the settings screen just because it exists in `package.json`:** it is unused elsewhere in this app for a design-system reason (native colors clash with the custom warm palette), not because nobody got to it yet.
- **Storing notification frequency in `AsyncStorage`:** contradicts the Phase 3 SQLite-over-AsyncStorage decision (03-CONTEXT.md D-03) and fragments persistence into two stores for no reason.
- **Modifying the existing `if (currentDbVersion === 0)` / `=== 1` migration blocks instead of appending a new `=== 2` block:** violates `migrations.ts`'s explicit, commented discipline rule and would break already-migrated installs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cancel-old / register-new notification triggers on frequency change | A bespoke diff-and-reschedule routine in the settings screen | `applyNotificationSettings(settings, deps)` from `src/notifications/scheduling.ts` (already implements cancel-before-register ordering, orphan-safety via `ALL_MANAGED_IDS`) | Reimplementing this risks reintroducing the exact orphaned-trigger bug Phase 2's Eng review already found and fixed (Codex-caught, documented in footlog-product-design.md T2 verify notes) |
| "Which dates in this month have a checkin" | A per-day loop calling `getTodayCheckins` 28-31 times | One range query (`WHERE local_date_key BETWEEN ? AND ?`, reusing the existing `idx_checkins_local_date_key` index) returning distinct date keys for the visible month | The index already exists for exactly this access pattern; N sequential single-day queries would be needlessly slow and is the kind of hand-rolled inefficiency this repo's query-sharing convention (04-CONTEXT.md D-11) exists to avoid |
| Local date / timezone math for the grid and scrubber range (first-checkin-date ↔ today) | Manual `Date` arithmetic / UTC offset math | `Intl.DateTimeFormat` via the existing `src/checkin/localDate.ts` conventions, extended with new pure functions in a new `src/calendar/monthGrid.ts` | `localDate.ts`'s own header comment states this rule explicitly and cites the exact same midnight-boundary bug class this column (`local_date_key`) was created to prevent |
| Continuous drag-to-scrub gesture | Custom `onTouchMove`/`onTouchEnd` handlers on a `View` | `react-native-gesture-handler`'s `Gesture.Pan()` API, worklet-driven | Already the installed, root-wrapped (`GestureHandlerRootView`), and proven-in-this-repo gesture library; raw touch handlers on the JS thread cannot reliably keep up with 1:1 drag tracking at 60fps |
| App version display | Hardcoding `"1.0.0"` as a string literal in the settings screen | `Constants.expoConfig?.version` (`expo-constants`, already installed) | `app.json`'s `expo.version` is the single source of truth; hardcoding would drift on the next version bump |

**Key insight:** Every "don't hand-roll" item in this phase is not "use an external library instead of writing code" — it is "reuse code Phase 2–5 of *this exact repo* already wrote and tested for this exact problem." The phase's real risk is not missing an external tool, it's re-deriving something that already exists two directories over.

## Common Pitfalls

### Pitfall 1: Breaking the tab-bar-visibility default without realizing it's a default
**What goes wrong:** A developer might explicitly add `tabBarStyle: {display:'none'}` logic to the settings screen or the calendar grid home screen "to be safe," or forget to add it to the past-date view.
**Why it happens:** The spec text ("탭바 숨김" for past-date view, "탭바 노출" for everything else) reads like three separate rules, but only one of the three screens actually requires code — the other two get tab-bar-visible for free from Pattern 2's default nested-stack behavior.
**How to avoid:** Only `calendar/[date].tsx` gets the `getParent().setOptions()` override + cleanup. Verify by checking the settings screen and calendar grid home render *no* tab-bar-manipulation code at all.
**Warning signs:** Any `tabBarStyle` reference outside `calendar/[date].tsx`.

### Pitfall 2: The two existing regression tests that must be intentionally edited, not just extended
**What goes wrong:** `src/app/__tests__/tabs-wiring.test.ts` Test 13 (asserts `calendar.tsx` has no `Pressable`/`useState`/`FlatList`/`TouchableOpacity`/`SectionList`) and Test 14 (asserts neither Today index nor tabs layout contain `headerRight`/`settings`/`≡`) will fail the moment Phase 6's own required work lands, because they were written as Phase 4 scope-boundary guards that explicitly named Phase 6 as the phase that would later invalidate them.
**Why it happens:** These are deliberate "fence" tests from a prior phase, not incidental breakage — their own docstrings say "D-07"/"D-08" boundary, and D-08 in `04-CONTEXT.md` literally reads "설정 진입점(햄버거 ≡)은 이 phase에서 만들지 않는다."
**How to avoid:** Plan an explicit task to update these two `describe` blocks (not delete the whole file — Tests 1–12, 15–18 remain valid contracts for the tab shell itself) as part of the calendar-grid/settings-entry-point plan, with new assertions replacing the "must not exist" checks (e.g., Test 13 becomes "calendar.tsx routes correctly delegate to CalendarGridScreen" and Test 14 becomes "Today index renders a hamburger button that pushes to settings").
**Warning signs:** CI red on `tabs-wiring.test.ts` after implementing the grid or the hamburger icon, with no corresponding task in the plan to touch that test file.

### Pitfall 3: Confusing the confirm-pin drag pattern with a reusable gesture abstraction
**What goes wrong:** Assuming the existing "draggable pin" gesture code in `(tabs)/index/index.tsx` (`Marker draggable={...} onDragEnd={handleDragEnd}`) is a gesture-handler pattern that can be adapted for the scrubber.
**Why it happens:** Both are "drag something on screen" interactions, so they sound related.
**How to avoid:** The confirm-pin drag is `react-native-maps`'s own native `Marker` drag API (`onDragEnd` fires once, at drag end, with a final coordinate) — it has no relationship to `react-native-gesture-handler` and provides no real-time intermediate positions. The scrubber needs continuous, real-time, worklet-level tracking, which only `Gesture.Pan()` provides. The actually-relevant precedent in this codebase is `CheckinListRow.tsx`'s `ReanimatedSwipeable` (which *is* built on `react-native-gesture-handler`), even though it's a higher-level wrapper (open/close swipe, not continuous scrub) and can't be reused directly either — it just proves the underlying library/pattern is already working end-to-end in this app.
**Warning signs:** Any attempt to extend `MarkerDragStartEndEvent` handling for the scrubber.

### Pitfall 4: Settings screen section-header color drifting into a third accent use
**What goes wrong:** The approved settings mockup (`settings-and-delete-20260822/settings-screen.png`) renders section headers ("알림"/"데이터"/"정보") in a warm olive-brown tone that visually resembles `colors.accent` (`#7C8660`). DESIGN.md's accent budget is locked to exactly two approved uses for this phase (today-underline, scrubber-selection-indicator) — a third use anywhere (including "just section headers, not really UI chrome") would violate the explicit "accent 예산" rule that Phase 4's `_layout.tsx` and Phase 5's swipe-delete both had to specifically avoid drifting into.
**Why it happens:** The mockup predates the 2026-08-23/08-31 accent-budget lock-down decisions (mockup made 2026-08-22); its color choices are not automatically still valid.
**How to avoid:** Render section headers with `colors.textMuted` (`#79786F`), which is close enough in warmth/darkness to visually match the mockup's intent without adding a third accent use.
**Warning signs:** Any `colors.accent` reference outside the month-grid today-underline and the scrubber's selection indicator.

### Pitfall 5: `runForegroundNotificationCheck()` silently continuing to use the hardcoded default
**What goes wrong:** Phase 6 builds the settings screen, persists frequency changes, and calls `applyNotificationSettings` from the settings screen itself — but `src/app/_layout.tsx`'s foreground self-heal (which runs on every cold start and app-foreground event) still calls `runForegroundNotificationCheck()` with zero arguments, silently re-defaulting to `PHASE2_NOTIFICATION_SETTINGS` (`hourly`, reflection on). If the user set "3시간마다" or "끔" and then backgrounds/foregrounds the app, self-heal will treat the *old default* as "expected," see the user's actual triggers as orphaned, and cancel/replace them back to hourly.
**Why it happens:** This call site was correct for Phase 2 (no persisted settings existed yet) and nothing about its signature forces an update — it has an optional default parameter, so it keeps compiling and running without any code elsewhere breaking.
**How to avoid:** This phase MUST update `src/app/_layout.tsx`'s `runCheck` closure to read the persisted `app_settings` row (via a lightweight synchronous-enough read, or restructure to await it before calling) and pass it explicitly into `runForegroundNotificationCheck(settings)`.
**Warning signs:** Manually setting frequency to "끔" in the new settings screen, then backgrounding and foregrounding the app — if hourly notifications resume, this pitfall was not addressed.

### Pitfall 6: Assuming `hitSlop`/44×44pt on the scrubber is "already handled" because other tap targets in this app use `hitSlop`
**What goes wrong:** The scrubber's individual date ticks are visually a few px wide (density marks); `calendar-date-scrubber.md` T3 requires the *whole drag surface* to be 44×44pt, not each individual tick to have an expanded hit slop the way `SMALL_ICON_HIT_SLOP` works for discrete buttons elsewhere in this app.
**Why it happens:** `hitSlop` is the pattern this repo uses everywhere else for small tappable icons (`PIN_HIT_SLOP`, `SMALL_ICON_HIT_SLOP`), so it's an easy but wrong reflex to reach for the same tool here.
**How to avoid:** Size the scrubber's overall gesture-detector container (not individual ticks) to at least 44pt tall; individual tick marks remain thin visually but sit inside that one continuous touch surface.

## Code Examples

### Reusing `getTodayCheckins` for a past date (no new function needed)
```typescript
// Source: src/checkin/checkinRepo.ts lines 119-131 (verified in this repo, comment
// explicitly anticipates this reuse)
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]> {
  return db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC',
    localDateKey
  );
}
// Phase 6 usage in calendar/[date].tsx's screen component:
// const checkins = await getTodayCheckins(db, dateParam); // dateParam is already
// an en-CA (YYYY-MM-DD) string matching local_date_key's format, same as resolveLocalDateKey.
```

### Calling the existing settings-reconciliation function
```typescript
// Source: src/notifications/scheduling.ts (verified, already handles cancel-before-
// register ordering and ALL_MANAGED_IDS boundary safety)
import { applyNotificationSettings } from '../notifications/scheduling';
import { defaultNotificationDeps } from '../notifications/deps';

async function onFrequencyChanged(next: NotificationFrequency) {
  const settings = { ...currentSettings, checkinFrequency: next };
  await persistSettings(db, settings); // new settingsRepo.ts function
  await applyNotificationSettings(settings, defaultNotificationDeps);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| React Navigation "hide tab bar on push" via imperative `navigation.getParent().setOptions()` | Official docs now recommend restructuring navigation so `Stack` wraps `Tabs` (tab bar auto-hides outside the tab tree) | Current react-navigation.org docs (fetched 2026-09-01) | Not adopted this phase — this repo already committed to the older, still-supported imperative pattern in Phase 5; revisiting the structural choice is out of scope for a single-phase feature addition (see Pattern 3) |
| Reanimated bundling its own worklets runtime | Reanimated 4.x requires the separate `react-native-worklets` package | Reanimated 4.0 (already reflected in this repo's `package.json`: `react-native-reanimated@4.5.1` + `react-native-worklets@0.10.1` both present) | No action needed — already correctly installed; just a fact worth knowing when reading gesture-handler/reanimated interop code or docs that predate the split |

**Deprecated/outdated:** None directly relevant to this phase beyond the above — no code in this repo currently uses a deprecated API this phase would touch.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SF Symbol name for the hamburger icon is `line.3.horizontal` | Architecture Patterns / Code Examples | Low — if wrong, `SymbolView` silently renders nothing or a fallback glyph; easily caught in simulator visual check, one-line fix |
| A2 | The settings screen's "알림 빈도" row should use `ActionSheetIOS` (reusing the existing photo-picker pattern) rather than pushing to a dedicated picker sub-screen, despite the mockup showing a disclosure chevron that visually implies push navigation | Architecture Patterns Pattern 1 / Open Questions | Medium — if the planner/user wants literal chevron-push fidelity to the mockup, this adds one more route (`settings/frequency.tsx`) instead of an action sheet; not a rework, just an additional small screen |
| A3 | Settings screen section-header color should be `colors.textMuted`, not a new/expanded accent use | Common Pitfalls #4 | Low-medium — a wrong guess here is a one-line color swap, but getting it wrong risks tripping the same accent-budget review gate that caught Phase 5's swipe-delete color drift |
| A4 | The scrubber's "≥2 distinct checkin dates" visibility gate (calendar-date-scrubber.md Premise 11: hide scrubber entirely when 0-1 days have records) should be computed via a lightweight `COUNT(DISTINCT local_date_key)` query, not loaded from the full month-grid presence query | Architecture Patterns / System Diagram | Low — functionally equivalent either way; wrong choice just means a slightly less efficient query, not a behavior bug |

**If this table is empty:** N/A — see entries above. All other factual claims in this document are either verified directly against this repository's source files (via Read/Bash/Grep in this research session) or against `docs/designs/*.md` canonical specs already approved and CLEARED per their own GSTACK REVIEW REPORT sections.

## Open Questions

1. **Should "알림 빈도" be an `ActionSheetIOS` (3 options, no new route) or a pushed picker sub-screen (matching the mockup's disclosure-chevron visual literally)?**
   - What we know: The approved mockup shows a chevron-terminated row reading "매시간 >", which is the standard iOS "navigates to a sub-screen" visual convention. This codebase already has a working `ActionSheetIOS` pattern for an analogous 3-ish-option choice (photo source).
   - What's unclear: Whether visual fidelity to the (partially superseded — see A3) mockup matters more than avoiding a fourth new route for a phase that already adds several.
   - Recommendation: Default to `ActionSheetIOS` for implementation simplicity and pattern reuse (Assumption A2); the planner should confirm with the user/CONTEXT.md owner if literal chevron-push fidelity is required, since CONTEXT.md's `<specifics>` section calls the mockup "최종 승인 상태" for layout but the phase's `<decisions>` section left exact UI mechanics as Claude's discretion.

2. **Exact shape of the per-month "which dates have records" query — one query per visible month on navigation, or a wider prefetch?**
   - What we know: The existing `idx_checkins_local_date_key` index supports an efficient `BETWEEN` range query per month.
   - What's unclear: Whether swipe navigation between months should prefetch adjacent months for a snappier swipe feel, given `calendar-date-scrubber.md`'s own "낮은 스코프, 구현 중 조정 가능" (low-priority, adjust during implementation) framing for a closely related sizing question.
   - Recommendation: Start with a single per-visible-month query, re-fetched on each month change; only add prefetching if swipe feels laggy in simulator/device testing — do not pre-optimize.

## Environment Availability

Skipped — this phase has no new external service/tool dependency. All required native modules (`expo-sqlite`, `expo-notifications`, `expo-symbols`, `expo-constants`, `react-native-gesture-handler`, `react-native-reanimated`, `@gorhom/bottom-sheet`) are already installed, already linked into the existing iOS build (verified via `package.json` + `node_modules` presence), and already exercised by passing tests in Phases 1–5.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + `jest-expo` 57.0.4 [VERIFIED: package.json] |
| Config file | `package.json` `"test"` script: `NODE_OPTIONS=--experimental-sqlite jest` |
| Quick run command | `npm test -- <path/to/file>.test.ts` |
| Full suite command | `npm test` |

This repo's established testing convention (verified across `checkin-wiring.test.ts`, `checkin-detail-wiring.test.ts`, `tabs-wiring.test.ts`, `notification-wiring.test.ts`) is **static source analysis**: `@jest-environment node`, `fs.readFileSync` + `stripComments` (from `src/test-utils/stripComments.ts`), asserting on regex/string matches against route/component source text — not RN Testing Library render tests. Pure-logic modules (`db/migrations.ts`, `notifications/scheduling.ts`, date math) get real unit tests against `node:sqlite` (via `src/db/testing/nodeSqliteAdapter.ts`) or plain Jest assertions. Phase 6 should follow this exact split: new wiring/contract tests as static-source-analysis files, new pure functions (`monthGrid.ts`, `settingsRepo.ts`, `applyNotificationSettings` call sites) as real unit tests.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-calendar-grid | Month grid renders, today gets accent underline, presence gets muted/faint tone, tap navigates to `[date].tsx` | static source analysis + pure function unit test (grid math) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ❌ Wave 0 |
| REQ-past-date-view | `[date].tsx` renders read-only map+sheet, no checkin button, reuses `getTodayCheckins` | static source analysis (no-checkin-button regex guard) + existing `getTodayCheckins` unit tests already cover the query itself | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ❌ Wave 0 |
| REQ-date-scrubber | Hard clamp at range boundaries, 44×44pt hit surface, force-collapses sheet on touch, hidden when <2 record-dates | pure function unit test (clamp math) + static source analysis (hitSlop/dimension assertions, `snapToIndex` call presence) | `npm test -- src/calendar/DateScrubber.test.ts` | ❌ Wave 0 |
| REQ-settings-screen | 3 rows render, frequency change calls `applyNotificationSettings`, toggle default is ON, version reads `Constants.expoConfig?.version` | static source analysis + `settingsRepo.ts` unit test against `node:sqlite` | `npm test -- src/settings/settingsRepo.test.ts` `npm test -- src/app/__tests__/settings-wiring.test.ts` | ❌ Wave 0 |
| (regression) tabs-wiring Test 13/14 must be updated, not just left failing | Boundary-guard tests from Phase 4 must be edited to match Phase 6's now-intentional scope | static source analysis (existing file, modified) | `npm test -- src/app/__tests__/tabs-wiring.test.ts` | ✅ exists, needs edits (see Common Pitfalls #2) |

### Sampling Rate
- **Per task commit:** targeted `npm test -- <file>` for the file(s) touched
- **Per wave merge:** `npm test` (full suite) — this repo's suite already includes `NODE_OPTIONS=--experimental-sqlite`, required for the real-SQLite migration/repo tests
- **Phase gate:** Full suite green before `/gsd:verify-work`, with explicit manual confirmation that `tabs-wiring.test.ts` Tests 13/14 were *edited* (not accidentally left red, and not deleted wholesale)

### Wave 0 Gaps
- [ ] `src/db/migrations.test.ts` — extend for `DATABASE_VERSION` 3 (new `app_settings` table columns), following the existing `CHECKINS_COLUMNS`/`DAILY_REFLECTIONS_COLUMNS` array-assertion pattern
- [ ] `src/calendar/monthGrid.test.ts` — new, pure date-math (grid cell generation, week-starts-Sunday, month boundaries)
- [ ] `src/calendar/DateScrubber.test.ts` — new, clamp math + visibility-gate logic as pure functions (gesture callbacks themselves are not unit-testable without an RN render environment, per this repo's existing convention of keeping gesture logic thin wrappers around pure functions)
- [ ] `src/settings/settingsRepo.test.ts` — new, against `node:sqlite` test adapter, mirroring `src/checkin/draftRepo.test.ts`'s shape
- [ ] `src/app/__tests__/calendar-wiring.test.ts` — new, static source analysis for the new calendar routes
- [ ] `src/app/__tests__/settings-wiring.test.ts` — new, static source analysis for the new settings route + hamburger wiring
- [ ] Framework install: none — Jest/jest-expo already configured and passing

## Security Domain

`security_enforcement` not found as `false` in `.planning/config.json` — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-user local-only app (Phase 1 scope), no auth in this phase |
| V3 Session Management | No | N/A |
| V4 Access Control | No | Single-user local-only app |
| V5 Input Validation | Yes (narrow) | `checkin_frequency` written to SQLite must be constrained to the closed `NotificationFrequency` union (`'hourly' \| 'every3h' \| 'off'`) at the write site — TypeScript's closed union plus a small runtime guard (matching this repo's existing "no runtime validation library, closed union is enough" stance from `02-RESEARCH.md Security Domain V5`, cited in `scheduling.ts`'s own comment) is sufficient; do not introduce `zod`/`joi` for a 3-value enum |
| V6 Cryptography | No | No new cryptographic material in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via date-range query parameters (`BETWEEN ? AND ?` for month presence query) | Tampering | Parameterized `runAsync`/`getAllAsync` calls only (this repo's existing, unbroken convention — `checkinRepo.ts`'s header comment states SQL only lives in repo files, never string-interpolated with user input) |
| Deep-link / route param injection via `[date].tsx`'s `date` param | Tampering | Validate the incoming `date` param matches the `YYYY-MM-DD` shape before using it in a query; malformed input should fail closed (empty result / redirect) rather than being passed directly into SQL — same discipline already applied to `[id].tsx`'s `id` param handling |
| Notification content leaking user data (note/photo text) into lock-screen previews via a settings-driven content change | Information Disclosure | Not introduced by this phase — `scheduling.ts`'s `contentFor(id)` already derives notification body purely from `id`, never from checkin content; Phase 6 must not add a "preview your note in the reminder" feature without re-opening this control |

## Sources

### Primary (HIGH confidence — direct repository inspection, this session)
- `Read`/`Bash`/`Grep` of `.planning/phases/06-calendar-tab/06-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`
- `Read` of `docs/designs/calendar-date-scrubber.md` (full, CLEARED spec)
- `Read` of `docs/designs/calendar-multiselect-view.md` (full, T1a-in-scope subset identified)
- `Bash grep`/`sed` of `docs/designs/footlog-product-design.md` (T10, navigation section lines 228-267)
- `Read` of `DESIGN.md` (full Color/Typography/Layout/Motion/Decisions Log)
- `Read` of `src/checkin/checkinRepo.ts`, `src/checkin/localDate.ts`, `src/checkin/config.ts`, `src/checkin/CheckinDetailScreen.tsx`, `src/today/CheckinListRow.tsx`, `src/today/TodayBottomSheet.tsx`, `src/app/(tabs)/index/index.tsx`, `src/app/(tabs)/index/[id].tsx`, `src/app/(tabs)/index/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/calendar.tsx`, `src/app/_layout.tsx`, `src/db/schema.ts`, `src/db/migrations.ts`, `src/notifications/config.ts`, `src/notifications/registry.ts`, `src/notifications/scheduling.ts`, `src/notifications/deps.ts`, `src/notifications/permissions.ts`, `src/theme/tokens.ts`, `src/today/content.ts`, `src/app/__tests__/tabs-wiring.test.ts`, `src/app/__tests__/checkin-detail-wiring.test.ts`, `src/db/migrations.test.ts`
- `Bash cat package.json` — exact installed dependency versions
- `Read` of `~/.gstack/projects/FootLog2/designs/settings-and-delete-20260822/settings-screen.png` (approved mockup image, viewed directly this session)
- `Bash grep`/`find` confirming `@expo/ui` is installed but unreferenced anywhere in `src/`

### Secondary (MEDIUM confidence — WebSearch/WebFetch, verified against current official docs)
- [Hiding tab bar in screens | React Navigation](https://reactnavigation.org/docs/hiding-tabbar-in-screens/) — fetched and summarized this session; confirms both the imperative `getParent().setOptions()` pattern and the currently-preferred restructure alternative
- [Using Tabs inside of a Stack · expo/router Discussion #901](https://github.com/expo/router/discussions/901)
- [Hiding tab bar in specific screens · expo/router Discussion #313](https://github.com/expo/router/discussions/313)
- [Expo UI — List / Section / Picker docs](https://docs.expo.dev/versions/latest/sdk/ui/) — confirms `@expo/ui`'s SwiftUI `List`/`Section` render native SwiftUI, requiring `Host` wrapper, informing the "don't use it here" recommendation

### Tertiary (LOW confidence — training-data recall, not independently re-verified this session)
- SF Symbol name `line.3.horizontal` for the hamburger icon (Assumption A1) — standard, well-known SF Symbol name, but not confirmed against Apple's SF Symbols app/catalog in this session
- `Constants.expoConfig?.version` as the correct `expo-constants` accessor for `app.json`'s `expo.version` field — standard, stable Expo API, not independently re-fetched from expo-constants' current docs page this session (package version ~57.0.14 is recent enough that this basic accessor is very unlikely to have changed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed and already used in analogous ways in this exact repo; nothing to newly vet
- Architecture: HIGH for reused patterns (thin routes, nested stack, single-row settings table — all direct copies of shipped Phase 3–5 patterns); MEDIUM for the tab-bar-hiding override (verified against current official docs, but application to this specific screen involves a documented tradeoff, not a single obviously-correct answer)
- Pitfalls: HIGH — Pitfalls 1, 2, 5 are derived from direct reading of this repo's own comments/tests that explicitly name Phase 6 as their trigger condition, not speculation
- Package legitimacy: N/A — no new packages

**Research date:** 2026-09-01
**Valid until:** 30 days (stable, mature internal codebase; no fast-moving external dependency drives this estimate down) — but re-verify the `runForegroundNotificationCheck()` wiring status immediately before planning if any other phase work touches `src/app/_layout.tsx` in the interim, since Pitfall 5 depends on its current zero-argument call site remaining unchanged.
