# Phase 6: Calendar Tab - Pattern Map

**Mapped:** 2026-09-01
**Files analyzed:** 19 (new/modified, excluding pure-doc files)
**Analogs found:** 18 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` (MODIFIED — add `CREATE_APP_SETTINGS_TABLE_SQL` + `AppSettingsRow`) | model | CRUD | `CREATE_DRAFTS_TABLE_SQL` + `DraftRow` (same file, lines 79-113) | exact |
| `src/db/migrations.ts` (MODIFIED — version 2→3) | migration | batch | same file's existing `currentDbVersion === 1` block (lines 37-40) | exact |
| `src/settings/settingsRepo.ts` (NEW) | service (repo) | CRUD (single-row upsert) | `src/checkin/draftRepo.ts` | exact |
| `src/settings/settingsRepo.test.ts` (NEW) | test | CRUD | `src/checkin/draftRepo.test.ts` | exact |
| `src/settings/content.ts` (NEW) | config (copy constants) | — | `src/today/content.ts` | exact |
| `src/settings/SettingsScreen.tsx` (NEW) | component (screen) | request-response (read-on-mount, write-on-change) | `src/checkin/CheckinDetailScreen.tsx` (props shape) + `src/app/(tabs)/index/index.tsx` (ActionSheetIOS usage) | role-match |
| `src/app/(tabs)/index/settings.tsx` (NEW) | route (thin wrapper) | request-response | `src/app/(tabs)/index/[id].tsx` | exact |
| `src/app/(tabs)/index/index.tsx` (MODIFIED — add hamburger icon + push) | component (screen) | event-driven | same file's existing recenter button block (`SymbolView` + `Pressable`, lines ~1239-1253) | exact |
| `src/app/(tabs)/index/_layout.tsx` (possibly MODIFIED — register `settings` screen) | route (nested stack layout) | — | same file (self — extend existing `[id]` registration pattern) | exact |
| `src/calendar/monthGrid.ts` (NEW) | utility (pure date math) | transform | `src/checkin/localDate.ts` | exact |
| `src/calendar/monthGrid.test.ts` (NEW) | test | transform | `src/checkin/localDate.test.ts` | exact |
| `src/calendar/content.ts` (NEW) | config (copy constants) | — | `src/today/content.ts` | exact |
| `src/calendar/CalendarGridScreen.tsx` (NEW) | component (screen) | CRUD (read presence query) | `src/app/(tabs)/index/index.tsx` (screen shell, query-on-mount/focus) | role-match |
| `src/calendar/PastDateScreen.tsx` (NEW) | component (screen) | request-response (read-only map+sheet) | `src/app/(tabs)/index/index.tsx` (map+sheet composition) + `src/today/TodayBottomSheet.tsx` (sheet) | role-match |
| `src/calendar/DateScrubber.tsx` (NEW) | component (gesture) | event-driven (drag) | `src/today/CheckinListRow.tsx` (`ReanimatedSwipeable`/gesture-handler usage) | partial (nearest available gesture precedent, per RESEARCH.md Pitfall 3) |
| `src/calendar/DateScrubber.test.ts` (NEW) | test | transform (clamp math) | `src/checkin/fallbackLocation.test.ts`-style pure function test | partial |
| `src/app/(tabs)/calendar/_layout.tsx` (NEW, replaces flat `calendar.tsx`) | route (nested stack layout) | — | `src/app/(tabs)/index/_layout.tsx` | exact |
| `src/app/(tabs)/calendar/index.tsx` (NEW) | route (thin wrapper) | request-response | `src/app/(tabs)/index/[id].tsx` | exact |
| `src/app/(tabs)/calendar/[date].tsx` (NEW) | route (thin wrapper + tab-bar-hide effect) | request-response | `src/app/(tabs)/index/[id].tsx` (wrapper shape) — tab-bar-hide effect has **no existing analog in this repo** | partial |
| `src/app/_layout.tsx` (MODIFIED — pass persisted settings into `runForegroundNotificationCheck`) | provider (root wiring) | event-driven | same file's existing `runCheck` `useEffect` (lines 50-62) | exact |
| `src/app/__tests__/tabs-wiring.test.ts` (MODIFIED — edit Test 13 & Test 14) | test | — | same file (self) | exact |
| `src/app/__tests__/calendar-wiring.test.ts` (NEW) | test | — | `src/app/__tests__/tabs-wiring.test.ts` (static source analysis technique) | exact |
| `src/app/__tests__/settings-wiring.test.ts` (NEW) | test | — | `src/app/__tests__/tabs-wiring.test.ts` | exact |
| `src/db/migrations.test.ts` (MODIFIED — extend for v3) | test | batch | same file (self, extend existing version-block assertions) | exact |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD) — add `app_settings` table

**Analog:** `src/db/schema.ts` lines 79-113 (`DraftRow` + `CREATE_DRAFTS_TABLE_SQL`) — same file, same "fixed-PK single-row" shape.

**Row type + DDL pattern to copy** (`src/db/schema.ts` lines 81-113):
```typescript
export interface DraftRow {
  id: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  location_source: LocationSource;
  local_date_key: string;
  timezone_at_capture: string;
  created_at: string;
  updated_at: string;
}

