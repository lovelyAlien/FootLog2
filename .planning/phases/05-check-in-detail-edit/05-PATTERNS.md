# Phase 5: Check-in Detail & Edit - Pattern Map

**Mapped:** 2026-08-31
**Files analyzed:** 11 (new: 7, modified: 4 code + 6 wiring-test path fixes)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/(tabs)/index/_layout.tsx` (new) | route/provider | request-response (nav) | `src/app/(tabs)/_layout.tsx` | role-match (Stack vs Tabs, same "nav shell config" role) |
| `src/app/(tabs)/index/index.tsx` (moved, no logic change) | route | — | `src/app/(tabs)/index.tsx` (itself, relocated) | exact (pure move) |
| `src/app/(tabs)/index/[id].tsx` (new) | route | request-response | `src/app/(tabs)/index.tsx` (thin-wrapper convention described in RESEARCH §Recommended Project Structure) | role-match |
| `src/checkin/CheckinDetailScreen.tsx` (new, presentational) | component (screen) | request-response + CRUD | `src/app/(tabs)/index.tsx` (AppState/beforeRemove/photo-pick sections) + `src/components/CheckinActionCard.tsx` (presentational card shape) | role-match (composite) |
| `src/checkin/checkinRepo.ts` (modified — add `getCheckinById`, `deleteCheckin`) | service/repo | CRUD | `src/checkin/checkinRepo.ts` (existing `getTodayCheckins`/`updateCheckinNoteAndPhoto` in same file) | exact (same file, same conventions) |
| `src/checkin/localDate.ts` (modified — add `formatLocalMonthDay`) | utility | transform | `src/checkin/localDate.ts` (existing `formatLocalTime`) | exact |
| `src/checkin/config.ts` (modified — add `deleteFile` to `PhotoStorageDeps`) | config/types | — | `src/checkin/config.ts` (existing `PhotoStorageDeps.copyIntoDocumentDirectory`) | exact |
| `src/checkin/deps.ts` (modified — implement `deleteFile`) | service (native adapter) | file-I/O | `src/checkin/deps.ts` (existing `defaultPhotoStorageDeps.copyIntoDocumentDirectory`) | exact |
| `src/today/CheckinListRow.tsx` (modified — Pressable + swipe wrap) | component | event-driven | `src/today/CheckinListRow.tsx` (itself, D-03 reversal) + `src/components/CheckinActionCard.tsx` (Pressable + accessibilityRole pattern) | exact + role-match |
| `src/today/UndoSnackbar.tsx` (new) | component (presentational) | event-driven | `src/components/CheckinActionCard.tsx` / `src/components/LocationDeniedBanner.tsx` (presentational, no absolute positioning, parent-owned placement) | role-match |
| `src/app/(tabs)/index/index.tsx` (parent, modified — pendingDelete/undo wiring) | route (state owner) | event-driven | `src/app/(tabs)/index.tsx` (existing AppState listener + `flushNoteAndPhoto` orchestration pattern) | exact |
| `src/app/__tests__/*-wiring.test.ts` (5 files, path constant updates) | test | — | `src/app/__tests__/tabs-wiring.test.ts` (path constant + `readSource`/`stripComments` convention) | exact |
| `src/app/__tests__/checkin-detail-wiring.test.ts` (new) | test | — | `src/app/__tests__/tabs-wiring.test.ts` | exact (same static-analysis technique) |
| `src/checkin/checkinRepo.test.ts` / `localDate.test.ts` (modified) | test | CRUD/transform | same files, existing test style (`@jest-environment node` + real SQLite via `createTestDb`) | exact |

## Pattern Assignments

### `src/app/(tabs)/index/_layout.tsx` (route provider, nested Stack)

**Analog:** `src/app/(tabs)/_layout.tsx` (structure) + RESEARCH.md Pattern 1 (exact code already vetted)

**Full existing sibling for reference** (`src/app/(tabs)/_layout.tsx:13-35`):
```tsx
import { Tabs } from 'expo-router';
import { colors } from '../../theme/tokens';
import { TODAY_COPY } from '../../today/content';

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
      <Tabs.Screen name="index" options={{ title: TODAY_COPY.tabToday }} />
      <Tabs.Screen name="calendar" options={{ title: TODAY_COPY.tabCalendar }} />
    </Tabs>
  );
}
```

**New file to write** (RESEARCH.md-vetted, copy near-verbatim, adjust import depth to `../../../theme/tokens`):
```tsx
// src/app/(tabs)/index/_layout.tsx
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
**Pitfall to respect (RESEARCH Pitfall 2):** this Stack does NOT inherit the root `_layout.tsx`'s `headerShown: false` — set `headerShown` explicitly per screen as shown.

---

### `src/app/(tabs)/index/index.tsx` (moved file — pure relocation)

**Analog:** the file itself, `src/app/(tabs)/index.tsx` (1218 lines) — moved as-is, zero logic changes in this task. Only two things change inside it:
1. Relative import depth (`../../theme/tokens` → `../../../theme/tokens`, etc.) since it's one directory deeper.
2. Add `pendingDelete`/undo-snackbar state (see "Pattern 7: delayed delete" below) and wrap `CheckinListRow` usage with navigation-on-tap + swipe.

**Key existing conventions to preserve exactly (do not refactor while moving):**
- Imports block, `src/app/(tabs)/index.tsx:22-45` (see "Shared Patterns > Imports" below).
- `stateRef` mirror-latest-state-into-ref idiom used by the AppState listener (`src/app/(tabs)/index.tsx:258` area) — reuse the same idiom for the new detail screen's dirty-note ref.

---

### `src/app/(tabs)/index/[id].tsx` (new — thin route wrapper)

**Analog:** RESEARCH.md's explicit recommendation (§Recommended Project Structure) — route file is a thin wrapper; the real screen JSX lives in `src/checkin/CheckinDetailScreen.tsx` so Phase 6 can reuse it from a different route.

**Shape to follow** (no direct analog file exists yet in this repo for a "thin route wrapper around id param" — closest precedent is how `(tabs)/index.tsx` itself pulls `useSQLiteContext()` at the top and passes `db` down; here the pattern is inverted — the route pulls `id` and passes it down):
```tsx
// src/app/(tabs)/index/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckinDetailScreen } from '../../../checkin/CheckinDetailScreen';

export default function CheckinDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  return <CheckinDetailScreen db={db} checkinId={id} />;
}
```
`useSQLiteContext()` usage confirmed at `src/app/(tabs)/index.tsx:35` import + call site — same provider, same hook.

---

### `src/checkin/CheckinDetailScreen.tsx` (new — presentational-ish detail screen)

**Analogs:**
1. `src/components/CheckinActionCard.tsx` — presentational component contract (no absolute positioning, phase-driven conditional rendering, `journalEntry` typography reserved for the note field only).
2. `src/app/(tabs)/index.tsx` lines 918-939 — AppState background-flush listener to clone (D-02/REQ-checkin-detail-flush).
3. `src/app/(tabs)/index.tsx` lines 944-984 — `ActionSheetIOS` photo pick pattern to reuse for photo replace (D-03).
4. `src/app/(tabs)/index.tsx` lines 1005-1047 + 1186-1218 — locked `MapView`/`Marker`/pin styles for the static map preview.
5. RESEARCH.md Pattern 4 — `beforeRemove` unsaved-warning Alert (D-01).

**Component contract to copy** (`src/components/CheckinActionCard.tsx:1-22` comment block — same rules apply: no internal absolute positioning, parent decides placement, phase/prop-driven conditional mount not disable):
```tsx
// 재사용 가능한 프레젠테이셔널 컴포넌트 계약(NotificationDeniedBanner.tsx와 동일):
// 이 컴포넌트는 상태 전이 로직을 내부에 두지 않고 props로 받은 `phase`에 따라
// 렌더만 분기한다. 배치(absolute positioning 등)는 항상 부모가 결정한다.
```

**AppState background flush — clone this exact idiom** (`src/app/(tabs)/index.tsx:918-939`, quoted verbatim):
```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // ... foreground-return handling (detail screen: likely no-op or reload)
      return;
    }
    const current = stateRef.current;
    // ... background 전환 시 조용히 flush
    if (canEditNoteAndPhoto(current)) {
      flushNoteAndPhoto();
    }
  });
  return () => subscription.remove();
}, [flushNoteAndPhoto, reloadTodayCheckins]);
```
**Adaptation for detail screen:** replace `canEditNoteAndPhoto(current)` gate with a local `isDirtyRef.current` check (detail screen has no `checkinFlow` phase machine — dirty tracking is a plain boolean/ref since D-01 uses explicit-warning, not the SAVED-phase gate). Keep the `stateRef`/`isDirtyRef` mirror-into-ref idiom so the listener's dep array stays `[flushNoteAndPhoto]` only (avoids re-subscription per keystroke — same rationale as the existing comment at line 907 about `reloadTodayCheckins` being a stable ref-backed callback).

**beforeRemove unsaved-warning — copy directly from RESEARCH.md Pattern 4** (already vetted against `expo-router/build/react-navigation/core/useOnPreventRemove.js`):
```tsx
import { useNavigation } from 'expo-router';
import { Alert } from 'react-native';
import { useEffect } from 'react';

useEffect(() => {
  const sub = navigation.addListener('beforeRemove', (e) => {
    if (!isDirtyRef.current) return;
    e.preventDefault();
    Alert.alert('저장하지 않은 변경사항이 있어요', undefined, [
      { text: '계속 편집', style: 'default' },
      {
        text: '저장하지 않고 나가기',
        style: 'default', // destructive 금지 — UI-SPEC 확정
        onPress: () => navigation.dispatch(e.data.action),
      },
      {
        text: '저장하고 나가기',
        style: 'default',
        onPress: () => {
          flushNoteAndPhoto();
          navigation.dispatch(e.data.action);
        },
      },
    ]);
  });
  return sub;
}, [navigation]);
```
Copy `CHECKIN_COPY`-style single-source-of-copy convention from `src/checkin/checkinFlow.ts:120-134` — add the 3 new button labels + title to that same `CHECKIN_COPY` object (or a sibling `CHECKIN_DETAIL_COPY` constant in the same file/pattern) rather than hardcoding strings inline; the wiring tests (see below) will assert against the constant, mirroring how `tabs-wiring.test.ts` Test 15 asserts `TODAY_COPY` keys.

**Static map preview — lock down the existing MapView** (`src/app/(tabs)/index.tsx:1005-1047`, marker/pin styles at `1186-1218`; RESEARCH.md Pattern 2 already adapts this exact snippet):
```tsx
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={{ width: '100%', height: 160, borderRadius: radius.md }}
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
`pinWrapper`/`pinDrop`/`pinSaved` style objects — copy verbatim from `src/app/(tabs)/index.tsx:1186-1207` (do not re-derive the teardrop geometry):
```tsx
pinWrapper: { width: 28, height: 34, alignItems: 'center' },
pinDrop: {
  width: 28, height: 28,
  borderTopLeftRadius: 14, borderTopRightRadius: 14,
  borderBottomRightRadius: 14, borderBottomLeftRadius: 0,
  transform: [{ rotate: '-45deg' }],
},
pinSaved: { backgroundColor: colors.pinSoft },
```

**Photo replace — reuse the ActionSheetIOS block** (`src/app/(tabs)/index.tsx:944-984`, quoted pattern to adapt — swap `dispatch`/`state.checkinId` for the detail screen's local props/id and call `updateCheckinNoteAndPhoto` the same way):
```tsx
ActionSheetIOS.showActionSheetWithOptions(
  { options: [...PHOTO_ACTION_SHEET_OPTIONS], cancelButtonIndex: PHOTO_ACTION_SHEET_CANCEL_INDEX },
  (buttonIndex) => {
    const source = PHOTO_SOURCE_BY_ACTION_SHEET_INDEX[buttonIndex];
    if (!source) return;
    pickAndCopyPhoto(source).then((result) => {
      if (result === null) return;
      if ('error' in result) { /* set photo error state */ return; }
      // D-03/D-04/Pitfall 5 order: new file saved+DB updated first, THEN delete old file (non-blocking)
      const previousPhotoPath = checkin.photo_path;
      updateCheckinNoteAndPhoto(db, checkin.id, {
        note: currentNote, photoPath: result.uri, now: toIsoTimestamp(),
      }).then(() => {
        if (previousPhotoPath) {
          deleteFile(previousPhotoPath).catch((err) =>
            console.error('Failed to delete replaced photo file', err)
          );
        }
      });
    });
  }
);
```
Import `PHOTO_ACTION_SHEET_OPTIONS`, `PHOTO_ACTION_SHEET_CANCEL_INDEX`, `PHOTO_SOURCE_BY_ACTION_SHEET_INDEX`, `pickAndCopyPhoto` from `src/checkin/photos.ts` — do not redefine these constants (Don't Hand-Roll principle already established in this file's own header comment).

**Photo delete (D-04, immediate, no undo):**
```tsx
function handleDeletePhoto() {
  const previousPhotoPath = checkin.photo_path;
  updateCheckinNoteAndPhoto(db, checkin.id, {
    note: currentNote, photoPath: null, now: toIsoTimestamp(),
  }).then(() => {
    if (previousPhotoPath) {
      deleteFile(previousPhotoPath).catch((err) => console.error('Failed to delete photo file', err));
    }
  });
}
```

**Error handling pattern (single-retry reuse — Don't Hand-Roll):** `runWithSingleRetry` from `src/checkin/checkinRepo.ts:35-49` (quoted above in Shared Patterns) — wrap the note-save call for failure/retry UI, matching `CheckinActionCard.tsx`'s `SAVE_FAILED` branch shape (`src/components/CheckinActionCard.tsx:147-172`) if a retry UI is added per Claude's Discretion.

---

### `src/checkin/checkinRepo.ts` (add `getCheckinById`, `deleteCheckin`)

**Analog:** same file, existing `getTodayCheckins`/`updateCheckinNoteAndPhoto` (`src/checkin/checkinRepo.ts:123-145`, quoted in full above under Read output — same file conventions: `MigratableDb` param first, parameterized SQL only, no SQL elsewhere in the codebase).

**Exact functions to add** (already fully specified in RESEARCH.md Code Examples — copy verbatim):
```ts
export async function getCheckinById(
  db: MigratableDb,
  id: string
): Promise<CheckinRow | null> {
  const row = await db.getFirstAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE id = ?',
    id
  );
  return row ?? null;
}

