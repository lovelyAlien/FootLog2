# Phase 2: Notification Infrastructure - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 12
**Analogs found:** 10 / 12

## Context

Phase 1 left the codebase in a greenfield state for notifications — no `src/notifications/` directory, no `expo-notifications` dependency, no manual jest mocks. There is no direct "notification" analog anywhere in the repo. Every pattern assignment below is a **role/data-flow analog** carried over from Phase 1's DB migration and app-shell code, which is the only precedent for "guarded async side-effect against an injected native-ish dependency, verified by static + logic tests."

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/notifications/registry.ts` | service | event-driven | `src/db/migrations.ts` | role-match (guarded idempotent async op) |
| `src/notifications/registry.test.ts` | test | event-driven | `src/db/migrations.test.ts` | role-match |
| `src/notifications/scheduling.ts` | service | CRUD | `src/db/migrations.ts` | role-match (module constants + minimal-interface param) |
| `src/notifications/scheduling.test.ts` | test | CRUD | `src/db/migrations.test.ts` | role-match |
| `src/notifications/permissions.ts` | service/hook | request-response | `src/app/index.tsx` (useEffect + async fetch pattern) | partial-match |
| `src/notifications/permissions.test.ts` | test | request-response | `src/db/migrations.test.ts` | role-match (test structure only) |
| `src/notifications/content.ts` | config | transform | `src/theme/tokens.ts` | exact (static const module, single source of truth) |
| `src/notifications/infoPlist.test.ts` | test | file-I/O | `src/app/__tests__/foundation-wiring.test.ts` | exact (static source-file assertion pattern) |
| `src/notifications/__mocks__/expo-notifications.ts` | test/utility | request-response | `src/db/testing/nodeSqliteAdapter.ts` | partial-match (test double implementing prod interface shape) |
| `app.json` (modify `ios.infoPlist`) | config | file-I/O | `app.json` (existing `ITSAppUsesNonExemptEncryption` block, itself) | exact (append to existing block) |
| `src/app/_layout.tsx` (modify) | provider/integration | event-driven | `src/app/_layout.tsx` (itself, existing `onInit` wiring) | exact (append AppState listener beside existing SQLiteProvider wiring) |
| `src/app/index.tsx` (modify, banner candidate) | component | event-driven | `src/app/index.tsx` (itself, existing token usage) | exact (extend existing screen) |

## Pattern Assignments

### `src/notifications/registry.ts` (service, event-driven)

**Analog:** `src/db/migrations.ts`

**File header + Source citation convention** (lines 1-7):
```typescript
// src/db/migrations.ts
// Plan 01-03 Task 2 — PRAGMA user_version 기반 마이그레이션 러너.
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/ (공식 마이그레이션 레시피)
//
// 배선 규칙(RESEARCH.md Pitfall 3, migration_discipline #3): 이 함수는 절대 컴포넌트
// body나 맨 useEffect에서 직접 호출하지 않는다 — 반드시 `SQLiteProvider`의 `onInit` prop
// 으로만 전달한다(Plan 01-04가 배선을 담당한다).
```
Every source file in this repo opens with `// <relative/path>`, a one-line plan/phase reference, a `Source:` citation to the official doc it was derived from, and inline "규칙"/"주의" comments that reference the specific RESEARCH.md pitfall being guarded against. `registry.ts` should cite 02-RESEARCH.md Pattern 1 and Pitfall 1-4 the same way.

**Minimal-interface injection pattern** (lines 8-18):
```typescript
import { type SQLiteDatabase } from 'expo-sqlite';
import { ... } from './schema';

export const DATABASE_NAME = 'footlog.db';
export const DATABASE_VERSION = 1;

export type MigratableDb = Pick<SQLiteDatabase, 'getFirstAsync' | 'execAsync' | 'runAsync'>;
```
Rather than importing all of `expo-sqlite`'s surface, the function signature narrows to a `Pick<...>` of only the methods it needs. `registry.ts`'s `selfHeal()` should accept a similarly narrowed type over `typeof Notifications` (e.g. `Pick<typeof Notifications, 'getAllScheduledNotificationsAsync' | 'scheduleNotificationAsync'>`), which both documents the real dependency surface and makes the jest manual mock (below) trivial to satisfy.