export const CREATE_DRAFTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy_meters REAL,
    location_source TEXT NOT NULL,
    local_date_key TEXT NOT NULL,
    timezone_at_capture TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
```
**Apply as** (per RESEARCH.md Pattern 5, already drafted there — reuse verbatim structure):
```typescript
export interface AppSettingsRow {
  id: string;
  checkin_frequency: string; // NotificationFrequency union, validated at write site
  daily_reflection_enabled: number; // 0/1, SQLite has no boolean type
  updated_at: string;
}

export const CREATE_APP_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    checkin_frequency TEXT NOT NULL,
    daily_reflection_enabled INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
```
No index needed (single-row table, same rationale as `drafts`).

---

### `src/db/migrations.ts` (migration, batch) — DATABASE_VERSION 2→3

**Analog:** same file's existing `currentDbVersion === 1` block (lines 37-40).

**Pattern to copy** (lines 16-45):
```typescript
export const DATABASE_VERSION = 2; // → bump to 3

if (currentDbVersion === 1) {
  await db.execAsync(CREATE_DRAFTS_TABLE_SQL);
  currentDbVersion = 2;
}

// 다음 phase에서 컬럼/테이블 추가가 필요하면 여기에 새 블록을 append한다:
// if (currentDbVersion === 2) { await db.execAsync('ALTER TABLE ...'); currentDbVersion = 3; }
// 이전 버전 블록 두 개(위쪽 두 개의 if문)는 절대 사후 수정하지 않는다.
```
**Apply as:** append a NEW `if (currentDbVersion === 2) { await db.execAsync(CREATE_APP_SETTINGS_TABLE_SQL); currentDbVersion = 3; }` block. Do **not** touch the `=== 0` or `=== 1` blocks (migration_discipline rule, explicitly commented in the file itself).

---

### `src/settings/settingsRepo.ts` (service/repo, CRUD)

**Analog:** `src/checkin/draftRepo.ts` (full file, single-row upsert/read pattern).

**Imports pattern** (lines 18-20):
```typescript
import type { MigratableDb } from '../db/migrations';
import type { DraftRow, LocationSource } from '../db/schema';
import { DRAFT_ROW_ID } from './config';
```

**Core upsert pattern** (lines 32-56):
```typescript
export async function upsertDraft(db: MigratableDb, input: DraftInput): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO drafts (
       id, lat, lng, accuracy_meters, location_source, local_date_key,
       timezone_at_capture, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    DRAFT_ROW_ID,
    input.lat, input.lng, input.accuracyMeters, input.locationSource,
    input.localDateKey, input.timezoneAtCapture, input.now, input.now
  );
}