export async function deleteCheckin(db: MigratableDb, id: string): Promise<void> {
  await db.runAsync('DELETE FROM checkins WHERE id = ?', id);
}
```
Follow the file's header-comment convention: SQL text lives only here, never in screen components (this rule is stated at `checkinRepo.ts:4-5` and enforced by the existing `checkin-wiring.test.ts` regex assertions — the new detail screen must call these functions, never inline SQL).

---

### `src/checkin/localDate.ts` (add `formatLocalMonthDay`)

**Analog:** same file, existing `formatLocalTime` (`src/checkin/localDate.ts:39-49`, quoted in full above).

**Exact function to add** (RESEARCH.md Code Examples, verbatim):
```ts
export function formatLocalMonthDay(
  isoTimestamp: string,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoTimestamp));
}
```
Same file convention: no manual `Date` parsing/string slicing — `Intl.DateTimeFormat` owns all timezone math (file header comment, lines 8-12).

---

### `src/checkin/config.ts` / `src/checkin/deps.ts` (add photo delete port — Pitfall 4)

**Analog:** existing `PhotoStorageDeps.copyIntoDocumentDirectory` (`config.ts:39-41`) and its implementation (`deps.ts:70-77`).

**Type addition** (`config.ts`, extend the existing type, don't create a parallel one):
```ts
export type PhotoStorageDeps = {
  copyIntoDocumentDirectory(sourceUri: string, fileName: string): Promise<string>;
  deleteFile(uri: string): Promise<void>;
};
```

**Implementation addition** (`deps.ts`, same file that is "the only file in src/checkin/ allowed to import expo-file-system at runtime" — header comment lines 2-6):
```ts
export const defaultPhotoStorageDeps: PhotoStorageDeps = {
  async copyIntoDocumentDirectory(sourceUri, fileName) {
    const sourceFile = new File(sourceUri);
    const destinationFile = new File(Paths.document, fileName);
    await sourceFile.copy(destinationFile);
    return destinationFile.uri;
  },
  async deleteFile(uri) {
    const file = new File(uri);
    await file.delete();
  },
};
```
Also update `src/checkin/testing/fakePhotoStorage.ts` (test double) to implement `deleteFile` — same pattern as the existing fake's `copyIntoDocumentDirectory` stub (not read in full here; follow its existing shape).

---

### `src/today/CheckinListRow.tsx` (Pressable + swipe wrap — D-03 reversal)

**Analog:** the file itself (currently intentionally non-tappable per Phase 4 D-03) + `src/components/CheckinActionCard.tsx`'s `Pressable`/`accessibilityRole="button"` convention (lines 73-82, 98-103, 134-139, 157-166 — every `Pressable` in this codebase sets `accessibilityRole="button"` and `accessibilityLabel`).

**Current file in full** (74 lines, quoted above) — the change is: wrap the existing `View` content in a `Pressable` (navigation on tap) and, per RESEARCH Pattern 3, wrap that in `ReanimatedSwipeable`:
```tsx
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SwipeDirection } from 'react-native-gesture-handler';

