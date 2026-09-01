# Phase 4: Today View - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 14 (new + modified)
**Analogs found:** 12 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(tabs)/_layout.tsx` | provider/route (nav shell) | request-response | `src/app/_layout.tsx` | role-match |
| `src/app/(tabs)/index.tsx` | controller/screen (moved from `src/app/index.tsx`) | event-driven + CRUD | `src/app/index.tsx` (itself, pre-move) | exact |
| `src/app/(tabs)/calendar.tsx` | component (placeholder screen) | request-response (static) | `src/app/priming.tsx` | role-match |
| `src/app/_layout.tsx` (modify: nest `(tabs)` as initial route) | provider/route | request-response | itself (in-place edit) | exact |
| `src/checkin/checkinRepo.ts` (add `getTodayCheckins`) | service/repo | CRUD | `getLatestCheckinCoordinate` in same file | exact |
| `src/checkin/photos.ts` (add resize step) | service | file-I/O | `pickAndCopyPhoto` in same file | exact |
| `src/checkin/deps.ts` (add `expo-image-manipulator` isolation) | utility (native-module boundary) | file-I/O | `defaultPhotoStorageDeps` in same file | exact |
| `src/checkin/config.ts` (add `ResizeDeps` type + `MAX_PHOTO_DIMENSION_PX`) | config | — | `PhotoStorageDeps` type in same file | exact |
| `src/db/migrations.ts` (widen `MigratableDb` with `getAllAsync`) | config/model (type contract) | CRUD | itself (in-place edit) | exact |
| `src/db/testing/nodeSqliteAdapter.ts` (add `getAllAsync` impl) | test utility | CRUD | `getFirstAsync`/`runAsync` in same file | exact |
| `src/today/TodayBottomSheet.tsx` | component | event-driven (gesture/animation) | `src/components/CheckinActionCard.tsx` (bottom-of-screen presentational surface) | role-match |
| `src/today/CheckinListRow.tsx` | component | transform (render-only) | `src/components/NotificationDeniedBanner.tsx` | role-match |
| `src/today/trajectory.ts` | utility | transform | `src/checkin/fallbackLocation.ts` (pure coordinate-logic module) | role-match |
| `src/today/trajectory.test.ts` | test | transform | `src/checkin/checkinRepo.test.ts` (Node-env unit test style) | role-match |

## Pattern Assignments

### `src/app/(tabs)/_layout.tsx` (route/provider, request-response)

**Analog:** `src/app/_layout.tsx` (structure) + RESEARCH.md Code Examples (expo-router `Tabs` API surface — no existing tabs file in repo yet)

**Imports pattern** (`src/app/_layout.tsx` lines 18-30):
```typescript
import { Stack } from 'expo-router';
// ... (this new file swaps Stack for Tabs)
import { colors } from '../theme/tokens'; // needed for tabBar* overrides — see UI-SPEC Color section
```

**Core pattern — from 04-RESEARCH.md Code Examples (`docs.expo.dev/router/basics/layout`), adapted with the required color override from 04-UI-SPEC.md "네비게이션 탭바" section (NOT optional — default active tint is iOS system blue and violates DESIGN.md's single-accent rule):**
```typescript
import { Tabs } from 'expo-router';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '오늘' }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더' }} />
    </Tabs>
  );
}
```

**Note:** No icons (D-07/UI-SPEC "탭바는 아이콘 없이 라벨만") — do not add `tabBarIcon`.

---

### `src/app/(tabs)/index.tsx` (controller/screen, event-driven + CRUD)

**Analog:** `src/app/index.tsx` itself — this is a file move (`src/app/index.tsx` → `src/app/(tabs)/index.tsx`), not a rewrite. Every pattern in the current file (read in full this session, 1061 lines) carries over verbatim; only additions are needed.

**Imports pattern to keep unchanged** (lines 21-76): the existing checkin/db/theme/components import block. New imports to add:
```typescript
import BottomSheet from '@gorhom/bottom-sheet'; // or the sheet wrapper: '../../today/TodayBottomSheet'
import { getTodayCheckins } from '../../checkin/checkinRepo';
import { CheckinListRow } from '../../today/CheckinListRow';
import { TodayBottomSheet } from '../../today/TodayBottomSheet';
import { buildTrajectoryCoordinates } from '../../today/trajectory';
import { Polyline } from 'react-native-maps';
```

**D-04 mutual-exclusion pattern to extend** (lines 353-354, 909-967 — existing `showActionCard` branch):
```typescript
const isCapturing = state.phase === 'CAPTURING';
const showActionCard = state.phase !== 'IDLE' && !isCapturing;
// ...
{showActionCard ? (
  <KeyboardAvoidingView behavior="padding" style={styles.actionCardContainer}>
    <CheckinActionCard ... />
  </KeyboardAvoidingView>
) : (
  <>
    {/* NEW: mount TodayBottomSheet only in this branch (D-04) */}
    <TodayBottomSheet checkins={todayCheckins} />
    <View style={[styles.checkinButtonContainer, /* bottom now driven by sheet position, D-05 */]}>
      ...
    </View>
    <View style={[styles.recenterButtonContainer, /* same dynamic bottom */]}>
      ...
    </View>
  </>
)}
```

**Pin rendering pattern to extend** (lines 156-166, 889-901 — `pinStyleForSource`, existing `<Marker>` block): add a second loop rendering saved pins with `styles.pinConfident`-shaped but `colors.accentSoft`-colored markers, reusing `pinWrapper`/`pinDrop` styles (lines 1034-1060) with a new style variant (no new shape, only new color per D-10/UI-SPEC):
```typescript
{todayCheckins.map((checkin) => (
  <Marker key={checkin.id} coordinate={{ latitude: checkin.lat, longitude: checkin.lng }} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.pinWrapper}>
      <View style={[styles.pinDrop, styles.pinSaved]} /> {/* new style: backgroundColor: colors.accentSoft */}
    </View>
  </Marker>
))}
```

**Trajectory line pattern (new, REQ-trajectory-line):**
```typescript
{trajectoryCoordinates.length >= 2 && (
  <Polyline coordinates={trajectoryCoordinates} strokeColor={colors.accentSoft} strokeWidth={2} />
)}
```

**Error handling pattern to keep** (lines 632-641, 746-753): every async DB/GPS call wrapped in try/catch with `console.error` + reducer `dispatch` fallback — never swallow a promise silently (repo-wide "프로미스 미삼킴 규약"). The new `getTodayCheckins` call site in a `useEffect` must follow the same `isMounted` guard pattern already used at lines 243-259 and 282-351.

---

### `src/app/(tabs)/calendar.tsx` (component, request-response/static)

**Analog:** `src/app/priming.tsx` (simplest existing full-screen component — safe-area + centered text pattern), trimmed down per D-07 (no button, no interaction).

**Core pattern** (adapted from `priming.tsx` lines 52-58, 85-95 — container/text structure only, no interaction, no `useSafeAreaInsets` needed since tab bar screens don't need top-safe-area padding the same way the pre-tabs full-screen priming route did):
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme/tokens';

export default function CalendarPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={[typography.helperText, styles.text]}>캘린더는 곧 추가돼요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textMuted,
  },
});
```