export async function getDraft(db: MigratableDb): Promise<DraftRow | null> {
  const row = await db.getFirstAsync<DraftRow>(
    'SELECT * FROM drafts WHERE id = ?',
    DRAFT_ROW_ID
  );
  return row ?? null;
}
```
**Apply as:** `upsertSettings(db, settings)` (INSERT OR REPLACE into `app_settings` with a fixed row-id constant, e.g. `SETTINGS_ROW_ID = 'settings'` defined alongside `DRAFT_ROW_ID` convention — see `src/checkin/config.ts` line 66 for where that constant pattern lives) and `getSettings(db)` returning `AppSettingsRow | null`, using the identical `row ?? null` idiom (repo-wide convention, also seen in `checkinRepo.ts` line 116, `getCheckinById`).

**Default-row seeding note (RESEARCH.md Pattern 5):** Do NOT seed the default row unconditionally at migration time. Seed lazily: `getSettings()` returns `null` when no row exists yet; the caller (`SettingsScreen`/`_layout.tsx`) falls back to `PHASE2_NOTIFICATION_SETTINGS`-shaped defaults (`checkinFrequency: 'hourly'`, `dailyReflectionEnabled: true`) exactly like `src/notifications/config.ts` lines 33-42 already hardcodes, until the user changes something and the first `upsertSettings` call creates the row.

**SQL ownership rule (applies to this whole file):** all SQL strings live only in `settingsRepo.ts` — never in `SettingsScreen.tsx` (same rule stated in `checkinRepo.ts` header comment lines 4-6 and `draftRepo.ts` lines 4-5).

---

### `src/settings/settingsRepo.test.ts` (test, CRUD)

**Analog:** `src/checkin/draftRepo.test.ts` (full file).

**Pattern to copy** (lines 1-41):
```typescript
/**
 * @jest-environment node
 */
import { createTestDb } from '../db/testing/nodeSqliteAdapter';
import { migrateDbIfNeeded } from '../db/migrations';
import { upsertDraft, getDraft } from './draftRepo';

describe('draftRepo', () => {
  it('Test 1: upsertDraft 후 getDraft가 draft row를 반환한다', async () => {
    const { db, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);
      await upsertDraft(db, { /* ... */ });
      const draft = await getDraft(db);
      expect(draft).not.toBeNull();
      expect(draft?.id).toBe('draft');
    } finally {
      close();
    }
  });
});
```
**Apply as:** same `createTestDb()` + `migrateDbIfNeeded(db)` + try/finally `close()` scaffold, asserting `upsertSettings`/`getSettings` round-trip and the upsert-twice-still-one-row behavior (draftRepo.test.ts Test 2, lines 43-76, is the direct template for that assertion via `raw.prepare('SELECT COUNT(*) as c FROM app_settings')`).

---

### `src/settings/content.ts` (config, copy constants)

**Analog:** `src/today/content.ts` (full file).

**Pattern to copy** (lines 1-16):
```typescript
// Source: 04-UI-SPEC.md §Copywriting Contract — 문구를 여기서 발명하지 않고
// 승인된 문서에서 그대로 전사한다.
export const TODAY_COPY = {
  tabToday: '오늘',
  tabCalendar: '캘린더',
  calendarPlaceholder: '캘린더는 곧 추가돼요',
} as const;
```
**Apply as:** `SETTINGS_COPY` with row labels transcribed verbatim from the approved mockup (`settings-and-delete-20260822/settings-screen.png`) and `footlog-product-design.md` T10 — do not invent wording. `tabs-wiring.test.ts` Test 15/6 show this repo regression-tests that copy constants are referenced (not hardcoded) and transcribed exactly — a `settings-wiring.test.ts` test should do the same for `SETTINGS_COPY`.

---

### `src/settings/SettingsScreen.tsx` (component/screen, request-response)

**Analog (props shape):** `src/checkin/CheckinDetailScreen.tsx` lines 59-71.
**Analog (ActionSheetIOS usage):** `src/app/(tabs)/index/index.tsx` — `PHOTO_ACTION_SHEET_OPTIONS`/`PHOTO_ACTION_SHEET_CANCEL_INDEX`/`PHOTO_SOURCE_BY_ACTION_SHEET_INDEX` wiring (imported lines 79-84), and `src/checkin/photos.ts` lines 22-37 for how the options/cancel-index/index-to-value mapping constants are owned by a config-like module, not inlined in the screen.

**Props pattern to copy** (`CheckinDetailScreen.tsx` lines 59-71):
```typescript
export type CheckinDetailScreenProps = {
  db: MigratableDb;
  checkinId: string;
};

