# Phase 9: Backend Foundation - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 23 (new files, greenfield `backend/` folder + root `.github/workflows/backend-ci.yml`)
**Analogs found:** 6 / 23 (client-side SQLite schema/migration files only — no Kotlin/Spring/Gradle/Docker code exists anywhere in this repo)

## Important Context for the Planner

This phase is a **greenfield backend scaffold** in a repo that currently contains only an Expo/React Native client (TypeScript). There is:
- No `backend/` folder, no Kotlin file, no `build.gradle.kts`, no `Dockerfile`, no `.github/workflows/` directory anywhere in the repository (verified via `find`/`ls`, all empty results).
- No JVM/Gradle/Spring tooling precedent to copy from.

Because of this, **only the data-shape files** (Flyway migration SQL, JPA entities) have a genuine in-repo analog: the client's `src/db/schema.ts` (DDL string constants + row type definitions) and `src/db/migrations.ts` (sequential versioned migration runner) that the server schema must mirror field-for-field (per CONTEXT.md D-02/D-03 and RESEARCH.md Pattern 2/Assumption A2-A5).

For everything else — Gradle build config, Dockerfile, Docker Compose, GitHub Actions workflow, Spring `application*.yml` profiles, JPA repository interfaces — **there is no in-repo analog to copy from at all**. Forcing a weak match (e.g. treating `package.json` as an analog for `build.gradle.kts`) would mislead the planner more than it would help. For these files, the planner should use the fully-verified, ready-to-copy code blocks already present in `09-RESEARCH.md` (`## Architecture Patterns`, Pattern 1/3/4/5, plus the official `start.spring.io` scaffolding command in `## Standard Stack`) as the primary source — these were verified against official generators/docs, which is a stronger source than an unrelated in-repo file would be.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/main/resources/db/migration/V1__create_users_table.sql` | migration | CRUD (schema DDL) | `src/db/schema.ts` (DDL string constants) | conceptual (cross-language) |
| `backend/src/main/resources/db/migration/V2__create_checkins_table.sql` | migration | CRUD (schema DDL) | `src/db/schema.ts` `CREATE_CHECKINS_TABLE_SQL` (lines 43-59) + `CREATE_CHECKINS_INDEXES_SQL` (lines 75-77) | field-level exact (cross-language) |
| `backend/src/main/resources/db/migration/V3__create_daily_reflections_table.sql` | migration | CRUD (schema DDL) | `src/db/schema.ts` `CREATE_DAILY_REFLECTIONS_TABLE_SQL` (lines 61-70) | field-level exact (cross-language), with 1 intentional divergence (see below) |
| `backend/src/main/kotlin/.../checkin/Checkin.kt` | model (JPA entity) | CRUD | `src/db/schema.ts` `CheckinRow` interface (lines 16-30) | field-level exact (cross-language, interface→entity) |
| `backend/src/main/kotlin/.../dailyreflection/DailyReflection.kt` | model (JPA entity) | CRUD | `src/db/schema.ts` `DailyReflectionRow` interface (lines 32-39) | field-level exact (cross-language, interface→entity) |
| `backend/src/main/kotlin/.../user/User.kt` | model (JPA entity) | CRUD | none (new domain, no client-side `User` type exists) | no analog |
| `backend/src/test/kotlin/.../FlywayMigrationTest.kt` | test | integration (schema assertion) | `src/db/migrations.test.ts` (column-list assertion pattern, lines 20-80) | role-match (cross-language) |
| `backend/src/test/kotlin/.../HealthCheckSmokeTest.kt` | test | request-response (smoke) | none in repo (no HTTP server exists client-side) | no analog — use RESEARCH.md `@SpringBootTest(webEnvironment=RANDOM_PORT)` guidance |
| `backend/src/main/kotlin/.../user/UserRepository.kt` | repository | CRUD | none | no analog |
| `backend/src/main/kotlin/.../checkin/CheckinRepository.kt` | repository | CRUD | none | no analog |
| `backend/src/main/kotlin/.../dailyreflection/DailyReflectionRepository.kt` | repository | CRUD | none | no analog |
| `backend/src/main/kotlin/.../BackendApplication.kt` | bootstrap/config | request-response | none | no analog |
| `backend/build.gradle.kts` | config (build) | n/a | none (`package.json` is a distant conceptual cousin — different ecosystem, not worth copying from) | no analog |
| `backend/settings.gradle.kts` | config (build) | n/a | none | no analog |
| `backend/compose.yaml` | config (infra) | n/a | none | no analog |
| `backend/Dockerfile` | config (deployment) | file-I/O (image build) | none | no analog |
| `backend/.dockerignore` | config | n/a | `.gitignore` (repo root) — same *purpose* (exclude-list) but zero content overlap | weak/no analog |
| `backend/src/main/resources/application.yml` | config (env) | n/a | none (`app.json`/`eas.json` are Expo-specific, not env-profile pattern) | no analog |
| `backend/src/main/resources/application-local.yml` | config (env) | n/a | none | no analog |
| `backend/src/main/resources/application-staging.yml` | config (env) | n/a | none | no analog |
| `.github/workflows/backend-ci.yml` | config (CI) | event-driven (push/PR trigger) | none (no `.github/workflows/` directory exists in repo) | no analog |
| `backend/src/test/kotlin/.../TestcontainersConfiguration.kt` | test (config) | n/a | none — auto-generated by `start.spring.io`, not hand-written | no analog (generated, not authored) |
| `backend/src/test/kotlin/.../TestBackendApplication.kt` | test (bootstrap) | n/a | none — auto-generated by `start.spring.io` | no analog (generated, not authored) |

## Pattern Assignments

### `backend/src/main/resources/db/migration/V1__create_users_table.sql` (migration, CRUD/DDL)

**Analog:** `src/db/schema.ts` — the file's overall *pattern* (DDL as versioned, sequential, append-only artifacts), not a specific block, since `users` is a new server-only table with no client-side counterpart.

**Pattern to copy (philosophy, not literal SQL):** sequential, one-directional schema ownership — RESEARCH.md's `09-RESEARCH.md` Pattern 2 already contains the exact verified SQL for this file (placeholder-row insert included). Use that directly; this file's true "pattern source" is the migration *discipline* comment in `src/db/migrations.ts` lines 48-51:
```typescript
// 다음 phase에서 컬럼/테이블 추가가 필요하면 여기에 새 블록을 append한다:
// if (currentDbVersion === 3) { await db.execAsync('ALTER TABLE ...'); currentDbVersion = 4; }
// 이전 버전 블록들(위쪽 if문들)은 절대 사후 수정하지 않는다 — 이미 그 버전을 통과한
// 기기는 변경분을 받지 못한다(migration_discipline #2).
```
Flyway enforces this same rule structurally (checksummed, immutable `V*` files) — the planner should carry over the "never edit a shipped migration file, only append a new `V{n+1}__*.sql`" discipline documented here into any Flyway task instructions.

---

### `backend/src/main/resources/db/migration/V2__create_checkins_table.sql` (migration, CRUD/DDL)

**Analog:** `src/db/schema.ts` lines 43-59, 75-77

**Client DDL to mirror field-for-field** (imports/core pattern equivalent):
```typescript
export const CREATE_CHECKINS_TABLE_SQL = `
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
`;