---

### `src/checkin/checkinRepo.ts` — add `getTodayCheckins` (service/repo, CRUD)

**Analog:** `getLatestCheckinCoordinate` in the same file (lines 110-117).

**Pattern to copy verbatim in shape** (single-row → multi-row read, same file, same "SQL only here" convention):
```typescript
// existing pattern (lines 110-117):
export async function getLatestCheckinCoordinate(
  db: MigratableDb
): Promise<{ lat: number; lng: number } | null> {
  const row = await db.getFirstAsync<{ lat: number; lng: number }>(
    'SELECT lat, lng FROM checkins ORDER BY created_at DESC LIMIT 1'
  );
  return row ?? null;
}

// new function, same conventions, uses getAllAsync (requires Pitfall 3 fix below):
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
Note: `CheckinRow` type already exists in `src/db/schema.ts` (lines 16-30) — import it, do not redefine.

**Testing pattern to extend:** `src/checkin/checkinRepo.test.ts` already tests `getLatestCheckinCoordinate` with `describe('getLatestCheckinCoordinate', ...)` blocks (lines 212-245) using `createTestDb()` + `migrateDbIfNeeded(db)` + `commitCheckin(...)` seeding, then asserting the read result. Add a new `describe('getTodayCheckins', ...)` block following the exact same setup/teardown shape (Test 6/7 style).

---

### `src/checkin/photos.ts` — add resize step (service, file-I/O)

**Analog:** `pickAndCopyPhoto` in the same file (lines 53-98) — same file, same dependency-injection convention (`deps` object param with typed ports, defaults from `deps.ts`).

**Pattern to copy** (structure: permission/pick → transform → copy-to-documentDirectory → typed error union, no thrown exceptions):
```typescript
// existing shape to mirror (lines 53-98) — note the try/catch-and-return-typed-error
// convention (never throws out of the function), and the UUID-derived destination
// filename rule (line 87-88, "경로 조작 방어"):
export async function pickAndCopyPhoto(
  source: PhotoSource,
  deps: { picker?: ImagePickerDeps; storage?: PhotoStorageDeps; crypto?: CryptoDeps } = {}
): Promise<PickPhotoResult> {
  // ...
  try {
    const destinationUri = await storage.copyIntoDocumentDirectory(asset.uri, fileName);
    return { uri: destinationUri, source, fileName };
  } catch (error) {
    console.error('Failed to copy photo into documentDirectory', error);
    return { error: 'copy_failed' };
  }
}
```
The new `resizePhoto`/resize step should follow the exact same shape: a `deps: { resize?: ResizeDeps }` parameter defaulting to `defaultResizeDeps` (to be added to `deps.ts`/`config.ts`, see below), a try/catch that returns a typed error (`{ error: 'resize_failed' }`) rather than throwing, and it must write its output to a **new UUID-derived filename in `documentDirectory`** (not overwrite the original in place) — same security rule as `buildPhotoFileName` (line 32-34) and the Security Domain note in 04-RESEARCH.md.

**Testing pattern to extend:** `src/checkin/photos.test.ts` exists — read its existing `pickAndCopyPhoto` test shape (fake `picker`/`storage`/`crypto` deps objects) and add matching fake `resize` deps tests, per Wave 0 Gaps in RESEARCH.md.

---

### `src/checkin/deps.ts` / `src/checkin/config.ts` — add `expo-image-manipulator` isolation

**Analog:** `defaultPhotoStorageDeps` in `deps.ts` (lines 61-68) + `PhotoStorageDeps` type in `config.ts` (lines 39-41).

**Pattern to copy** — `config.ts` (type-only import convention, lines 9-11, 39-41):
```typescript
// config.ts — type-only, no runtime import:
export type ResizeDeps = {
  resizeToMaxDimension(uri: string, maxDimensionPx: number): Promise<string>;
};
export const MAX_PHOTO_DIMENSION_PX = 1600; // REQ-photo-resize, do not invent elsewhere
```

**Pattern to copy** — `deps.ts` (runtime import isolation convention, lines 6-9, 61-68):
```typescript
// deps.ts — this file is the ONLY place expo-image-manipulator may be runtime-imported:
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ResizeDeps } from './config';