export function CheckinDetailScreen({ db, checkinId }: CheckinDetailScreenProps) {
  const navigation = useNavigation();
  const [checkin, setCheckin] = useState<CheckinRow | null>(null);
  const isMountedRef = useRef(true);
  // ...
}
```
**Apply as:** `SettingsScreenProps = { db: MigratableDb }` (no id param — single global settings row), load on mount with the same `isMountedRef` guard idiom used throughout this repo (`CheckinDetailScreen.tsx` line 76, `(tabs)/index/index.tsx` lines 280-285).

**ActionSheetIOS option-ownership pattern to copy** (`src/checkin/photos.ts` lines 29-37):
```typescript
export const PHOTO_ACTION_SHEET_OPTIONS = ['사진 촬영', '앨범에서 선택', '취소'] as const;
export const PHOTO_ACTION_SHEET_CANCEL_INDEX = 2;
export const PHOTO_SOURCE_BY_ACTION_SHEET_INDEX: readonly (PhotoSource | null)[] = [
  'camera',
  'library',
  null,
];
```
**Apply as (per RESEARCH.md Assumption A2, default recommendation):** a `FREQUENCY_ACTION_SHEET_OPTIONS`/`FREQUENCY_ACTION_SHEET_CANCEL_INDEX`/`FREQUENCY_BY_ACTION_SHEET_INDEX` triplet owned by `src/settings/content.ts` (mirrors this exact repo-wide "options array + cancel index + index→value map, never hardcode indices in the screen" convention), consumed the same way `(tabs)/index/index.tsx` consumes the photo triplet.

**Error handling / write flow:** call `applyNotificationSettings(settings, defaultNotificationDeps)` after `settingsRepo.upsertSettings` succeeds — copy `src/notifications/scheduling.ts` lines 114-142 call contract directly (do not reimplement cancel/register ordering, see Shared Patterns below).

---

### `src/app/(tabs)/index/settings.tsx` (route, thin wrapper)

**Analog:** `src/app/(tabs)/index/[id].tsx` (full file, 20 lines).

**Full pattern to copy verbatim (shape only)**:
```typescript
import { useSQLiteContext } from 'expo-sqlite';
import { SettingsScreen } from '../../../settings/SettingsScreen';

export default function SettingsRoute() {
  const db = useSQLiteContext();
  return <SettingsScreen db={db} />;
}
```
No `useLocalSearchParams` needed here (unlike `[id].tsx`) since settings has no route param — otherwise identical "route file does nothing but wire db + render screen component" contract (comment lines 5-10 of `[id].tsx` state this contract explicitly and anticipate exactly this kind of reuse).

---

### `src/app/(tabs)/index/index.tsx` (MODIFIED — add hamburger icon)

**Analog:** same file's own recenter-button block (lines 1239-1253) — nearest existing "small icon button, absolute-positioned, `SymbolView` + `Pressable`" precedent in this exact file.

**Pattern to copy**:
```typescript
import { SymbolView } from 'expo-symbols';
// ...
<Pressable
  onPress={handleRecenterPress}
  accessibilityRole="button"
  accessibilityLabel="현재 위치로 이동"
  style={styles.recenterButton}
>
  <SymbolView
    name={orientationMode === 'compass' ? 'location.north.line.fill' : 'location.fill'}
    tintColor={colors.pin}
  />
</Pressable>
```
**Apply as:** a hamburger `Pressable` + `SymbolView name="line.3.horizontal"` inside the existing `bannerStack`/top-of-screen area (lines 1183-1186 show the existing `insets.top`-padded top container: `<View style={[styles.bannerStack, { paddingTop: insets.top }]}>`), calling `router.push('/settings')` (same `router.push` import already present, line 36) on tap. Use `colors.textPrimary` or `colors.textMuted` tint — **not** `colors.accent` (accent-budget lock, DESIGN.md; also directly regression-tested by `tabs-wiring.test.ts` Test 10 pattern). Hit target: reuse the existing `SMALL_ICON_HIT_SLOP` constant from `CheckinDetailScreen.tsx` line 57 (or an equivalent 8px hitSlop) rather than inventing a new slop constant.

**Regression tests this change must satisfy/update:** `tabs-wiring.test.ts` Test 14 currently asserts `headerRight`/`settings`/`≡` do NOT appear in this file — this test must be edited (see below), and the hamburger implementation itself should avoid the literal `≡` character in code if the test is rewritten to check for a Symbol name instead (use `SymbolView name="line.3.horizontal"`, matching this repo's SF-Symbol-name convention rather than a Unicode glyph character).

---

### `src/calendar/monthGrid.ts` (utility, pure date math)

**Analog:** `src/checkin/localDate.ts` (full file).

**Header contract + `Intl`-only rule to copy** (lines 1-12):
```typescript
// 이 파일은 순수 함수 모듈이다 — 네이티브 모듈을 import하지 않으므로
// Node 테스트 환경(@jest-environment node)에서도 그대로 로드 가능하다.
//
// 수동 `Date` 파싱이나 UTC 오프셋 산수를 절대 쓰지 않는다 — Intl.DateTimeFormat이
// 타임존 변환을 전담한다.
```

**`en-CA` local-date-key pattern to copy** (lines 18-26):
```typescript
export function resolveLocalDateKey(
  date: Date,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}