**Guard-clause / idempotent core pattern** (lines 20-34):
```typescript
export async function migrateDbIfNeeded(db: MigratableDb): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync("PRAGMA journal_mode = 'wal';");
    await db.execAsync(CREATE_CHECKINS_TABLE_SQL);
    ...
    currentDbVersion = 1;
  }
```
`selfHeal()` (02-RESEARCH.md Pattern 1) should follow this exact shape: read live state first (`getAllScheduledNotificationsAsync()` in place of `PRAGMA user_version`), compute a diff, early-return when nothing to do (`isEnabled()` false, or `missing.length === 0` — the RESEARCH.md guard for Pitfall 2), then apply only the delta.

**Comment-as-regression-doc pattern** (lines 36-45): inline comments cite pitfall numbers directly (`migration_discipline #2`, `T-1-01`) so a future reader can trace *why* a line exists back to a specific documented failure mode. `registry.ts` should do the same for Pitfall 2 (don't revive disabled triggers), Pitfall 3 (set-based, not single-id, comparison), and Pitfall 4 (clean up orphaned identifiers outside the expected set).

---

### `src/notifications/scheduling.ts` (service, CRUD)

**Analog:** `src/db/migrations.ts` (same file, different excerpt)

Use the same module-level-constants pattern as `DATABASE_NAME`/`DATABASE_VERSION` for the deterministic identifiers 02-RESEARCH.md specifies:
```typescript
export const HOURLY_ID = 'checkin-hourly';
export const EVERY_3H_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
export const DAILY_REFLECTION_ID = 'daily_reflection';
```
`scheduleNotifications(frequency)` should mirror `migrateDbIfNeeded`'s shape: branch on the input (`'hourly' | 'every3h' | 'off'` — the RESEARCH.md V5 note confirms this is a closed TS union, no runtime validation library needed, matching how `migrations.ts` never validates `currentDbVersion` beyond the type system), cancel the identifiers outside the target set first (Pitfall 4), then register the target set. Reuse 02-RESEARCH.md Code Examples §1-2 verbatim for the `scheduleNotificationAsync`/`cancelScheduledNotificationAsync` calls themselves — those are already sourced from the expo/expo repo and don't need re-deriving from a codebase analog.

---

### `src/notifications/permissions.ts` (service/hook, request-response)

**Analog:** `src/app/index.tsx` (async-effect-with-mount-guard pattern) + 02-RESEARCH.md Pattern 4 (already-drafted hook)

**Mount-guard async effect pattern** (`src/app/index.tsx` lines 19-37):
```typescript
useEffect(() => {
  let isMounted = true;
  db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
    .then((row) => {
      if (isMounted) {
        setSchemaVersion(row?.user_version ?? null);
      }
    })
    .catch((error) => {
      if (isMounted) {
        console.error('Failed to read PRAGMA user_version', error);
      }
    });
  return () => {
    isMounted = false;
  };
}, [db]);
```
This is the only precedent in the codebase for an async fetch inside `useEffect` with an unmount guard and an explicit `console.error` fallback (never a silently swallowed rejection). `useNotificationPermissionBanner()` (02-RESEARCH.md Pattern 4) should follow the same discipline — RESEARCH.md's drafted version already uses `useCallback` + `AppState.addEventListener`, but add the `isMounted`-style guard from `index.tsx` around the `recheck()` call to avoid a set-state-after-unmount warning, since this repo's one existing async-effect precedent treats that as mandatory.

**Error handling convention:** never swallow a rejected promise silently — either `console.error` (as in `index.tsx`) or `console.log` for expected/handled paths (as 02-RESEARCH.md Pattern 1 does for self-heal). Apply the same to `getPermissionsAsync()`/`requestPermissionsAsync()` calls in `permissions.ts`.

---

### `src/notifications/content.ts` (config, transform)

**Analog:** `src/theme/tokens.ts`

**Single-source-of-truth const module pattern** (lines 1-23):
```typescript
// src/theme/tokens.ts
// Source: DESIGN.md (저장소 루트) 값을 그대로 전사 — 2026-08-26 기준.
// 새 토큰을 여기서 발명하지 않는다. 값이 바뀌면 DESIGN.md를 먼저 갱신하고 이 파일에
// 반영한다 (CLAUDE.md: "Do not deviate without explicit user approval").
import { JOURNAL_FONT_FAMILY } from './fonts';

export const colors = {
  background: '#F4F1EA', // 웜 오프화이트
  ...
} as const;
```
`content.ts` should follow this exact shape for the two fixed notification bodies (checkin / daily_reflection): a header comment stating the copy is transcribed verbatim from `docs/designs/footlog-product-design.md` T2/T9 (not invented here), and `export const NOTIFICATION_CONTENT = { checkin: { title: ..., body: ... }, dailyReflection: { ... } } as const;`. This keeps `scheduling.ts` from hardcoding strings inline, matching how `tokens.ts` is the single place `colors`/`typography` values live.

---

### `src/notifications/infoPlist.test.ts` (test, file-I/O)

**Analog:** `src/app/__tests__/foundation-wiring.test.ts`

**Static source-file assertion pattern** (lines 1-17, 34-39):
```typescript
/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}
...
describe('src/app/_layout.tsx 배선 계약', () => {
  const layoutSource = readSource('_layout.tsx');
  it('Test 1: onInit={migrateDbIfNeeded}로 SQLiteProvider에 마이그레이션을 전달한다', () => {
    expect(layoutSource).toMatch(/onInit=\{migrateDbIfNeeded\}/);
  });
```
`infoPlist.test.ts` should read `app.json` with `fs.readFileSync` + `JSON.parse` (no need for `stripComments` since JSON has no comments) and assert the 4 keys exist with the exact D-03 Korean strings:
```typescript
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../app.json'), 'utf-8'));
const infoPlist = appJson.expo.ios.infoPlist;
expect(infoPlist.NSLocationWhenInUseUsageDescription).toBe('체크인 위치를 기록하려면 위치 정보가 필요해요.');
```
Use `@jest-environment node` (every non-RN-render test file in this repo declares this docblock explicitly — `migrations.test.ts` and `foundation-wiring.test.ts` both do) and the `describe`/`it('Test N: ...')` Korean-numbered-test naming convention used throughout.

---

### `src/notifications/__mocks__/expo-notifications.ts` (test/utility, request-response)

**Analog:** `src/db/testing/nodeSqliteAdapter.ts` (partial — no jest manual-mock precedent exists in this repo, but the "test double implementing the same narrowed interface as production" pattern transfers directly)

**Test-double-matches-production-interface pattern** (lines 32-65):
```typescript
export function createTestDb(path: string = ':memory:'): {
  db: MigratableDb;
  raw: DatabaseSync;
  close: () => void;
} {
  const raw = new DatabaseSync(path);
  const adapter = {
    execAsync: async (sql: string): Promise<void> => { raw.exec(sql); },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => { ... },
    runAsync: async (sql: string, ...params: unknown[]) => { ... },
  };
  return { db: adapter as unknown as MigratableDb, raw, close: () => raw.close() };
}
```
Note the comment style at lines 15-18 and 48-51: every place the fake's behavior subtly diverges from the real API (field-name casing, bind-arg shapes) is called out explicitly in a comment, because a silent mismatch there is exactly the kind of bug this whole test infra exists to prevent. `__mocks__/expo-notifications.ts` needs the same discipline: implement `scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `getAllScheduledNotificationsAsync`, `getPermissionsAsync`, `requestPermissionsAsync` as an in-memory `Map<string, NotificationRequest>`-backed fake (per 02-RESEARCH.md Wave 0 Gaps), and comment any place its behavior is a simplification of the real native module (e.g., it will not reproduce the "iOS silently drops the trigger after some days" failure mode — tests simulate that by calling `cancelScheduledNotificationAsync` manually, per Pitfall 1's "Warning signs").