export const defaultResizeDeps: ResizeDeps = {
  async resizeToMaxDimension(uri, maxDimensionPx) {
    const context = ImageManipulator.manipulate(uri);
    const image = await context.resize({ width: maxDimensionPx }).renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG });
    return result.uri;
  },
};
```
Note the deprecated-API pitfall (04-RESEARCH.md Pitfall 2): never use `manipulateAsync` — only the new context-based `manipulate().resize().renderAsync().then(saveAsync)` chain. Also see Assumption A1: branch resize dimension (`width` vs `height`) on which is larger to correctly cap the *longest* side, not always `width`.

---

### `src/db/migrations.ts` — widen `MigratableDb` (Pitfall 3, HIGH confidence, verified by direct read)

**Current type** (line 19):
```typescript
export type MigratableDb = Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync'>;
```
**Required change:**
```typescript
export type MigratableDb = Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync' | 'getAllAsync'>;
```
This is a one-line widen — do not touch `migrateDbIfNeeded`'s body or the versioned migration blocks (lines 29-45 have an explicit "never edit past version blocks" comment/discipline that must be respected).

---

### `src/db/testing/nodeSqliteAdapter.ts` — add `getAllAsync` (Pitfall 3 continued)

**Analog:** `getFirstAsync`/`runAsync` in the same file (lines 43-57) — same `resolveBindArgs` normalization helper (lines 19-30) must be reused, not reimplemented.

**Pattern to copy:**
```typescript
// existing getFirstAsync (lines 43-46):
getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
  const row = raw.prepare(sql).get(...(resolveBindArgs(params) as never[]));
  return (row ?? null) as T | null;
},