export const CREATE_CHECKINS_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_checkins_local_date_key ON checkins(local_date_key);
`;
```

**Server-side mapping notes (already verified in RESEARCH.md Pattern 2, reuse that SQL directly):**
- Every column above must exist server-side with the same name (`snake_case` carries straight into Postgres). Type mapping: SQLite `TEXT` (timestamp/date fields) → Postgres `TIMESTAMPTZ`/`VARCHAR`; SQLite `REAL` → Postgres `DOUBLE PRECISION` (A5 in RESEARCH.md — deliberately kept float-for-float, not `NUMERIC`); SQLite `INTEGER` (schema_version) → Postgres `INTEGER`.
- Server adds `user_id UUID NOT NULL REFERENCES users(id)` (D-02) — no client equivalent, this is new.
- Server keeps `id` as a plain `UUID PRIMARY KEY` with **no default generator** — the client already owns ID generation (`crypto.randomUUID()`, confirmed via `src/checkin/photos.ts` per RESEARCH.md Pitfall 5); do not let a JPA `@GeneratedValue` or Postgres `DEFAULT gen_random_uuid()` sneak onto this table.
- The index pattern (`idx_checkins_local_date_key`) carries straight over — same column, same purpose (day-based lookups for the Today/Calendar views).

---

### `backend/src/main/resources/db/migration/V3__create_daily_reflections_table.sql` (migration, CRUD/DDL)

**Analog:** `src/db/schema.ts` lines 61-70

```typescript
export const CREATE_DAILY_REFLECTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS daily_reflections (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,
    new_place_answer TEXT,
    free_reflection TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
```

**Intentional divergence (flag for planner, do not silently "fix" to match client):** client has `UNIQUE(date)` (single-user, one row per day). Server must use `UNIQUE(user_id, date)` instead (RESEARCH.md Assumption A4) — this is correct and expected, not a bug to reconcile. `id`/`new_place_answer`/`free_reflection`/`created_at`/`updated_at` map 1:1; server adds `user_id UUID NOT NULL REFERENCES users(id)` same as checkins.