This is a genuinely new pattern for the repo (jest manual mock via `__mocks__/` directory) — see "No Analog Found" below for the caveat.

---

### `app.json` (config, file-I/O) — modify existing `ios.infoPlist`

**Analog:** the file itself, existing block

**Current state** (full file, `ios.infoPlist` at lines 15-17):
```json
"ios": {
  "icon": "./assets/expo.icon",
  "bundleIdentifier": "com.jaeseungchoun.footlog",
  "supportsTablet": false,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
},
```
Append the 3 D-03 keys inside the existing `infoPlist` object (do not create a second `ios` block or a `plugins` entry — 02-RESEARCH.md Pattern 3 confirms `expo-location`/`expo-image-picker` aren't installed yet, so config-plugin options don't exist as an alternative in this phase):
```json
"infoPlist": {
  "ITSAppUsesNonExemptEncryption": false,
  "NSLocationWhenInUseUsageDescription": "체크인 위치를 기록하려면 위치 정보가 필요해요.",
  "NSCameraUsageDescription": "체크인에 사진을 남기려면 카메라 접근이 필요해요.",
  "NSPhotoLibraryUsageDescription": "체크인에 사진을 첨부하려면 사진 보관함 접근이 필요해요."
}
```
No `NSUserNotificationsUsageDescription`-equivalent key exists (D-05 — iOS has no Info.plist key for notification permission copy), so only 3 keys are added, not 4.