<ReanimatedSwipeable
  friction={2}
  rightThreshold={40}
  overshootRight={false}
  activeOffsetX={[-10, 10]}   // Pitfall 3 mitigation — BottomSheetFlatList gesture conflict
  failOffsetY={[-5, 5]}
  renderRightActions={() => (
    <View style={styles.deleteAffordance /* width:72, backgroundColor: colors.pin */}>
      <SymbolView name="trash" tintColor={colors.surface} />
    </View>
  )}
  onSwipeableOpen={(direction) => {
    if (direction === SwipeDirection.RIGHT) onDeleteRequest(checkin);
  }}
>
  <Pressable
    onPress={() => onPress(checkin.id)}
    accessibilityRole="button"
    accessibilityLabel={/* time + note preview */}
  >
    {/* existing row content unchanged */}
  </Pressable>
</ReanimatedSwipeable>
```
Note: `SymbolView` import precedent from `src/components/CheckinActionCard.tsx:25` (`import { SymbolView } from 'expo-symbols';`).
**Do not** import the deprecated class `Swipeable` — RESEARCH.md State of the Art table + Anti-Patterns confirm `react-native-gesture-handler/ReanimatedSwipeable` is the only sanctioned import path.
**Comment header must be updated** — the file's own D-03 comment (lines 8-13) explicitly documents "non-tappable" as the Phase 4 contract; this phase's task must update/replace that comment block to explain the D-03 reversal, matching this repo's convention of leaving a dated rationale trail in every touched file's header (see `src/app/(tabs)/index.tsx`'s "2026-08-28 추가" style inline dated comments).

---

### `src/today/UndoSnackbar.tsx` (new, presentational)

**Analog:** `src/components/CheckinActionCard.tsx` / `src/components/LocationDeniedBanner.tsx` — presentational component contract (no internal absolute positioning; parent owns placement and timers).

```tsx
export type UndoSnackbarProps = {
  visible: boolean;
  onUndo: () => void;
};