---

### `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt` (model/JPA entity, CRUD)

**Analog:** `src/db/schema.ts` `CheckinRow` interface (lines 16-30)

```typescript
export interface CheckinRow {
  id: string;
  timestamp_utc: string;
  local_date_key: string;
  timezone_at_capture: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  location_source: LocationSource;
  note: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  schema_version: number;
}
```

This is the field-level source of truth the Kotlin `@Entity` must mirror (camelCase property / `@Column(name = "...")` snake_case mapping) — RESEARCH.md Pattern 1 already contains the fully-written `Checkin.kt` entity built directly from this interface, including the `@ManyToOne user: User` FK addition and the explicit "no `@GeneratedValue`" comment. Use that RESEARCH.md code block directly rather than re-deriving it; this analog entry exists so the planner can trace *why* each field/type exists.

**Nullability note:** TS `number | null` / `string | null` → Kotlin nullable (`Double?`, `String?`); TS non-null fields → Kotlin non-null with no default (or `var` for mutable fields like `updated_at`/`note`/`photo_path` that change after insert, `val` for immutable ones like `id`/`created_at`) — already reflected correctly in RESEARCH.md Pattern 1.

---

### `backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflection.kt` (model/JPA entity, CRUD)

**Analog:** `src/db/schema.ts` `DailyReflectionRow` interface (lines 32-39)

```typescript
export interface DailyReflectionRow {
  id: string;
  date: string;
  new_place_answer: string | null;
  free_reflection: string | null;
  created_at: string;
  updated_at: string;
}
```

Same mapping approach as `Checkin.kt` above: this interface is the field-level source of truth; add `user: User` FK (D-02) that has no client-side counterpart. RESEARCH.md does not include a fully-written `DailyReflection.kt` code block (only `Checkin.kt` is spelled out in Pattern 1) — the planner should derive it by applying the exact same entity-authoring pattern (imports, `allOpen` requirement, `@Id` without `@GeneratedValue`, `@Column(name = "snake_case")`) shown in RESEARCH.md Pattern 1 to this interface's fields.

---

### `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` (test, integration)

**Analog:** `src/db/migrations.test.ts` (lines 1-80+, column-list assertion pattern)

```typescript
const CHECKINS_COLUMNS = [
  'id', 'timestamp_utc', 'local_date_key', 'timezone_at_capture', 'lat', 'lng',
  'accuracy_meters', 'location_source', 'note', 'photo_path', 'created_at',
  'updated_at', 'schema_version',
];
// ...
describe('migrateDbIfNeeded', () => {
  it('Test 1: 빈 DB에서 checkins/daily_reflections/... 테이블을 생성하고 user_version을 3으로 올린다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db);
      const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
      // assert table names present, then assert column lists per table
```

**Pattern to carry over (role-match, cross-language):** the *shape* of this test — (1) run the full migration path against a real (not mocked) DB engine, (2) assert the resulting table names exist, (3) assert the exact expected column list per table — is exactly what `FlywayMigrationTest.kt` should do against a Testcontainers Postgres instance, querying `information_schema.columns` instead of `sqlite_master`/`PRAGMA table_info`. Keep the same column-list constants approach (one array/list per table) so column drift is caught explicitly, not just "table exists."

---

## Shared Patterns