---

### `src/app/_layout.tsx` (provider/integration, event-driven) — modify existing

**Analog:** the file itself, existing `SQLiteProvider onInit` wiring

**Current wiring to extend** (full file, lines 10-48):
```typescript
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
...
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(newsreaderFonts);
  useEffect(() => { ... }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) { return null; }
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
```
Add the `AppState.addEventListener('change', ...)` listener (02-RESEARCH.md Pattern 4 / Architecture Diagram) as a second `useEffect`, following the existing `useEffect` for splash-screen hiding as the sibling precedent — same file, same component, same hook-ordering convention. Per the file's existing pitfall-citation style (lines 6-9 warn against calling `migrateDbIfNeeded` outside `onInit`), add an equivalent comment warning against calling `selfHeal()`/permission-recheck logic anywhere other than this one `AppState` listener, to prevent a future duplicate-listener regression.

---

### `src/app/index.tsx` (component, event-driven) — modify existing (banner candidate)

**Analog:** the file itself, existing token usage + regression-guarded conventions

**Existing muted-text + guarded-styles pattern** (lines 10-13, 60-83):
```typescript
import { colors, spacing, typography } from '../theme/tokens';
...
<Text style={[styles.timestampText, schemaVersion === null ? styles.textFaint : styles.textMuted]}>
  {schemaVersion === null ? '···' : `schema v${schemaVersion}`}
</Text>
...
const styles = StyleSheet.create({
  textMuted: { color: colors.textMuted },
  textFaint: { color: colors.textFaint },
});
```
If the denied-permission banner is wired into this screen in Phase 2 (per CONTEXT.md's "배너 렌더링 후보 위치" note), it must use `colors.textMuted` + `typography.helperText` exactly as 02-RESEARCH.md Common Pitfall 6 and this file's existing pattern dictate — no new hex literals (the repo-wide regression test `foundation-wiring.test.ts` Test 5 will fail the build if any `.ts`/`.tsx` file outside `theme/tokens.ts` contains a hex color literal), and no semantic color for the "denied" state (DESIGN.md: errors = muted text, not red/orange). The banner must sit on a fixed opaque background, never overlaid on the map (not applicable to `index.tsx` today since there's no map yet, but the same token discipline applies wherever it lands).

---

## Shared Patterns

### File header / provenance convention
**Source:** every existing `src/` file (e.g. `src/db/migrations.ts` lines 1-7, `src/theme/tokens.ts` lines 1-8)
**Apply to:** all 9 new files
```typescript
// src/notifications/registry.ts
// Plan 02-0X Task Y — <one-line purpose>.
// Source: <official doc URL or 02-RESEARCH.md Pattern N>
//
// <rationale / pitfall being guarded, with explicit reference to which
//  02-RESEARCH.md Pitfall # or CONTEXT.md Decision # this line exists for>
```

### Minimal-interface dependency injection
**Source:** `src/db/migrations.ts` line 18 (`Pick<SQLiteDatabase, ...>`)
**Apply to:** `registry.ts`, `scheduling.ts`, `permissions.ts` — narrow the imported `Notifications`/`AppState` surface to exactly the methods used, both for documentation and to make manual mocking trivial.

### `@jest-environment node` for pure-logic tests
**Source:** `src/db/migrations.test.ts` line 1-3, `src/app/__tests__/foundation-wiring.test.ts` line 1-3
**Apply to:** `registry.test.ts`, `scheduling.test.ts`, `permissions.test.ts`, `infoPlist.test.ts` — none of these render RN components, so they should all opt into the lighter `node` test environment rather than the default `jest-expo/ios` RN environment.

### Korean numbered `it('Test N: ...')` naming
**Source:** `src/db/migrations.test.ts` (Test 1-9), `foundation-wiring.test.ts` (Test 1-9)
**Apply to:** all new `*.test.ts` files — one flat incrementing `Test N:` counter per `describe` block (not per file), each name stating the exact behavior/contract being verified in Korean, often citing the pitfall or requirement ID it guards (e.g. `"자가진단이 '꺼짐' 설정인 트리거는 재생성하지 않는다 (Pitfall 2)"`).

### Never silently swallow a rejected promise
**Source:** `src/app/index.tsx` lines 27-32 (`console.error` on catch), 02-RESEARCH.md Pattern 1 (`console.log` on self-heal)
**Apply to:** all async notification calls — `console.error` for unexpected failures, `console.log` for expected/handled self-heal or recreate paths (per D-07, this is the *only* visibility surface — no UI signal).

### `stripComments` for regex-based source assertions
**Source:** `src/test-utils/stripComments.ts`, used by `migrations.test.ts` Test 8 and `foundation-wiring.test.ts` Test 2/5
**Apply to:** any new test that does static regex assertions on `.ts`/`.tsx` source (e.g. if `registry.test.ts` needs to assert `selfHeal` is referenced exactly once, or if a wiring test needs to assert `AppState.addEventListener` appears exactly once in `_layout.tsx`) — reuse this existing utility rather than writing a new comment-stripper.

### Design token discipline (no hex literals, no semantic color)
**Source:** `src/theme/tokens.ts`, enforced by `foundation-wiring.test.ts` Test 5
**Apply to:** any new UI (banner). Only `colors.*`/`typography.*`/`spacing.*` from `src/theme/tokens.ts`; denied/error states use `colors.textMuted`, never a new red/orange semantic color (DESIGN.md).

### Relative imports (no `@/` alias in practice)
**Source:** every existing file uses `../db/migrations`, `../theme/tokens`, etc., despite `tsconfig.json` defining a `@/*` path alias
**Apply to:** all new files — follow the established convention of relative imports; don't introduce the `@/` alias unilaterally (the `foundation-wiring.test.ts` regex at line 74 tolerates but doesn't require the alias, confirming relative paths are the actual convention).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/notifications/__mocks__/expo-notifications.ts` | test/utility | request-response | No `__mocks__/` directory or jest manual-mock precedent exists anywhere in the repo yet — this is Phase 2's first. Use `nodeSqliteAdapter.ts`'s "fake implementing the narrowed prod interface" *shape* (see Pattern Assignments above) plus standard jest manual-mock conventions (docs.expo.dev / jestjs.io) for the mechanics of `jest.mock('expo-notifications', ...)` resolution via `__mocks__/`. |

## Metadata

**Analog search scope:** `src/` (entire tree — repo is small enough for exhaustive read), `app.json`, `tsconfig.json`, `package.json`, `jest.config.js`
**Files scanned:** 17 (`.ts`/`.tsx` files under `src/`) + 4 config files
**Pattern extraction date:** 2026-08-27
