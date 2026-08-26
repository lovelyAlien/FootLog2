# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-08-26
**Files analyzed:** 11
**Analogs found:** 0 / 11 (no pre-existing codebase — this repo has no `package.json`, no `src/`, no `app/` yet)

## Context Note

This is a brand-new repository. `git status` / `ls` confirm there is no `package.json`, no `src/` directory, and no `app/` directory — Phase 1's first task (`npx create-expo-app`) is what creates the codebase itself. Because of this, **there are zero in-repo analogs** for any file in this phase. Every "Analog" below is instead the official Expo/expo-sqlite/expo-google-fonts framework convention cited in `01-RESEARCH.md`'s Sources section, with the exact excerpt to copy already present in that research doc (Architecture Patterns → Pattern 1 / Pattern 2 / Code Examples). No `.claude/skills` or `.agents/skills` directories exist in this project, so no additional skill-specific rules apply beyond `CLAUDE.md` (design-system-first) and `DESIGN.md` (token source of truth).

Since there is no in-repo precedent, **all files in this phase fall under "No Analog Found"** in the strict sense of "existing file in this codebase to copy from." The table below instead maps each file to the specific official-doc recipe it must follow, which is functionally the same job PATTERNS.md does when analogs exist — the planner should treat the RESEARCH.md excerpts referenced below as authoritative, ready-to-copy code (already verified against docs.expo.dev in RESEARCH.md's Sources).

## File Classification

| New File | Role | Data Flow | Official Analog (framework doc) | Match Quality |
|----------|------|-----------|----------------------------------|---------------|
| `package.json` | config | batch (one-time scaffold) | `npx create-expo-app@latest --template default` output | framework-generated (no hand-write) |
| `tsconfig.json` | config | N/A | Expo TypeScript guide — `extends: "expo/tsconfig.base"` | framework-standard |
| `app.json` | config | N/A | `create-expo-app` default template output | framework-generated |
| `eas.json` | config | batch (build profile) | docs.expo.dev/build/eas-json — `development` profile schema | official-recipe (exact) |
| `app/_layout.tsx` | provider | event-driven (splash-gate on font-load + db-init events) | docs.expo.dev/develop/user-interface/fonts + docs.expo.dev/versions/latest/sdk/sqlite | official-recipe (exact) |
| `src/theme/tokens.ts` | config/utility | transform (static value export) | No framework file to copy — pure DESIGN.md → `as const` transcription | project-source-of-truth (DESIGN.md), no code analog needed |
| `src/db/migrations.ts` | migration | CRUD (DDL) / batch | docs.expo.dev/versions/latest/sdk/sqlite — `migrateDbIfNeeded` recipe | official-recipe (exact) |
| `src/db/schema.ts` (optional split) | model | CRUD | Same expo-sqlite recipe, DDL block extracted | official-recipe (exact) |
| `jest.config.js` | config | N/A | `jest-expo` preset docs | framework-standard |
| `src/theme/tokens.test.ts` | test | N/A | `@testing-library/react-native` / plain jest value-assertion convention | community-standard, no in-repo test to copy |
| `src/db/migrations.test.ts` | test | CRUD (in-memory DB round-trip) | jest-expo Node-platform preset + expo-sqlite in-memory DB pattern | official-recipe, but needs a mocking strategy (see Note below) |

## Pattern Assignments

### `app/_layout.tsx` (provider, event-driven)

**Analog:** No in-repo file. Official pattern: `docs.expo.dev/develop/user-interface/fonts/` (splash-gating on `useFonts`) combined with `docs.expo.dev/versions/latest/sdk/sqlite/` (`SQLiteProvider onInit`). Already assembled and verified in `01-RESEARCH.md` Pattern 2, second code block.

**Full pattern to copy verbatim** (from `01-RESEARCH.md` lines 293-319):
```typescript
// app/_layout.tsx (루트 레이아웃 — 스플래시 게이팅 + DB 초기화)
// Source: https://docs.expo.dev/develop/user-interface/fonts/ + https://docs.expo.dev/versions/latest/sdk/sqlite/
import { Newsreader_400Regular_Italic, useFonts } from '@expo-google-fonts/newsreader';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { migrateDbIfNeeded } from '../src/db/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Newsreader_400Regular_Italic });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SQLiteProvider databaseName="footlog.db" onInit={migrateDbIfNeeded}>
      {/* Slot / 화면 트리 — 이후 phase에서 구성 */}
    </SQLiteProvider>
  );
}
```

**Critical rule (Pitfall 3 in RESEARCH.md):** `migrateDbIfNeeded` must be passed as the `onInit` prop — never called directly in component body or a bare `useEffect`. `SQLiteProvider` guarantees exactly one invocation right after DB connection opens.

---

### `src/theme/tokens.ts` (config/utility, static export)

**Analog:** None (no theme engine or constants file exists in this repo). Per RESEARCH.md "Don't Hand-Roll" and "Alternatives Considered," no library (Tamagui, react-native-unistyles) should be introduced — this must be a plain `as const` object transcribed directly from DESIGN.md.

**Pattern to copy verbatim** (from `01-RESEARCH.md` lines 190-236, already DESIGN.md-sourced):
```typescript
// src/theme/tokens.ts
// Source: DESIGN.md 값을 그대로 이식 (2026-08-25 기준)
export const colors = {
  background: '#F4F1EA',
  surface: '#FBFAF6',
  surfaceSoft: '#ECE8DF',
  textPrimary: '#2F302C',
  textMuted: '#79786F',
  textFaint: '#A7A49A',
  accent: '#7C8660',       // 정확히 6개 승인된 용도로만 사용 — DESIGN.md 참고
  accentSoft: '#D8DDC9',
  line: '#DDD8CD',
  mapLand: '#E9E4D8',
  mapRoad: '#D2CDC1',
  mapWater: '#DDE3DF',
} as const;

export const typography = {
  screenTitle: { fontFamily: 'System', fontSize: 22, fontWeight: '600' },
  placeName: { fontFamily: 'System', fontSize: 16, fontWeight: '500' },
  timestamp: {
    fontFamily: 'ui-monospace',           // iOS 시스템 모노스페이스 (SF Mono 계열)
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as const,
  },
  journalEntry: {
    fontFamily: 'Newsreader_400Regular_Italic', // @expo-google-fonts/newsreader
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 15 * 1.5,
  },
  helperText: { fontFamily: 'System', fontSize: 13, fontWeight: '400' },
} as const;

export const spacing = { '2xs': 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 } as const;

export const motion = {
  bottomSheetSnapMs: 220,
  confirmPinDropMs: 160,
  saveStateCrossfadeMs: 180,
  easing: { enter: 'ease-out', exit: 'ease-in', move: 'ease-in-out' },
} as const;

export const radius = { sm: 4, md: 8, lg: 16, full: 9999 } as const;
```

**Constraint:** Every value must trace back to DESIGN.md exactly — CLAUDE.md instructs "Do not deviate without explicit user approval." Do not invent additional tokens beyond what DESIGN.md specifies.

---

### `src/db/migrations.ts` (migration, CRUD/DDL)

**Analog:** No in-repo file. Official recipe: `docs.expo.dev/versions/latest/sdk/sqlite/` `migrateDbIfNeeded(db)`. Schema (`checkins`, `daily_reflections` tables) is locked from PROJECT.md/REQUIREMENTS.md, reproduced in RESEARCH.md.

**Pattern to copy verbatim** (from `01-RESEARCH.md` lines 242-292):
```typescript
// src/db/migrations.ts
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/ (공식 마이그레이션 레시피)
import { type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY NOT NULL,
        timestamp_utc TEXT NOT NULL,
        local_date_key TEXT NOT NULL,
        timezone_at_capture TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        accuracy_meters REAL,
        location_source TEXT NOT NULL,
        note TEXT,
        photo_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS daily_reflections (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        new_place_answer TEXT,
        free_reflection TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    currentDbVersion = 1;
  }

  // 다음 phase에서 컬럼 추가가 필요하면 여기에 새 블록 추가:
  // if (currentDbVersion === 1) { await db.execAsync('ALTER TABLE ...'); currentDbVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}
```

**Critical rules (Anti-Patterns / Pitfalls in RESEARCH.md):**
- Never `DROP TABLE` and recreate on every boot.
- Never edit an already-shipped `if (currentDbVersion === N)` block — always append a new block for future schema changes, to avoid breaking devices that already migrated past that version.
- Never string-interpolate user input into `execAsync` DDL/DML (this file only ever runs literal DDL — no user input at this phase). Establish parameterized-query (`?` placeholder) precedent for `runAsync` calls in later phases (Security Domain note in RESEARCH.md).

---

### `eas.json` (config, batch build profile)

**Analog:** None in-repo. Official schema: `docs.expo.dev/build/eas-json/`.

**Pattern to copy verbatim** (from `01-RESEARCH.md` lines 368-385):
```json
// eas.json
// Source: https://docs.expo.dev/build/eas-json/ (development 프로필 표준 구조)
{
  "cli": {
    "version": ">= 20.5.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  }
}
```

---

### `jest.config.js`, `src/theme/tokens.test.ts`, `src/db/migrations.test.ts` (test)

**Analog:** None — no test infra exists in this repo yet (`Framework install` gap flagged in RESEARCH.md Wave 0 Gaps). Official preset: `jest-expo`.

- `jest.config.js` should use `preset: 'jest-expo'`.
- `package.json` needs `"overrides": { "@react-native/jest-preset": "0.86.0" }` per Pitfall 2 (peer-dependency conflict between `jest-expo@57.0.0` and SDK 57's `react-native@0.86.0`).
- `src/db/migrations.test.ts` needs an in-memory or temp SQLite DB — `expo-sqlite` does not run natively under plain Node, so this requires either `jest-expo`'s Node-platform preset or a mocking strategy. RESEARCH.md flags this explicitly as a pre-requisite stub that must be resolved before the test can be written (see Wave 0 Gaps, `01-RESEARCH.md` line 474). The planner should treat this as its own preparatory task, not assume it "just works" with jest-expo's default preset.

---

## Shared Patterns

### Design token source-of-truth (CLAUDE.md constraint)
**Source:** `DESIGN.md` (project root)
**Apply to:** `src/theme/tokens.ts` exclusively, and any file that later imports from it.
Per CLAUDE.md: "Always read DESIGN.md before making any visual or UI decisions... Do not deviate without explicit user approval." No token value in `tokens.ts` should be invented — every value must have a direct DESIGN.md source.

### Migration append-only discipline
**Source:** `01-RESEARCH.md` Pattern 2 Anti-Patterns section
**Apply to:** `src/db/migrations.ts`, and every future phase that touches this file.
Never rewrite an existing `if (currentDbVersion === N)` block; always add a new one and bump `DATABASE_VERSION`.

### Parameterized queries only (forward-looking security precedent)
**Source:** `01-RESEARCH.md` Security Domain section
**Apply to:** `src/db/migrations.ts` (DDL only, no user input this phase) and all future `runAsync` call sites in later phases — establish the `?` placeholder convention here so later phases inherit it.

### Async DB init must go through `onInit`, never ad hoc
**Source:** `01-RESEARCH.md` Pitfall 3
**Apply to:** `app/_layout.tsx` — `migrateDbIfNeeded` must only ever be wired as `SQLiteProvider`'s `onInit` prop.

## No Analog Found

All 11 files in this phase have no in-repo analog (empty repository, first phase). This is expected and consistent with the phase brief. Each has an official framework recipe substituted above instead — see per-file entries.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `package.json` | config | batch | Repo has no prior scaffold; generated by `create-expo-app`, not hand-written |
| `tsconfig.json` | config | N/A | Same — template-generated, extend `expo/tsconfig.base` |
| `app.json` | config | N/A | Same — template-generated |
| `eas.json` | config | batch | No prior EAS config exists; use official schema verbatim |
| `app/_layout.tsx` | provider | event-driven | No prior root layout; first React tree entry point in this repo |
| `src/theme/tokens.ts` | config/utility | transform | No prior theme/constants module; DESIGN.md is the only source |
| `src/db/migrations.ts` | migration | CRUD | No prior DB layer; expo-sqlite official recipe is the only reference |
| `src/db/schema.ts` | model | CRUD | Optional split of migrations.ts; same reasoning |
| `jest.config.js` | config | N/A | No prior test infra in repo |
| `src/theme/tokens.test.ts` | test | N/A | No prior test files |
| `src/db/migrations.test.ts` | test | CRUD | No prior test files; also needs a mocking-strategy decision before writable |

## Metadata

**Analog search scope:** Entire repository root (`ls -la`), explicit checks for `package.json`, `src/`, `app/`, `.claude/skills/`, `.agents/skills/` — all absent, confirming zero prior codebase to pattern-match against.
**Files scanned:** 0 source files found (repo pre-scaffold); `01-RESEARCH.md` (527 lines, single read), `CLAUDE.md`, `DESIGN.md` referenced for project-level constraints.
**Pattern extraction date:** 2026-08-26