// new getAllAsync, same resolveBindArgs reuse, node:sqlite's `.all()`:
getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
  const rows = raw.prepare(sql).all(...(resolveBindArgs(params) as never[]));
  return rows as T[];
},
```
Add this to the `adapter` object literal (line 39) alongside the existing three methods.

---

### `src/today/TodayBottomSheet.tsx` (component, event-driven — new file, new directory)

**Analog:** `src/components/CheckinActionCard.tsx` — closest existing "bottom-of-screen presentational surface driven by external state, no internal business logic" component (240 lines, read in full this session).

**Component contract pattern to copy** (lines 1-19 header comment convention + prop-driven render, no internal state-machine logic):
```typescript
// Same "재사용 가능한 프레젠테이셔널 컴포넌트 계약" as CheckinActionCard.tsx/
// NotificationDeniedBanner.tsx: no absolute positioning inside the component,
// parent (Today screen) decides placement. This component's only internal
// responsibility is the @gorhom/bottom-sheet snap-state wiring itself.
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { StyleSheet, Text, View } from 'react-native';
import { colors, motion, radius, spacing, typography } from '../theme/tokens';
import { CheckinListRow } from './CheckinListRow';
import type { CheckinRow } from '../db/schema';

export type TodayBottomSheetProps = {
  checkins: CheckinRow[];
  onPositionChange?: (animatedPosition: SharedValue<number>) => void; // D-05 hook-up, see RESEARCH.md Pattern 2 — verify exact v5 API against node_modules types before implementing (Open Question 2)
};
```

**Surface styling to copy** — reuse `CheckinActionCard`'s `card`/`gapMd` shape (lines 178-191) since 04-UI-SPEC.md explicitly states the sheet surface "시각적으로는 기존 액션 카드(Phase 3)와 동일한 표면(`colors.surface`, 상단 모서리만 `radius.lg`)을 그대로 승계":
```typescript
// CheckinActionCard.tsx lines 178-185, same shape for the sheet's contentContainerStyle:
card: {
  backgroundColor: colors.surface,
  borderTopLeftRadius: radius.lg,
  borderTopRightRadius: radius.lg,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.lg,
},
```

**List rendering — Anti-Pattern to avoid (04-RESEARCH.md, HIGH confidence):** must use `BottomSheetFlatList`, never a plain `FlatList`/`ScrollView` — they fight the sheet's own pan gesture for touch priority.

**Empty state pattern** — mirror `NotificationDeniedBanner.tsx`'s early-return-null-when-nothing-to-show shape (lines 19-21), but here render the empty-state text row instead of returning null (sheet itself always mounts when `!showActionCard`):
```typescript
{checkins.length === 0 ? (
  <Text style={[typography.helperText, styles.emptyText]}>
    아직 기록이 없어요 · 체크인하면 지도가 채워져요
  </Text>
) : (
  <BottomSheetFlatList data={checkins} keyExtractor={(c) => c.id} renderItem={({ item }) => <CheckinListRow checkin={item} />} />
)}
```

---

### `src/today/CheckinListRow.tsx` (component, transform/render-only — new file)

**Analog:** `src/components/NotificationDeniedBanner.tsx` — closest simple, presentational, prop-driven, no-internal-logic component (49 lines, read in full).

**Contract pattern to copy** (component header comment + no absolute positioning + pure render function shape, lines 1-16, 16-33):
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import type { CheckinRow } from '../db/schema';

export type CheckinListRowProps = { checkin: CheckinRow };

export function CheckinListRow({ checkin }: CheckinListRowProps) {
  // D-03: plain View, no Pressable/TouchableOpacity — this row is non-interactive.
  return (
    <View style={styles.row}>
      <Text style={typography.timestamp}>{/* format checkin.timestamp_utc to HH:mm, local time */}</Text>
      {checkin.note ? (
        <Text style={typography.journalEntry} numberOfLines={1} ellipsizeMode="tail">
          {checkin.note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
```
D-02 constraint: no photo-presence icon/badge — do not add any element beyond time + optional note preview.

