# Phase 7: Day-end Reflection - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 16 (7 new, 9 modified)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/reflection/reflectionRepo.ts` (new) | service (repo/CRUD) | CRUD | `src/checkin/checkinRepo.ts` | exact |
| `src/reflection/reflectionRepo.test.ts` (new) | test | CRUD | `src/checkin/checkinRepo.test.ts` | exact |
| `src/reflection/autosaveController.ts` (new) | utility (pure controller) | event-driven | `src/today/pendingDelete.ts` | exact (design origin) |
| `src/reflection/autosaveController.test.ts` (new) | test | event-driven | (jest fake timers — no direct analog, see below) | role-match |
| `src/reflection/content.ts` (new) | config (copy constants) | — | `src/settings/content.ts` / `src/today/content.ts` | exact |
| `src/reflection/ReflectionModal.tsx` (new) | component (screen body) | request-response | `src/checkin/CheckinDetailScreen.tsx` | exact |
| `src/app/reflection.tsx` (new) | route (thin wrapper) | request-response | `src/app/(tabs)/index/settings.tsx` | exact |
| `src/app/__tests__/reflection-wiring.test.ts` (new) | test (static source analysis) | — | `src/app/__tests__/settings-wiring.test.ts` | exact |
| `src/app/_layout.tsx` (modify) | provider/route-registration | event-driven | itself (existing `<Stack>`/`NotificationSelfHealGate` pattern) | exact |
| `src/today/TodayBottomSheet.tsx` (modify) | component (list container) | CRUD (render) | itself (existing `emptyText`/optional-prop extension pattern) | exact |
| `src/today/content.ts` (modify) | config (copy constants) | — | itself | exact |
| `src/calendar/PastDateScreen.tsx` (modify) | component (screen, inline extension) | request-response | itself + `src/checkin/CheckinDetailScreen.tsx` (AppState flush) | exact |
| `src/settings/SettingsScreen.tsx` (modify) | component (screen) | request-response | itself (existing `handleFrequencyPress`/`persist` pattern) | exact |
| `src/settings/content.ts` (modify) | config (copy constants) | — | itself (existing `FREQUENCY_*` triad) | exact |
| `src/settings/settingsRepo.ts` (modify) | service (repo) | CRUD | itself (existing `resolveNotificationSettings`/`upsertSettings`) | exact |
| `src/db/schema.ts` (modify) | model (types + DDL) | — | itself (`AppSettingsRow`/`CREATE_APP_SETTINGS_TABLE_SQL`) | exact |
| `src/db/migrations.ts` (modify) | migration | batch | itself (existing `if (currentDbVersion === N)` cascade) | exact |
| `src/db/migrations.test.ts` (modify) | test | batch | itself | exact |
| `src/settings/settingsRepo.test.ts` (modify) | test | CRUD | itself | exact |

## Pattern Assignments

### `src/reflection/reflectionRepo.ts` (service, CRUD)

**Analog:** `src/checkin/checkinRepo.ts`

**Imports pattern** (lines 1-14):
```typescript
// src/checkin/checkinRepo.ts:1-14
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow, LocationSource } from '../db/schema';
import { isValidCoordinate } from './fallbackLocation';
import { DRAFT_ROW_ID } from './config';
```
For `reflectionRepo.ts`, mirror this shape:
```typescript
import type { MigratableDb } from '../db/migrations';
import type { DailyReflectionRow } from '../db/schema';
import { runWithSingleRetry } from '../checkin/checkinRepo'; // cross-domain import — see RESEARCH.md Open Question #1, plan must confirm
```

**Core CRUD/transaction pattern** (lines 51-108, `commitCheckin`):
```typescript
// src/checkin/checkinRepo.ts:59-107
const result = await runWithSingleRetry(async () => {
  try {
    await db.execAsync('BEGIN');
    await db.runAsync(`INSERT INTO checkins (...) VALUES (?, ?, ...)`, ...params);
    await db.runAsync('DELETE FROM drafts WHERE id = ?', DRAFT_ROW_ID);
    await db.execAsync('COMMIT');
    return params.id;
  } catch (err) {
    try {
      await db.execAsync('ROLLBACK');
    } catch (rollbackErr) {
      console.error('commitCheckin: ROLLBACK failed ...', rollbackErr);
    }
    throw err;
  }
});
if (!result.ok) {
  return { ok: false, reason: 'write_failed' };
}
return { ok: true, id: result.value };
```
`upsertReflection` must copy this exact BEGIN/INSERT-or-UPDATE/COMMIT/ROLLBACK shape (select-then-branch, not `ON CONFLICT`, per RESEARCH.md Pattern 2 — this repo has never used SQLite UPSERT syntax).