```
**Apply as:** `monthGrid.ts` should import and reuse `resolveLocalDateKey`/`resolveTimeZone` from `localDate.ts` directly (do not re-derive date-key formatting), adding NEW pure functions on top: month-grid cell generation (7×N array, Sunday-first per D-06), "is today" check, and first-checkin-date↔today range clamp math for the scrubber. Follow the same "no native import, `@jest-environment node` testable" contract.

---

### `src/calendar/monthGrid.test.ts` (test, transform)

**Analog:** `src/checkin/localDate.test.ts` — pure function unit tests, no SQLite/RN dependency, `@jest-environment node` header, direct `expect(fn(input)).toBe(expected)` assertions per date-math function.

---

### `src/calendar/content.ts` (config, copy constants)

**Analog:** `src/today/content.ts` — same `export const X_COPY = { ... } as const;` shape, transcribed from canonical docs, never inlined literals in components (enforced repo-wide by `tabs-wiring.test.ts` Test 6/15 pattern).

---

### `src/calendar/CalendarGridScreen.tsx` (component/screen, CRUD read)

**Analog:** `src/app/(tabs)/index/index.tsx` — screen-owns-query-and-reload pattern (`reloadTodayCheckins` + `useFocusEffect`, lines 411-442).

**Query-on-focus pattern to copy**:
```typescript
const reloadTodayCheckins = useCallback(() => {
  getTodayCheckins(db, resolveLocalDateKey(new Date()))
    .then((rows) => { if (isMountedRef.current) setTodayCheckins(rows); })
    .catch((error) => { console.error("Failed to load today's check-ins", error); });
}, [db]);

useEffect(() => { reloadTodayCheckins(); }, [reloadTodayCheckins]);