### Sequential, append-only schema versioning
**Source:** `src/db/migrations.ts` (whole file, esp. lines 22-58) and its inline discipline comments
**Apply to:** all three Flyway `V*__*.sql` files
The client's `migrateDbIfNeeded` — `if (currentDbVersion === N) { ...; currentDbVersion = N+1; }` blocks that are never edited after being shipped, only appended to — is the direct philosophical ancestor of Flyway's checksum-locked `V1`/`V2`/`V3` files (D-03's stated rationale in CONTEXT.md). The planner should instruct implementers: never edit `V1__create_users_table.sql` etc. after it has been applied anywhere; a schema change becomes a new `V4__*.sql` file.

### Client-owned IDs, server never regenerates them
**Source:** RESEARCH.md Pitfall 5 (citing `src/checkin/photos.ts` `crypto.randomUUID()` usage) — no single excerpt file, but a repo-verified fact
**Apply to:** `Checkin.kt`, `DailyReflection.kt`, `V2__create_checkins_table.sql`, `V3__create_daily_reflections_table.sql`
Every checkin/daily-reflection ID is generated client-side before the row exists anywhere. Server entities/tables must accept a caller-supplied UUID and never attach `@GeneratedValue` (entities) or a `DEFAULT gen_random_uuid()` (SQL) to these two ID columns. This is the single highest-risk copy-paste mistake (JPA tutorials default to server-generated IDs) — it should be called out explicitly in every task that touches these two files.

### snake_case DB columns / camelCase code properties
**Source:** `src/db/schema.ts` (row interfaces use snake_case matching SQL column names 1:1, e.g. `timestamp_utc`, `local_date_key`)
**Apply to:** all JPA entities
Client code keeps TS property names identical to SQL column names (no mapping layer). Kotlin/JPA instead uses idiomatic camelCase properties with explicit `@Column(name = "snake_case_name")` annotations (shown fully in RESEARCH.md Pattern 1) — same underlying convention (snake_case is the DB's naming law), different language-idiomatic surface.

## No Analog Found

Files with no close match anywhere in the repository. The planner should rely directly on the corresponding verified code in `09-RESEARCH.md` for these (all are cited there with `[VERIFIED]` or official-source provenance) rather than force a weak in-repo comparison:

| File | Role | Data Flow | RESEARCH.md Source |
|---|---|---|---|
| `backend/build.gradle.kts` | config (build) | n/a | `## Standard Stack` (verified dependency versions/coordinates) + Pattern 1 (`allOpen` block) |
| `backend/settings.gradle.kts` | config (build) | n/a | `## Standard Stack` scaffolding command (`start.spring.io` curl) |
| `backend/compose.yaml` | config (infra) | n/a | Pattern 3 intro text + Standard Stack `spring-boot-docker-compose` row |
| `backend/Dockerfile` | config (deployment) | file-I/O | Pattern 4 (full multi-stage Dockerfile, image tags Docker-Hub-verified) |
| `backend/.dockerignore` | config | n/a | Not explicitly given in RESEARCH.md — standard Gradle/JVM ignore list (`.gradle/`, `build/`, `*.jar` build artifacts) should be derived at planning time |
| `backend/src/main/resources/application.yml` | config (env) | n/a | Pattern 3 (`ddl-auto: validate`, actuator exposure lockdown) |
| `backend/src/main/resources/application-local.yml` | config (env) | n/a | Pattern 3 |
| `backend/src/main/resources/application-staging.yml` | config (env) | n/a | Pattern 3 (env-var-only datasource block) |
| `backend/src/main/kotlin/.../BackendApplication.kt` | bootstrap | n/a | Standard `start.spring.io` generated entrypoint — not reproduced in RESEARCH.md, trivially standard (`@SpringBootApplication` + `fun main`) |
| `backend/src/main/kotlin/.../user/User.kt` | model | CRUD | RESEARCH.md Pattern 2 V1 SQL implies the shape (`id UUID`, `created_at`); no code block given — derive using the same entity-authoring pattern as `Checkin.kt` in Pattern 1 |
| `backend/src/main/kotlin/.../{user,checkin,dailyreflection}/*Repository.kt` | repository | CRUD | Not spelled out in RESEARCH.md — standard `interface XRepository : JpaRepository<X, UUID>` one-liner per Spring Data JPA convention |
| `backend/src/test/kotlin/.../HealthCheckSmokeTest.kt` | test | request-response | `## Validation Architecture` Phase Requirements → Test Map row (`@SpringBootTest(webEnvironment=RANDOM_PORT)`) |
| `backend/src/test/kotlin/.../TestcontainersConfiguration.kt` | test config | n/a | Auto-generated by the `start.spring.io` scaffolding command — do not hand-write, verify presence only |
| `backend/src/test/kotlin/.../TestBackendApplication.kt` | test bootstrap | n/a | Auto-generated by the `start.spring.io` scaffolding command — do not hand-write, verify presence only |
| `.github/workflows/backend-ci.yml` | CI config | event-driven | Pattern 5 (full workflow YAML, path-filtered, `gradle/actions/setup-gradle`) — also see Pitfall 4 re: branch protection interaction |

## Metadata

**Analog search scope:** entire repository root (`.`), with explicit targeted checks of `src/db/` (schema/migrations), `backend/` (confirmed absent), `.github/workflows/` (confirmed absent), and any `Dockerfile*`/`*.gradle*` files (confirmed absent, searched via `find`).
**Files scanned:** `src/db/schema.ts`, `src/db/migrations.ts`, `src/db/migrations.test.ts`, `package.json`, `eas.json`, plus directory listings confirming zero JVM/Docker/CI artifacts exist in-repo.
**Pattern extraction date:** 2026-09-02