**Retry helper — reuse, do not duplicate** (lines 31-49):
```typescript
// src/checkin/checkinRepo.ts:31-49
export async function runWithSingleRetry<T>(
  attempt: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const value = await attempt();
    return { ok: true, value };
  } catch {
    try {
      const value = await attempt();
      return { ok: true, value };
    } catch {
      return { ok: false };
    }
  }
}
```
Header comment (line 31) already states this is domain-agnostic and designed for reuse across phases — `reflectionRepo.ts` should `import { runWithSingleRetry } from '../checkin/checkinRepo'` rather than reimplementing (RESEARCH.md Don't Hand-Roll + Open Question #1: plan must decide whether to relocate to a shared module or import across the domain boundary as-is; RESEARCH.md recommends importing as-is for this phase).

**Simple SELECT pattern** (lines 110-117, `getLatestCheckinCoordinate`):
```typescript
// src/checkin/checkinRepo.ts:110-117
export async function getLatestCheckinCoordinate(db: MigratableDb): Promise<{ lat: number; lng: number } | null> {
  const row = await db.getFirstAsync<{ lat: number; lng: number }>(
    'SELECT lat, lng FROM checkins ORDER BY created_at DESC LIMIT 1'
  );
  return row ?? null;
}
```
`getReflectionByDate` follows this exact `row ?? null` normalization idiom against `DailyReflectionRow`.

**Parameter binding discipline:** every `db.runAsync`/`getFirstAsync` call in this file uses `?` placeholders only — never string interpolation. `reflectionRepo.ts` must follow identically (Security Domain V5 in RESEARCH.md).

---

### `src/reflection/reflectionRepo.test.ts` (test)

**Analog:** `src/checkin/checkinRepo.test.ts` (not read in full — referenced by RESEARCH.md Validation Architecture as the `node:sqlite` engine unit-test style used for all repo files; same `createTestDb` harness pattern documented in `src/db/migrations.test.ts` conventions). Use `NODE_OPTIONS=--experimental-sqlite npx jest src/reflection/reflectionRepo.test.ts` to run.

---

### `src/reflection/autosaveController.ts` (utility, event-driven)

**Analog:** `src/today/pendingDelete.ts`

**Full structural pattern to adapt** (lines 21-74):
```typescript
// src/today/pendingDelete.ts:21-74
export const UNDO_WINDOW_MS = 4000;

export type PendingDeleteItem = { id: string; photoPath: string | null };

export type PendingDeleteController = {
  request(item: PendingDeleteItem): void;
  undo(): void;
  dispose(): void;
};

export function createPendingDeleteController(args: {
  delayMs?: number;
  onCommit: (item: PendingDeleteItem) => void;
  onChange: (pendingId: string | null) => void;
}): PendingDeleteController {
  const delayMs = args.delayMs ?? UNDO_WINDOW_MS;
  let pending: { item: PendingDeleteItem; timer: ReturnType<typeof setTimeout> } | null = null;

  function settle(item: PendingDeleteItem) {
    pending = null;
    args.onCommit(item);
    args.onChange(null);
  }

  return {
    request(item) {
      if (pending) {
        const previous = pending;
        clearTimeout(previous.timer);
        settle(previous.item);
      }
      const timer = setTimeout(() => settle(item), delayMs);
      pending = { item, timer };
      args.onChange(item.id);
    },
    undo() {
      if (!pending) return;
      clearTimeout(pending.timer);
      pending = null;
      args.onChange(null);
    },
    dispose() {
      if (!pending) return;
      const current = pending;
      clearTimeout(current.timer);
      settle(current.item);
    },
  };
}
```

**Key structural elements to carry over:** single-timer closure state (no queue), a shared `settle`/`onSave` function used by both the timer-expiry path and the `dispose()` immediate-commit path, and the module-header discipline of explaining *why* dispose forces a commit rather than silently canceling (lines 11-20 of `pendingDelete.ts`). RESEARCH.md Pattern 4 (07-RESEARCH.md lines 342-401) already provides the adapted `createAutosaveController` implementation — treat that as the concrete target, with `pendingDelete.ts` as the structural precedent to cite in the file header comment. Note the semantic inversion: `pendingDelete` is a *cancelable* deferred action (has `undo()`); the autosave controller is *not cancelable* (no `undo()`, only `notify`/`flush`/`dispose`) — this difference must be called out in the header comment exactly as RESEARCH.md's example does.

**Pure-module constraint:** no RN/native imports — must load under `@jest-environment node` (see `pendingDelete.ts` line 4 comment).

---

### `src/reflection/autosaveController.test.ts` (test, event-driven)

No direct analog exists in this repo for `jest.useFakeTimers()`-based controller tests (RESEARCH.md Wave 0 Gaps explicitly flags this as new). Follow `pendingDelete.ts`'s own test file if one exists (check `src/today/pendingDelete.test.ts`), otherwise structure as: `@jest-environment node`, `jest.useFakeTimers()`, advance timers to assert `notify()` debounces and `flush()`/`dispose()` fire immediately.

---

### `src/reflection/content.ts` (config, copy constants)

**Analog:** `src/settings/content.ts` and `src/today/content.ts`

**Pattern** (full file, `src/today/content.ts`):
```typescript
// src/today/content.ts:1-18
// Source: 04-UI-SPEC.md §Copywriting Contract... — 문구를 여기서 발명하지 않고
// 승인된 문서에서 그대로 전사한다(src/notifications/content.ts와 동일한 규약).
export const TODAY_COPY = {
  tabToday: '오늘',
  emptyState: '아직 기록이 없어요 · 체크인하면 지도가 채워져요',
  ...
} as const;
```
`REFLECTION_COPY` in `content.ts` should transcribe verbatim from `07-UI-SPEC.md` §Copywriting Contract: `promptNewPlace: '새로 가본 곳이 있었나요?'`, `promptFreeReflection: '오늘에 대해'`, `sectionTitle: '오늘의 흔적'`, `emptyState: '아직 기록이 없어요'` (deliberately different from `TODAY_COPY.emptyState` — do not reuse that string, per UI-SPEC), `saveFailed`/`retryCta` (reuse `SETTINGS_COPY.saveFailed`/`retryCta` values, do not re-invent), `closeLabel: '닫기'`.

**Action-sheet triad pattern** (for the reflection-hour settings addition, `src/settings/content.ts` lines 38-59):
```typescript
// src/settings/content.ts:38-59
export const FREQUENCY_ACTION_SHEET_OPTIONS = [
  SETTINGS_COPY.frequencyHourly,
  SETTINGS_COPY.frequencyEvery3h,
  SETTINGS_COPY.frequencyOff,
  SETTINGS_COPY.actionSheetCancel,
] as const;

export const FREQUENCY_ACTION_SHEET_CANCEL_INDEX = 3;

export const FREQUENCY_BY_ACTION_SHEET_INDEX: readonly (NotificationFrequency | null)[] = [
  'hourly', 'every3h', 'off', null,
];

export const FREQUENCY_LABEL_BY_VALUE: Readonly<Record<NotificationFrequency, string>> = {
  hourly: SETTINGS_COPY.frequencyHourly,
  every3h: SETTINGS_COPY.frequencyEvery3h,
  off: SETTINGS_COPY.frequencyOff,
};
```
This exact 4-constant shape (options array, cancel-index, index→value map, value→label map) must be replicated in `src/settings/content.ts` as `REFLECTION_HOUR_OPTIONS` / `REFLECTION_HOUR_CANCEL_INDEX` / `REFLECTION_HOUR_BY_ACTION_SHEET_INDEX` / `REFLECTION_HOUR_LABEL_BY_VALUE` (RESEARCH.md Pattern 6 already drafted these with values `['19시','20시','21시','22시','23시','취소']`, cancel index `5`).

---

### `src/reflection/ReflectionModal.tsx` (component, request-response)

**Analog:** `src/checkin/CheckinDetailScreen.tsx`

**Static locked map pattern** (lines 433-460):
```tsx
// src/checkin/CheckinDetailScreen.tsx:433-460
<MapView
  style={styles.map}
  region={{
    latitude: checkin.lat,
    longitude: checkin.lng,
    latitudeDelta: MAP_REGION_DELTA,
    longitudeDelta: MAP_REGION_DELTA,
  }}
  scrollEnabled={false}
  zoomEnabled={false}
  rotateEnabled={false}
  pitchEnabled={false}
  pointerEvents="none"
>
  <Marker coordinate={{ latitude: checkin.lat, longitude: checkin.lng }} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.pinWrapper}>
      <View style={[styles.pinDrop, styles.pinSaved]} />
    </View>
  </Marker>
</MapView>
```
For the reflection modal's map (which needs the *whole day's* trajectory, not a single point), combine this lock pattern with the Polyline usage from `src/app/(tabs)/index/index.tsx` (lines 1172-1214, not fully quoted here — use `trajectoryCoordinates.length >= 2 && <Polyline coordinates={trajectoryCoordinates} .../>` guard) and `buildTrajectoryCoordinates` from `src/today/trajectory.ts` (full file, 24 lines — pure function, returns `[]` if fewer than 2 checkins, in which case only pins render — this is the graceful degradation CONTEXT.md already approved).