useFocusEffect(
  useCallback(() => { reloadTodayCheckins(); }, [reloadTodayCheckins])
);
```
**Apply as:** a `reloadMonthPresence(visibleMonth)` that runs a single `BETWEEN ?  AND ?` range query (new function, likely `getCheckinDatesInRange` in `checkinRepo.ts` or a calendar-local repo — planner's discretion per RESEARCH.md Don't Hand-Roll table) re-triggered on month change and on `useFocusEffect`, never a per-day loop (RESEARCH.md Don't Hand-Roll: "N sequential single-day queries" explicitly called out as the anti-pattern to avoid).

---

### `src/calendar/PastDateScreen.tsx` (component/screen, request-response, read-only)

**Analog:** `src/app/(tabs)/index/index.tsx` (map+pin composition) + `src/today/TodayBottomSheet.tsx` (sheet component contract).

**Reused query (verbatim, no new function per RESEARCH.md discovery):**
```typescript
// src/checkin/checkinRepo.ts lines 123-131
export async function getTodayCheckins(
  db: MigratableDb,
  localDateKey: string
): Promise<CheckinRow[]> {
  return db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC',
    localDateKey
  );
}
```

**Sheet-as-prop-driven-component contract to copy** (`TodayBottomSheet.tsx` lines 30-49):
```typescript
export type TodayBottomSheetProps = {
  checkins: CheckinRow[];
  containerHeight: number;
  animatedPosition: SharedValue<number>;
  onRowPress: (id: string) => void;
  onDeleteRequest: (checkin: CheckinRow) => void;
};
```
**Apply as:** `PastDateScreen` reuses `TodayBottomSheet`-shaped rendering in read-only mode — per RESEARCH.md, no `onDeleteRequest`/swipe affordance (past-date rows are not deletable in this phase), no checkin button rendered at all. `onRowPress` still routes to the same `CheckinDetailScreen` via a thin wrapper route (see below), matching `(tabs)/index/index.tsx`'s `handleRowPress` (line 552-554):
```typescript
const handleRowPress = useCallback((id: string) => {
  router.push({ pathname: '/[id]', params: { id } });
}, []);
```

---

### `src/calendar/DateScrubber.tsx` (component/gesture, event-driven)

**Analog (gesture-handler precedent in this repo):** `src/today/CheckinListRow.tsx` `ReanimatedSwipeable` usage (lines 39-41, 83-103) — the only existing `react-native-gesture-handler`-based interaction in the codebase, even though it is a higher-level wrapper, not continuous drag (RESEARCH.md Pitfall 3 explicitly names this as the nearest, imperfect precedent, and explicitly warns AGAINST treating the `Marker draggable` pin-drag code in `(tabs)/index/index.tsx` as a gesture-handler analog — it is `react-native-maps`'s own native API, unrelated).

**Import pattern to copy (adapted, not identical API surface):**
```typescript
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
```
This import path confirms `react-native-gesture-handler` is already correctly linked and used from a component file in this exact directory tree (`src/today/`) — `DateScrubber.tsx` should instead import the lower-level `Gesture`/`GestureDetector` API directly (per RESEARCH.md Pattern 3/Architecture diagram; `ReanimatedSwipeable` itself is the wrong abstraction level for continuous 1:1 drag):
```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
```

**Hit-target sizing pattern to copy (adapted):** `SMALL_ICON_HIT_SLOP`/`PIN_HIT_SLOP` constants (`(tabs)/index/index.tsx` line 125, `CheckinDetailScreen.tsx` line 57) show the repo convention of naming a hit-slop constant near its usage with a comment justifying the pixel value — but per RESEARCH.md Pitfall 6, do NOT use `hitSlop` on individual ticks; instead size the whole gesture-detector container to ≥44pt, following the `LIST_ROW_MIN_HEIGHT = 44` sizing-constant convention (`CheckinListRow.tsx` line 51).

**Sheet-collapse-on-touch pattern (already in RESEARCH.md Pattern 4, reuse verbatim):**
```typescript
const bottomSheetRef = useRef<BottomSheet>(null);
const panGesture = Gesture.Pan()
  .onBegin(() => {
    'worklet';
    runOnJS(collapseSheet)();
  })
  .onUpdate((event) => {
    'worklet';
    dragOffset.value = clamp(event.translationX, minOffset, maxOffset);
  });
function collapseSheet() {
  bottomSheetRef.current?.snapToIndex(0);
}
```

---

### `src/calendar/DateScrubber.test.ts` (test, transform)

**Analog:** `src/checkin/fallbackLocation.test.ts`-style pure-function test (no RN render environment) — test only the extracted pure clamp/visibility-gate functions (e.g., `clampScrubOffset`, `shouldShowScrubber`), not the `Gesture.Pan()` callbacks themselves (RESEARCH.md Wave 0 Gaps explicitly states gesture callbacks are "thin wrappers around pure functions," consistent with this repo's established testing split).

---

### `src/app/(tabs)/calendar/_layout.tsx` (route, nested stack layout)

**Analog:** `src/app/(tabs)/index/_layout.tsx` (full file, 34 lines) — direct structural twin.

**Full pattern to copy (adapted names)**:
```typescript
import { Stack } from 'expo-router';

export default function TodayStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
    </Stack>
  );
}
```
**Apply as:** `CalendarStackLayout` with `<Stack.Screen name="index" options={{ headerShown: false }} />` and `<Stack.Screen name="[date]" options={{ headerShown: true }} />` (title set dynamically by `PastDateScreen` via `navigation.setOptions`, same as `CheckinDetailScreen.tsx` does — see its header comment lines 17-19 re: not statically titling in the layout). **Critical inherited pitfall:** this Stack does NOT inherit the root's `headerShown: false` (comment lines 8-11 of the analog explain why) — every screen must set it explicitly.

---

### `src/app/(tabs)/calendar/index.tsx` (route, thin wrapper)

**Analog:** `src/app/(tabs)/index/[id].tsx` shape (no params version, same as `settings.tsx` above).
```typescript
import { useSQLiteContext } from 'expo-sqlite';
import { CalendarGridScreen } from '../../../calendar/CalendarGridScreen';