---

### `src/today/trajectory.ts` (utility, transform — new file, pure function, no native deps)

**Analog:** `src/checkin/fallbackLocation.ts` — closest existing pure-logic, no-I/O, easily-unit-testable coordinate module in the checkin domain.

**Pattern to copy** (pure function taking already-fetched rows, no DB/network access itself — the query itself lives in `checkinRepo.ts` per Pattern 1/D-11, this module only derives Polyline-ready coordinates):
```typescript
import type { CheckinRow } from '../db/schema';

export type TrajectoryCoordinate = { latitude: number; longitude: number };

// checkins must already be timestamp_utc-ascending (getTodayCheckins guarantees this,
// D-11 — do not re-sort here, avoid duplicating the ORDER BY contract).
export function buildTrajectoryCoordinates(checkins: CheckinRow[]): TrajectoryCoordinate[] {
  if (checkins.length < 2) return []; // REQ-trajectory-line: 0~1 check-ins → no line
  return checkins.map((c) => ({ latitude: c.lat, longitude: c.lng }));
}
```

**Testing pattern:** mirror `src/checkin/checkinRepo.test.ts`'s `@jest-environment node` header + plain input/output assertions (no DB setup needed here since this is a pure function) — see `src/checkin/fallbackLocation.test.ts` for the closest existing "pure coordinate logic, Node env, table-driven cases" test shape.

---

## Shared Patterns

### Dependency-injection / native-module isolation boundary
**Source:** `src/checkin/deps.ts` + `src/checkin/config.ts` (established in Phase 3, still in force)
**Apply to:** `src/checkin/photos.ts` resize addition, any new native-module usage (`expo-image-manipulator`)
```typescript
// config.ts: type-only import + Pick<> port type + constants
import type * as SomeSdk from 'some-expo-package';
export type SomeDeps = Pick<typeof SomeSdk, 'someMethod'>;
// deps.ts: the ONLY file with a runtime `import * as SomeSdk from 'some-expo-package'`
export const defaultSomeDeps: SomeDeps = { someMethod: SomeSdk.someMethod };
```
Rule: screen/service files never import native SDK packages directly — always go through `deps.ts` defaults injected as optional params.