export function UndoSnackbar({ visible, onUndo }: UndoSnackbarProps) {
  if (!visible) return null;
  return (
    <View style={styles.snackbar /* backgroundColor: colors.textPrimary, motion.saveStateCrossfadeMs 180ms crossfade */}>
      <Text style={[typography.helperText, styles.label]}>{/* copy */}</Text>
      <Pressable onPress={onUndo} accessibilityRole="button" accessibilityLabel="실행취소">
        <Text style={[typography.placeName, styles.undoLabel]}>실행취소</Text>
      </Pressable>
    </View>
  );
}
```
Use `motion.saveStateCrossfadeMs` (`src/theme/tokens.ts:59`, value `180`) for the crossfade animation duration — do not invent a new motion token (UI-SPEC explicit requirement, and this repo's established "don't invent new tokens" rule stated in `tokens.ts`'s own header comment).

---

### `src/app/(tabs)/index/index.tsx` (parent — delayed-delete + undo state, Pattern 7)

**Analog:** `src/app/(tabs)/index.tsx`'s existing `flushNoteAndPhoto`/`reloadTodayCheckins` orchestration style (stable-ref-backed callbacks, `useCallback` deps kept minimal) — RESEARCH.md Pattern 7 is the concrete code to copy (already fully specified, quoted below verbatim from RESEARCH.md):
```tsx
const pendingDeleteRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