export default function CalendarIndexRoute() {
  const db = useSQLiteContext();
  return <CalendarGridScreen db={db} />;
}
```

---

### `src/app/(tabs)/calendar/[date].tsx` (route, thin wrapper + tab-bar-hide)

**Analog (wrapper shape):** `src/app/(tabs)/index/[id].tsx` lines 11-19 (param read + db + render).
**No analog for the tab-bar-hide effect** — this repo has never hidden the tab bar on a pushed screen before (checkin-detail keeps it visible). RESEARCH.md Pattern 3 supplies the concrete snippet to use (verified against current react-navigation.org docs, not an internal analog):
```typescript
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
**Combine with wrapper pattern:**
```typescript
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { PastDateScreen } from '../../../calendar/PastDateScreen';

export default function PastDateRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  return <PastDateScreen db={db} dateKey={date} />;
}
```
**Security note (RESEARCH.md Security Domain):** validate `date` matches `YYYY-MM-DD` before passing into any query — same discipline as `[id].tsx`'s `id` param handling (fail closed, not string-interpolated into SQL).

---

### `src/app/_layout.tsx` (MODIFIED — read persisted settings for foreground self-heal)

**Analog:** same file's existing `runCheck` block (lines 50-62).

**Current pattern (to be modified in place)**:
```typescript
useEffect(() => {
  const runCheck = () => {
    runForegroundNotificationCheck().catch((error) => {
      console.error('[notifications] foreground check failed', error);
    });
  };
  runCheck();
  return subscribeToForegroundActive(runCheck);
}, []);
```
**Apply as:** `runCheck` must first `await getSettings(db)` (new `settingsRepo.ts` function) and pass the resolved settings (falling back to `PHASE2_NOTIFICATION_SETTINGS` shape if no row exists yet) into `runForegroundNotificationCheck(settings)`. This requires `runCheck` to become async and requires access to `db` — check `registry.ts`'s `runForegroundNotificationCheck` signature before assuming it currently takes zero args (RESEARCH.md Pitfall 5 flags this as the exact regression to avoid). Preserve the existing `.catch(console.error)` promise-not-swallowed convention and the "call once at mount + subscribe to foreground" structure unchanged.

---

## Shared Patterns

### Single-row settings table persistence
**Source:** `src/checkin/draftRepo.ts` (full file) + `src/db/schema.ts` lines 81-113 (`DraftRow`/`CREATE_DRAFTS_TABLE_SQL`)
**Apply to:** `src/settings/settingsRepo.ts`, `src/db/schema.ts`, `src/db/migrations.ts`
```typescript
// Fixed-PK, INSERT OR REPLACE upsert; SELECT ... WHERE id = ? read; row ?? null idiom.
```

### Notification settings reconciliation (do not reimplement)
**Source:** `src/notifications/scheduling.ts` lines 114-142 (`applyNotificationSettings`)
**Apply to:** `src/settings/SettingsScreen.tsx` (call site only), `src/app/_layout.tsx` (self-heal call site only)
```typescript
import { applyNotificationSettings } from '../notifications/scheduling';
import { defaultNotificationDeps } from '../notifications/deps';

async function onFrequencyChanged(next: NotificationFrequency) {
  const settings = { ...currentSettings, checkinFrequency: next };
  await settingsRepo.upsertSettings(db, settings);
  await applyNotificationSettings(settings, defaultNotificationDeps);
}
```
Cancel-before-register ordering and `ALL_MANAGED_IDS` orphan-safety are already solved — do not fork this logic.

### Copy-constants-only, no inline literals
**Source:** `src/today/content.ts` (full file) + `tabs-wiring.test.ts` Test 6/15 (regression enforcement pattern)
**Apply to:** `src/settings/content.ts`, `src/calendar/content.ts`, and every component consuming them
```typescript
export const X_COPY = { key: '<verbatim string from canonical doc>' } as const;
```
Static-source-analysis tests should assert `.toMatch(/X_COPY\.key/)` and `.not.toContain('<literal string>')` on the consuming file, exactly like Test 6/11/15 do today.