### "SQL lives only in `checkinRepo.ts`" rule
**Source:** `src/checkin/checkinRepo.ts` (all SQL strings), enforced by `src/app/__tests__/checkin-wiring.test.ts` Test 12 (regex assertion that no `INSERT|SELECT|UPDATE|DELETE` keyword appears in `src/app/index.tsx`'s stripped source)
**Apply to:** `src/app/(tabs)/index.tsx`, `src/today/TodayBottomSheet.tsx`, `src/today/CheckinListRow.tsx` — none of these may contain a SQL string literal. Any new query goes into `checkinRepo.ts` (`getTodayCheckins`) and is consumed as already-fetched `CheckinRow[]` by the UI layer.

### Presentational component contract (no absolute positioning, no internal state machine)
**Source:** `src/components/NotificationDeniedBanner.tsx`, `src/components/LocationDeniedBanner.tsx`, `src/components/CheckinActionCard.tsx`
**Apply to:** `src/today/TodayBottomSheet.tsx`, `src/today/CheckinListRow.tsx`
```typescript
// Header comment convention to replicate verbatim in new files:
// "재사용 가능한 독립 컴포넌트 계약: 이 컴포넌트는 화면별 로직이나 위치 지정
// (absolute positioning)을 내부에 갖지 않는다 — 배치는 항상 부모가 결정한다."
```

### Mount/unmount instead of disable (D-04's "언마운트, 비활성화 아님" contract)
**Source:** `src/components/CheckinActionCard.tsx` lines 62-65, 167-172 (comment: "비활성화가 아니라 미마운트") + `src/app/index.tsx` lines 909-967 (`showActionCard ? <CheckinActionCard/> : <>...buttons...</>`)
**Apply to:** the new `TodayBottomSheet` mount gate in `src/app/(tabs)/index.tsx` — `!showActionCard && <TodayBottomSheet .../>`, never `opacity: 0` or `disabled`.

### Promise/error-swallowing prohibition ("프로미스 미삼킴 규약")
**Source:** repo-wide, e.g. `src/app/index.tsx` lines 632-641, 746-753, `src/checkin/photos.ts` lines 93-97
**Apply to:** every new async call site (`getTodayCheckins`, `resizeToMaxDimension`) — always `.catch((error) => console.error(...))` at minimum, never a bare unhandled promise.

### Isolated dev fake/test-double via structural typing (`Pick<...>`)
**Source:** `src/db/migrations.ts` `MigratableDb`, `src/checkin/config.ts` `LocationDeps`/`ImagePickerDeps`/`PhotoStorageDeps`
**Apply to:** `ResizeDeps` (new), `getAllAsync` widening on `MigratableDb`
```typescript
export type SomeDeps = Pick<typeof NativeSdkNamespace, 'methodOne' | 'methodTwo'>;
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/(tabs)/_layout.tsx` | route/provider | request-response | No `expo-router` `Tabs`-based route group exists anywhere in the repo yet (only a root `Stack` in `src/app/_layout.tsx`) — use the RESEARCH.md Code Examples snippet (sourced from `docs.expo.dev/router/basics/layout`) as the primary template instead of a codebase analog. |
| `src/today/TodayBottomSheet.tsx` | component | event-driven (gesture/animation) | `@gorhom/bottom-sheet` is a brand-new dependency not yet installed or used anywhere in the repo — no existing gesture/animation-driven component exists to copy the sheet-specific wiring from (only the *surface styling* and *mount-gating* patterns transfer from `CheckinActionCard.tsx`). Exact v5 prop names for `animatedPosition`/`animatedIndex` (D-05) must be verified against `node_modules/@gorhom/bottom-sheet` TypeScript types once installed (04-RESEARCH.md Open Question 2, Assumption A2). |

## Metadata

**Analog search scope:** `src/app/`, `src/checkin/`, `src/components/`, `src/db/`, `src/theme/` (all directories referenced in 04-CONTEXT.md/04-RESEARCH.md "Existing Code Insights" and "Sources — Direct repo reads")
**Files scanned:** 12 source files read in full (`src/app/index.tsx`, `src/app/_layout.tsx`, `src/app/priming.tsx`, `src/checkin/checkinRepo.ts`, `src/checkin/checkinRepo.test.ts`, `src/checkin/photos.ts`, `src/checkin/deps.ts`, `src/checkin/config.ts`, `src/db/migrations.ts`, `src/db/schema.ts`, `src/db/testing/nodeSqliteAdapter.ts`, `src/components/NotificationDeniedBanner.tsx`, `src/components/LocationDeniedBanner.tsx`, `src/components/CheckinActionCard.tsx`, `src/theme/tokens.ts`) + repo file listing (`find src -type f`) + test file inventory
**Pattern extraction date:** 2026-08-30