function handleDeleteRequest(checkin: CheckinRow) {
  commitPendingDeleteIfAny();
  setHiddenIds((prev) => new Set(prev).add(checkin.id));
  const timer = setTimeout(() => {
    deleteCheckin(db, checkin.id)
      .then(() => reloadTodayCheckins())
      .catch((error) => console.error('Failed to commit swipe delete', error));
    pendingDeleteRef.current = null;
    setSnackbarVisible(false);
  }, 4000);
  pendingDeleteRef.current = { id: checkin.id, timer };
  setSnackbarVisible(true);
}

function handleUndo() {
  if (!pendingDeleteRef.current) return;
  clearTimeout(pendingDeleteRef.current.timer);
  setHiddenIds((prev) => {
    const next = new Set(prev);
    next.delete(pendingDeleteRef.current!.id);
    return next;
  });
  pendingDeleteRef.current = null;
  setSnackbarVisible(false);
}
```
**Critical unmount-cleanup deviation from the "cancel on cleanup" reflex** (RESEARCH.md Pattern 7 + Assumption A1): the `useEffect` cleanup for this timer must **commit** (call `deleteCheckin`) rather than `clearTimeout`-and-forget — otherwise a swiped-away checkin silently reappears after navigating away without the user tapping undo. This is the opposite of the typical "cancel pending async work on unmount" idiom used elsewhere in this codebase (e.g. `isMountedRef` guards in `handlePickPhoto`) — flag this explicitly in the implementing task/plan so it isn't "corrected" to the more common pattern.

---

### `src/app/__tests__/*-wiring.test.ts` (5 existing files — path constant fix, Pitfall 1)

**Analog:** `src/app/__tests__/tabs-wiring.test.ts` (full file quoted above) — establishes the `fs.readFileSync` + `stripComments` static-analysis test technique used by all 5 affected files.

**Exact edits required** (RESEARCH.md Pitfall 1, fully enumerated — no further investigation needed):
- `src/app/__tests__/checkin-wiring.test.ts:13` — `TODAY_SCREEN_PATH` constant: `path.join('(tabs)', 'index.tsx')` → `path.join('(tabs)', 'index', 'index.tsx')`
- `src/app/__tests__/foundation-wiring.test.ts:14` — same constant, same fix
- `src/app/__tests__/notification-wiring.test.ts:14` — same constant, same fix
- `src/app/__tests__/today-wiring.test.ts:16` — same constant, same fix
- `src/app/__tests__/tabs-wiring.test.ts:22` — `todayIndexSource` read path, same fix
- `src/app/__tests__/tabs-wiring.test.ts:32` — Test 1's `fs.existsSync(...)` literal assertion (not a named constant — edit directly)

### `src/app/__tests__/checkin-detail-wiring.test.ts` (new)

**Analog:** `src/app/__tests__/tabs-wiring.test.ts` (structure: `readSource` helper + `stripComments` + `describe`/`it` blocks asserting regex matches against stripped source — same technique, new assertions for layout order, `beforeRemove`, AppState flush, `Linking.openURL` call order).

---

## Shared Patterns

### Imports convention (screen-level files)
**Source:** `src/app/(tabs)/index.tsx:22-45`
```tsx
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, Animated, AppState,
  KeyboardAvoidingView, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Redirect } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { MarkerDragStartEndEvent, Region } from 'react-native-maps';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```
**Apply to:** `CheckinDetailScreen.tsx`, `[id].tsx` route wrapper, `CheckinListRow.tsx`. Note the reanimated import binding convention (`Reanimated` capitalized, not `Animated`, to avoid shadowing RN's `Animated` — see comment at lines 39-43) — irrelevant unless the detail screen also uses reanimated crossfades, but must be followed if it does (UndoSnackbar's crossfade may use `Reanimated`/`useAnimatedStyle` per this same rule).

### Native-module isolation (deps.ts boundary)
**Source:** `src/checkin/deps.ts:1-6`, `src/checkin/config.ts:6-8`
**Apply to:** any new file touching `expo-file-system`. Rule: only `src/checkin/deps.ts` may `import` runtime native modules (`expo-file-system`, `expo-location`, `expo-image-picker`, `expo-crypto`, `expo-image-manipulator`); `config.ts` only takes `import type`; screens/components only consume the `Deps` port objects. The `PhotoStorageDeps.deleteFile` addition must follow this — `CheckinDetailScreen.tsx` must never `import { File } from 'expo-file-system'` directly (RESEARCH.md Pitfall 4 explicitly calls this out as the risk to avoid).

### Single-retry error handling
**Source:** `src/checkin/checkinRepo.ts:35-49` (`runWithSingleRetry`, quoted in full above)
**Apply to:** detail screen's note-save flush path, and optionally the delayed-delete commit and photo-replace save if a plan task chooses to reuse it (RESEARCH.md Open Question #1 recommends this for the delayed-delete commit-failure case too).

### Design tokens — no new tokens invented
**Source:** `src/theme/tokens.ts` (full file quoted above)
**Apply to:** all new/modified UI files. Specifically: swipe-delete affordance uses `colors.pin` (background, 2026-09-01 switched from `colors.accent` — see DESIGN.md Decisions Log) + `colors.surface` (icon tint) per UI-SPEC; static map pin uses `colors.pinSoft`; "지도 앱에서 열기" button text uses `colors.textMuted` (never `colors.accent`/`colors.pin` — this phase does not use accent at all, see `(tabs)/_layout.tsx` comment lines 7-12 for the precedent of accent-budget discipline enforced by wiring tests); undo snackbar crossfade uses `motion.saveStateCrossfadeMs` (180ms).

### Presentational component contract (no absolute positioning, parent-owned placement)
**Source:** `src/components/CheckinActionCard.tsx:4-7`, `src/today/CheckinListRow.tsx:4-6`, `src/today/TodayBottomSheet.tsx:4-8`
**Apply to:** `UndoSnackbar.tsx`, and to `CheckinDetailScreen.tsx` insofar as it should stay a pure function of `(checkin, dirty state, callbacks)` with the route wrapper (`[id].tsx`) owning data-fetching orchestration — though per RESEARCH.md's "thin wrapper" recommendation, `CheckinDetailScreen.tsx` will itself own most of the screen's local editing state (it is closer to `(tabs)/index.tsx` in responsibility than to a pure presentational leaf; the "no absolute positioning" half of the contract still applies).

### `CHECKIN_COPY` single-source-of-copy
**Source:** `src/checkin/checkinFlow.ts:117-134`
**Apply to:** all new user-facing strings (unsaved-warning dialog title/buttons, undo snackbar label, photo delete confirmation-less action's accessibility label). Never hardcode Korean string literals directly in JSX — add keys to `CHECKIN_COPY` (or a new sibling constant in the same file, following the `TODAY_COPY`/`CHECKIN_COPY` precedent) and reference the constant, matching the pattern wiring tests already enforce elsewhere (e.g. `tabs-wiring.test.ts` Test 6, Test 15).

## No Analog Found

None — every file in this phase's scope has at least a role-match analog already in the repository (RESEARCH.md's own conclusion: "새 npm 패키지를 하나도 설치하지 않는다" / "이 phase의 진짜 위험은 무엇을 새로 만들지가 아니라 이미 있는 걸 놓치고 새로 만드는 것").

## Metadata

**Analog search scope:** `src/app/`, `src/checkin/`, `src/today/`, `src/components/`, `src/theme/`, `src/app/__tests__/`
**Files scanned (read in full or targeted sections):** `src/app/(tabs)/index.tsx` (imports, AppState listener, MapView/marker/pin styles, ActionSheetIOS block), `src/app/(tabs)/_layout.tsx`, `src/app/__tests__/tabs-wiring.test.ts`, `src/today/CheckinListRow.tsx`, `src/today/TodayBottomSheet.tsx`, `src/checkin/checkinRepo.ts`, `src/checkin/checkinFlow.ts`, `src/checkin/config.ts`, `src/checkin/deps.ts`, `src/checkin/localDate.ts`, `src/checkin/photos.ts`, `src/components/CheckinActionCard.tsx`, `src/theme/tokens.ts`, `src/db/schema.ts` (CheckinRow fields)
**Pattern extraction date:** 2026-08-31