### Accent-budget lock (exactly 2 approved uses this phase)
**Source:** `src/theme/tokens.ts` line 17 comment + `tabs-wiring.test.ts` Test 10 (`colors.accent` must not appear in `_layout.tsx`)
**Apply to:** `src/calendar/CalendarGridScreen.tsx` (today-underline only), `src/calendar/DateScrubber.tsx` (selection-indicator only), and explicitly NOT `src/settings/SettingsScreen.tsx` section headers (use `colors.textMuted` per RESEARCH.md Pitfall 4/Assumption A3) nor the hamburger icon in `index.tsx` (use `colors.textPrimary`/`colors.textMuted`).

### Thin route wrapper / presentational screen split
**Source:** `src/app/(tabs)/index/[id].tsx` (full file) + `src/checkin/CheckinDetailScreen.tsx` lines 59-71 (props contract)
**Apply to:** every new route file this phase adds (`calendar/index.tsx`, `calendar/[date].tsx`, `index/settings.tsx`)
```typescript
export default function SomeRoute() {
  const db = useSQLiteContext();
  return <SomeScreen db={db} />;
}
```

### Static-source-analysis wiring tests
**Source:** `src/app/__tests__/tabs-wiring.test.ts` (full file, `@jest-environment node` + `fs.readFileSync` + `stripComments`)
**Apply to:** `calendar-wiring.test.ts`, `settings-wiring.test.ts`, and the required edits to `tabs-wiring.test.ts` Test 13 (currently asserts `calendar.tsx` has NO `Pressable`/`useState`/`FlatList` — must become an assertion that the new route delegates to `CalendarGridScreen`) and Test 14 (currently asserts NO `headerRight`/`settings`/`≡` in Today index/layout — must become an assertion that a hamburger button/push-to-settings DOES exist). These are intentional "fence" tests that Phase 4 wrote naming Phase 6 as their own trigger condition (see docstrings in the file) — edit them, do not delete or leave them red.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/app/(tabs)/calendar/[date].tsx` tab-bar-hide `useLayoutEffect` | route (behavior only) | event-driven | No screen in this codebase has ever hidden the tab bar on push before — every existing pushed screen (`[id].tsx`, and the new `settings.tsx`) keeps it visible by the nested-stack default. RESEARCH.md Pattern 3 supplies an external-doc-verified snippet instead of an internal analog. |
| `src/calendar/DateScrubber.tsx` continuous-drag gesture core | component (gesture) | event-driven | No continuous real-time `Gesture.Pan()` worklet-driven drag exists in this repo yet — `CheckinListRow.tsx`'s `ReanimatedSwipeable` only proves the underlying library is linked/working, not a directly reusable higher-level pattern (RESEARCH.md Pitfall 3). Use RESEARCH.md Pattern 4's code example as the primary reference instead. |

## Metadata

**Analog search scope:** `src/app/`, `src/checkin/`, `src/today/`, `src/notifications/`, `src/db/`, `src/theme/` (full repo `src/` tree, excluding `node_modules`)
**Files scanned (read in full or targeted range):** `src/checkin/checkinRepo.ts`, `src/checkin/draftRepo.ts`, `src/checkin/draftRepo.test.ts`, `src/checkin/localDate.ts`, `src/checkin/photos.ts`, `src/checkin/config.ts`, `src/checkin/CheckinDetailScreen.tsx` (partial), `src/db/schema.ts`, `src/db/migrations.ts`, `src/notifications/scheduling.ts`, `src/notifications/config.ts`, `src/notifications/deps.ts`, `src/theme/tokens.ts`, `src/today/content.ts`, `src/today/TodayBottomSheet.tsx`, `src/today/CheckinListRow.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/calendar.tsx`, `src/app/(tabs)/index/index.tsx` (partial, lines 1-915 + 1150-1280), `src/app/(tabs)/index/[id].tsx`, `src/app/(tabs)/index/_layout.tsx`, `src/app/_layout.tsx`, `src/app/__tests__/tabs-wiring.test.ts`
**Pattern extraction date:** 2026-09-01