**AppState background-flush pattern** (lines 311-329):
```typescript
// src/checkin/CheckinDetailScreen.tsx:321-329
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') return;
    if (isDirtyRef.current) {
      flushNoteAndPhoto();
    }
  });
  return () => subscription.remove();
}, [flushNoteAndPhoto]);
```
Copy this guard verbatim (the `if (nextAppState === 'active') return;` line is the critical piece — Pitfall 4 in RESEARCH.md). The reflection modal's version calls `autosave.flush()` instead of `flushNoteAndPhoto()`, and does not need the `isDirtyRef` gate since `autosaveController.flush()` is a no-op when there is no pending draft.

**Failure UI pattern** (lines 587-593 render + styles at 767-773; also `SettingsScreen.tsx` lines 192-199 for a lighter-weight equivalent):
```tsx
// src/settings/SettingsScreen.tsx:192-199
{saveFailed ? (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{SETTINGS_COPY.saveFailed}</Text>
    <Pressable onPress={handleRetry} accessibilityRole="button">
      <Text style={styles.retryText}>{SETTINGS_COPY.retryCta}</Text>
    </Pressable>
  </View>
) : null}
```
```typescript
// src/settings/SettingsScreen.tsx:246-257 (styles)
errorContainer: { paddingHorizontal: spacing.md, gap: spacing.xs },
errorText: { ...typography.helperText, color: colors.textMuted },
retryText: { ...typography.helperText, color: colors.textMuted, textDecorationLine: 'underline' },
```
07-UI-SPEC.md explicitly says to reuse this "small, understated" `SettingsScreen.tsx` pattern (not `CheckinActionCard`'s bold pill-button `SAVE_FAILED` treatment) — D-01/Component Contract §2.7 confirms no red color, no warning icon, single shared failure line for both prompts.

**Caption-label + placeholder-less TextInput pattern** (07-UI-SPEC.md already resolved this; RESEARCH.md Code Examples, lines 570-585):
```tsx
<Text style={[typography.helperText, { color: colors.textMuted }]}>
  {REFLECTION_COPY.promptNewPlace}
</Text>
<TextInput
  multiline
  value={newPlaceAnswer}
  onChangeText={handleChangeNewPlace}
  placeholder=""
  style={[typography.journalEntry, { minHeight: 44, backgroundColor: colors.surface }]}
/>
```

**Read-only checkin list row (new component, not `CheckinListRow` reuse)** — RESEARCH.md Code Examples:
```tsx
function ReflectionCheckinRow({ checkin }: { checkin: CheckinRow }) {
  const time = formatLocalTime(checkin.timestamp_utc);
  return (
    <View style={styles.row}>
      <Text style={[timestampStyle, styles.time]}>{time}</Text>
      {checkin.note ? (
        <Text style={[typography.journalEntry, styles.notePreview]} numberOfLines={1}>{checkin.note}</Text>
      ) : null}
      {checkin.photo_path ? (
        <Image source={{ uri: checkin.photo_path }} style={styles.thumbnail} contentFit="cover" />
      ) : null}
    </View>
  );
}
```
Timestamp formatting reuses `formatLocalTime` from `src/checkin/localDate.ts:39-49` (Intl-based, `hourCycle: 'h23'`, no manual string slicing).

**Data fetch pattern** — reuse the single shared query, do not write a new one (RESEARCH.md Pattern 3):
```typescript
const todayKey = resolveLocalDateKey(new Date());
const checkins = await getTodayCheckins(db, todayKey); // src/checkin/checkinRepo.ts:123-131
const trajectoryCoordinates = buildTrajectoryCoordinates(checkins); // src/today/trajectory.ts
```

---

### `src/app/reflection.tsx` (route, request-response)

**Analog:** `src/app/(tabs)/index/settings.tsx` (thin-wrapper route pattern — confirmed by `settings-wiring.test.ts` Test 20, which asserts the settings route references `useSQLiteContext`/`SettingsScreen` and contains **no** `StyleSheet`/`useState`).

**Pattern to replicate exactly:**
```tsx
import { useSQLiteContext } from 'expo-sqlite';
import { ReflectionModal } from '../reflection/ReflectionModal';

export default function ReflectionRoute() {
  const db = useSQLiteContext();
  return <ReflectionModal db={db} />;
}
```
No `StyleSheet`, no local state, no business logic in this file — mirrors the settings route's "thin wrapper, db injection only" contract.

---

### `src/app/_layout.tsx` (modify — provider/route registration, event-driven)

**Analog:** itself (existing structure, lines 92-110)

**Current Stack registration** (lines 101-109):
```tsx
// src/app/_layout.tsx:101-109
<GestureHandlerRootView style={styles.flex}>
  <SafeAreaProvider>
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <NotificationSelfHealGate />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```
Two changes needed here (RESEARCH.md Pattern 1 + Code Examples):
1. Register the modal route as a child of `<Stack>`:
   ```tsx
   <Stack screenOptions={{ headerShown: false }}>
     <Stack.Screen name="reflection" options={{ presentation: 'modal', headerShown: false }} />
   </Stack>
   ```
2. Add a new sibling component to `NotificationSelfHealGate` (same "separate component rendering null inside `SQLiteProvider`'s child tree" idiom) for the notification-tap deep link:
   ```tsx
   import * as Notifications from 'expo-notifications';
   import { router } from 'expo-router';
   import { DAILY_REFLECTION_ID } from '../notifications/scheduling';

   function ReflectionNotificationDeepLinkGate() {
     const response = Notifications.useLastNotificationResponse();
     const handledRef = useRef<string | null>(null);
     useEffect(() => {
       if (!response) return;
       if (response.notification.request.identifier !== DAILY_REFLECTION_ID) return;
       const responseKey = response.notification.date + response.actionIdentifier;
       if (handledRef.current === responseKey) return;
       handledRef.current = responseKey;
       router.push('/reflection'); // absolute path — Pitfall 3
     }, [response]);
     return null;
   }
   ```
`NotificationSelfHealGate`'s own file (`src/notifications/registry.ts` consumer, referenced at `_layout.tsx` line 29) is the direct structural precedent for "gate component that runs inside SQLiteProvider tree and renders nothing."

**Regression guard note:** `settings-wiring.test.ts` Test 23/24 already assert `_layout.tsx` has no duplicate `AppState.addEventListener`. The new gate component must not add one — it only calls `useLastNotificationResponse()`.

---

### `src/today/TodayBottomSheet.tsx` (modify — component, CRUD render)

**Analog:** itself (existing optional-prop extension pattern, lines 42-53 already shows how Phase 6 added `emptyText`/`sheetRef` without touching Today's own call site)

**Current empty/non-empty branch** (lines 100-115):
```tsx
// src/today/TodayBottomSheet.tsx:100-115
if (containerHeight <= 0) {
  return null;
}
return (
  <BottomSheet ...>
    {checkins.length === 0 ? (
      <Text style={[typography.helperText, styles.emptyText]}>{emptyText}</Text>
    ) : (
      <BottomSheetFlatList
        data={checkins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CheckinListRow checkin={item} onPress={onRowPress} onDeleteRequest={onDeleteRequest} />
        )}
      />
    )}
  </BottomSheet>
);
```
Per RESEARCH.md Pitfall 1, this branch must change so `BottomSheetFlatList` is **always** mounted (never swapped for a bare `<Text>`), with the empty state moved into `ListEmptyComponent`, and a new optional `ListHeaderComponent` prop threaded through for the "오늘 돌아보기" row. Follow the exact same "new optional prop, default preserves existing behavior for the Today screen call site" idiom already used for `emptyText`/`sheetRef` (lines 42-53 comment block) — do not change `TodayBottomSheetProps`' required fields.

---

### `src/today/content.ts` (modify — copy constants)

**Analog:** itself (existing `as const` object, full file above). Add/update the "오늘의 흔적" section header string and remove any checkin-count interpolation per REQ-reflection-copy-fix; follow the same "transcribe from UI-SPEC verbatim, do not invent" comment convention already on line 2-4.

---

### `src/calendar/PastDateScreen.tsx` (modify — component, request-response)

**Analog:** itself (existing `activeDateKey`/`reloadCheckins` `useEffect` dependency pattern, lines 65-152) + `CheckinDetailScreen.tsx` AppState flush pattern (lines 321-329, reused above).

**Date-keyed reload pattern to mirror** (lines 134-152):
```typescript
// src/calendar/PastDateScreen.tsx:134-152 (paraphrased structure)
const reloadCheckins = useCallback(() => {
  getTodayCheckins(db, activeDateKey)
    .then((rows) => {
      if (isMountedRef.current && activeDateKey === activeDateKeyRef.current) {
        setCheckins(rows);
      }
    });
}, [db, activeDateKey]);

useEffect(() => {
  reloadCheckins();
}, [reloadCheckins]);
```
The reflection prompts' load-on-date-change effect must follow this identical shape: `getReflectionByDate(db, activeDateKey)` inside a `useCallback` keyed on `[db, activeDateKey]`, guarded by the same `isMountedRef`/`activeDateKeyRef` staleness check used for checkins (prevents a slow scrubber response from clobbering a newer date's reflection draft — same race this file already solved for checkins).

**Tab bar handling:** do not touch — this screen already hides the tab bar (06-UI-SPEC.md decision, unchanged by this phase).

---

### `src/settings/SettingsScreen.tsx` (modify — component, request-response)

**Analog:** itself (existing `handleFrequencyPress`/`persist` pattern, lines 82-123, already read in full above)

**Row pattern to replicate for the new "회고 알림 시각" row** (lines 154-167, "알림 빈도" row):
```tsx
// src/settings/SettingsScreen.tsx:154-167
<Pressable
  style={styles.row}
  onPress={handleFrequencyPress}
  accessibilityRole="button"
  accessibilityLabel={SETTINGS_COPY.rowFrequency}
>
  <Text style={styles.rowLabel}>{SETTINGS_COPY.rowFrequency}</Text>
  <View style={styles.rowTrailing}>
    <Text style={styles.rowValue}>{FREQUENCY_LABEL_BY_VALUE[settings.checkinFrequency]}</Text>
    <SymbolView name="chevron.right" tintColor={colors.textMuted} />
  </View>
</Pressable>
```
The new row is a byte-for-byte structural copy with `REFLECTION_HOUR_LABEL_BY_VALUE[settings.dailyReflectionHour]` and a new `handleReflectionHourPress` callback (RESEARCH.md Pattern 6 already drafted this callback):
```typescript
const handleReflectionHourPress = useCallback(() => {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: [...REFLECTION_HOUR_OPTIONS], cancelButtonIndex: REFLECTION_HOUR_CANCEL_INDEX },
    (buttonIndex) => {
      const nextHour = REFLECTION_HOUR_BY_ACTION_SHEET_INDEX[buttonIndex];
      if (nextHour === null || nextHour === undefined) return;
      persist({ ...settings, dailyReflectionHour: nextHour });
    }
  );
}, [persist, settings]);
```
**Critical: reuse `persist()` unchanged** (lines 82-98) — it already takes a full `NotificationSettings` object and already does native-first/DB-second ordering. Do not change its signature; `dailyReflectionHour` already exists on the `NotificationSettings` type (`src/notifications/config.ts:15`).

**Toggle-row placement:** insert the new row directly below the existing "하루 마무리 알림" `Switch` row (lines 169-179) inside the same `sectionNotifications` `<View style={styles.section}>` block, separated by the existing `<View style={styles.divider} />` idiom (line 168).

---

### `src/settings/content.ts` (modify — copy constants)

**Analog:** itself — see the `FREQUENCY_*` triad pattern fully reproduced above under `reflection/content.ts`. Add `REFLECTION_HOUR_OPTIONS`/`REFLECTION_HOUR_CANCEL_INDEX`/`REFLECTION_HOUR_BY_ACTION_SHEET_INDEX`/`REFLECTION_HOUR_LABEL_BY_VALUE` and a `rowReflectionHour: '회고 알림 시각'` copy key, following the exact same "photos.ts pattern replicated" comment convention already on line 35.

---

### `src/settings/settingsRepo.ts` (modify — service, CRUD)

**Analog:** itself (full file read above)

**Current hardcoded-fallback line to change** (line 43):
```typescript
// src/settings/settingsRepo.ts:31-45 (current)
export function resolveNotificationSettings(row: AppSettingsRow | null): NotificationSettings {
  if (row === null) {
    return PHASE2_NOTIFICATION_SETTINGS;
  }
  const checkinFrequency = isNotificationFrequency(row.checkin_frequency)
    ? row.checkin_frequency
    : PHASE2_NOTIFICATION_SETTINGS.checkinFrequency;
  return {
    checkinFrequency,
    dailyReflectionEnabled: row.daily_reflection_enabled === 1,
    dailyReflectionHour: PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour, // ← must change to read row.daily_reflection_hour
  };
}
```
Change to read `row.daily_reflection_hour` with the same fail-safe fallback idiom already used for `checkinFrequency` (validate it's a sane number, else fall back to `PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour`).

**`upsertSettings` INSERT OR REPLACE pattern to extend** (lines 57-78):
```typescript
// src/settings/settingsRepo.ts:69-77 (current)
await db.runAsync(
  `INSERT OR REPLACE INTO app_settings (
     id, checkin_frequency, daily_reflection_enabled, updated_at
   ) VALUES (?, ?, ?, ?)`,
  SETTINGS_ROW_ID,
  settings.checkinFrequency,
  settings.dailyReflectionEnabled ? 1 : 0,
  now
);
```
Add `daily_reflection_hour` as a 5th column/parameter, keeping the same `?`-placeholder-only discipline (no string interpolation — the file's own header comment at lines 5-10 states this explicitly).

---

### `src/db/schema.ts` (modify — model)

**Analog:** itself (`AppSettingsRow` interface + `CREATE_APP_SETTINGS_TABLE_SQL`, lines 117-138)

Add `daily_reflection_hour: number;` to the `AppSettingsRow` interface (a type, safe to edit — line 488 of RESEARCH.md confirms this). **Do NOT edit `CREATE_APP_SETTINGS_TABLE_SQL`'s string** — that SQL is "already-shipped DDL" per the file's own comment convention (lines 124-130 explain exactly why `dailyReflectionHour` was excluded originally); the new column must arrive via `migrations.ts`'s `ALTER TABLE`, not via changing the CREATE statement (this is also Pitfall 5 in RESEARCH.md).

---

### `src/db/migrations.ts` (modify — migration, batch)

**Analog:** itself (existing cascade pattern, lines 22-58)

**Exact append pattern** (the file's own trailing comment at lines 48-51 already tells the next author exactly what to write):
```typescript
// src/db/migrations.ts:43-46 (existing, do not touch)
if (currentDbVersion === 2) {
  await db.execAsync(CREATE_APP_SETTINGS_TABLE_SQL);
  currentDbVersion = 3;
}

// NEW block to append, per this file's own header note (lines 48-51):
if (currentDbVersion === 3) {
  await db.execAsync(
    'ALTER TABLE app_settings ADD COLUMN daily_reflection_hour INTEGER NOT NULL DEFAULT 21'
  );
  currentDbVersion = 4;
}
```
Also bump `export const DATABASE_VERSION = 3;` → `4` (line 18). **Never modify any existing `if (currentDbVersion === N)` block** — the file's own header comment (lines 5-7, "migration_discipline #2/#3") and Pitfall 5 in RESEARCH.md both flag this as the single highest-risk mistake for this file.

---

## Shared Patterns

### Single-retry-then-fail write wrapper
**Source:** `src/checkin/checkinRepo.ts` lines 31-49 (`runWithSingleRetry`)
**Apply to:** `reflectionRepo.ts` (`upsertReflection`) — import directly, do not reimplement. This is the single mechanism backing REQ-reflection-save-failure-ui, and it is already proven in `commitCheckin` and (per Phase 5 precedent) `CheckinDetailScreen.tsx`'s note-save flow.

### AppState background-flush guard
**Source:** `src/checkin/CheckinDetailScreen.tsx` lines 321-329
**Apply to:** `ReflectionModal.tsx` and the reflection-editing portion of `PastDateScreen.tsx`. The `if (nextAppState === 'active') return;` line is non-negotiable — every consumer of this pattern in the repo has it, and omitting it causes spurious flushes on every foreground return (Pitfall 4).

### Inline "저장하지 못했어요" / "다시 시도" failure text
**Source:** `src/settings/SettingsScreen.tsx` lines 192-199 + styles 246-257
**Apply to:** `ReflectionModal.tsx` (D-01, one instance for both prompts) and `PastDateScreen.tsx`'s inline reflection section (same failure text, same styling — muted color only, no icon, no red).

### Native-first, DB-second write ordering
**Source:** `src/settings/SettingsScreen.tsx` lines 75-98 (`persist` function + its header comment explaining the ordering rationale)
**Apply to:** any code path in `SettingsScreen.tsx` that writes `dailyReflectionHour` — must go through the existing `persist()` unchanged; do not create a parallel write path.

### `?`-parameter-only SQL binding, SQL confined to repo files
**Source:** repo-wide convention, explicit in `src/checkin/checkinRepo.ts` line 4, `src/settings/settingsRepo.ts` lines 5-10, `src/db/migrations.ts` lines 53-56
**Apply to:** `reflectionRepo.ts`, `settingsRepo.ts` extension, `migrations.ts` extension. The only permitted string-interpolation exception in the entire codebase is the single `PRAGMA user_version = ${currentDbVersion}` line in `migrations.ts` (interpolating an internally-tracked integer, never external input) — this exception must not be treated as precedent for any other file.

### Static source "wiring" test style
**Source:** `src/app/__tests__/settings-wiring.test.ts` (full file above)
**Apply to:** `src/app/__tests__/reflection-wiring.test.ts` (new). Reuse `stripComments` + `fs.readFileSync` + regex assertions against copy constants, presence/absence of forbidden tokens (e.g. `colors.accent`, `tabBarStyle`, raw SQL keywords in screen files), and structural assertions like `<Stack.Screen name="reflection" ... presentation:\s*'modal' .../>`.

### Copy-constants-as-single-source-of-truth (`X_COPY = {...} as const`)
**Source:** `src/today/content.ts`, `src/settings/content.ts`
**Apply to:** `src/reflection/content.ts` (new `REFLECTION_COPY`) and the `settings/content.ts` extension (`REFLECTION_HOUR_*` constants) — never inline literal Korean strings inside screen components.

## No Analog Found

None — every file in this phase's scope has at least one exact or near-exact structural analog already in the codebase (this matches RESEARCH.md's own framing: "이 phase는 새 아키텍처를 만드는 phase가 아니다"). The two areas RESEARCH.md itself flags as having no *behavioral* precedent (5-second debounce autosave, `presentation: 'modal'` routing, notification-tap deep link) still have concrete *structural* analogs listed above (`pendingDelete.ts` for the controller shape, the settings route for the thin-wrapper shape, `NotificationSelfHealGate` for the "gate component in provider tree" shape) — RESEARCH.md's own Pattern 1/4 and Code Examples sections already contain fully-formed target code for these, so this file references those sections directly rather than re-deriving them.

## Metadata

**Analog search scope:** `src/checkin/`, `src/today/`, `src/settings/`, `src/calendar/`, `src/db/`, `src/app/`, `src/app/__tests__/`, `src/notifications/`, `src/components/`, `src/theme/tokens.ts`
**Files scanned (read in full or targeted ranges):** `src/checkin/checkinRepo.ts`, `src/today/pendingDelete.ts`, `src/today/TodayBottomSheet.tsx`, `src/today/CheckinListRow.tsx`, `src/today/content.ts`, `src/today/trajectory.ts`, `src/settings/settingsRepo.ts`, `src/settings/content.ts`, `src/settings/SettingsScreen.tsx`, `src/db/schema.ts`, `src/db/migrations.ts`, `src/checkin/deps.ts`, `src/checkin/localDate.ts`, `src/checkin/CheckinDetailScreen.tsx` (targeted ranges), `src/calendar/PastDateScreen.tsx` (targeted grep + ranges), `src/components/CheckinActionCard.tsx` (targeted grep), `src/app/_layout.tsx`, `src/notifications/scheduling.ts`, `src/notifications/config.ts`, `src/app/(tabs)/index/index.tsx` (targeted grep), `src/app/__tests__/settings-wiring.test.ts`
**Pattern extraction date:** 2026-09-02
