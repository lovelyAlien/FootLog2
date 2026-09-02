---
phase: 09-backend-foundation
reviewed: 2026-09-02T09:21:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - .github/workflows/backend-ci.yml
  - backend/.dockerignore
  - backend/build.gradle.kts
  - backend/compose.yaml
  - backend/gradle/wrapper/gradle-wrapper.properties
  - backend/settings.gradle.kts
  - backend/src/main/kotlin/com/footlog/backend/BackendApplication.kt
  - backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt
  - backend/src/main/kotlin/com/footlog/backend/checkin/CheckinRepository.kt
  - backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflection.kt
  - backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflectionRepository.kt
  - backend/src/main/kotlin/com/footlog/backend/user/User.kt
  - backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt
  - backend/src/main/resources/application-local.yml
  - backend/src/main/resources/application-staging.yml
  - backend/src/main/resources/application.yml
  - backend/src/main/resources/db/migration/V1__create_users_table.sql
  - backend/src/main/resources/db/migration/V2__create_checkins_table.sql
  - backend/src/main/resources/db/migration/V3__create_daily_reflections_table.sql
  - backend/src/test/kotlin/com/footlog/backend/BackendApplicationTests.kt
  - backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt
  - backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt
  - backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt
  - backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt
  - backend/src/test/kotlin/com/footlog/backend/TestBackendApplication.kt
  - backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-02T09:21:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the Spring Boot backend scaffolding (Flyway migrations, JPA entities/repositories, profile
config, CI workflow, and the Testcontainers-backed test suite) added for Phase 9. The implementation
is disciplined: entity/column mappings were cross-checked field-by-field against the Flyway SQL and
the DB-level contract is pinned down by `FlywayMigrationTest`'s 12 assertions (column sets, types,
nullability, FK/UNIQUE constraints, default generators, indexes). The "client owns checkin/reflection
IDs, server never regenerates them" rule (Pitfall 5) is consistently enforced in both entities and
guarded by a round-trip test. `flyway_schema_history` success is verified, actuator exposure is
locked to `health` only and regression-tested with explicit 404 assertions on `/actuator/env` and
`/actuator/beans`, and staging's environment-variable-only `DataSource` wiring is exercised against a
real Testcontainers Postgres rather than mocked. All 25 tests in `build/test-results` show 0
failures/errors, corroborating that the code actually builds and runs as documented.

No Critical/blocker-level defects were found — no injection vectors, no secrets committed to
application config, no auth bypass (auth is explicitly out of scope for this phase per D-02). The
findings below are Warnings and Info items concerning reproducibility, deployment-format assumptions,
and long-term maintainability that should be addressed before/while building on this foundation.

## Warnings

### WR-01: `postgres:latest` used unpinned in three places, risking silent version drift

**File:** `backend/compose.yaml:3`, `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt:15`, `backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt:43`

**Issue:** All three Postgres container declarations use the floating `latest` tag instead of a
pinned major/minor version. Because `docker pull` re-resolves `latest` on every fresh pull (new
runner, cache eviction, etc.), a Postgres major-version bump upstream can silently change behavior
between CI runs or between a developer's machine and CI, producing "works locally, fails in CI" (or
vice versa) failures that are hard to diagnose. This also means the three container declarations can
drift out of sync with each other (e.g., local dev on PG 17, CI resolves PG 18 a month later) even
though the project clearly intends them to represent the same environment (comments in V1 assume
"Postgres 13+" semantics for `gen_random_uuid()`).

**Fix:** Pin to an explicit major version (and ideally minor/patch) consistently across all three
locations, e.g.:
```yaml
# compose.yaml
image: 'postgres:17'
```
```kotlin
// TestcontainersConfiguration.kt / StagingProfileBootTest.kt
PostgreSQLContainer(DockerImageName.parse("postgres:17"))
```

### WR-02: `Checkin.updatedAt` / `DailyReflection.updatedAt` have no automatic maintenance mechanism

**File:** `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt:60-61`, `backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflection.kt:43-44`

**Issue:** Both entities expose `updatedAt` as a plain mutable `var` with no `@PreUpdate` callback,
no Hibernate `@UpdateTimestamp`, and no other enforcement. Nothing currently stops a future
service/controller from mutating other fields (e.g., `note`, `freeReflection`) and calling
`save()`/relying on dirty checking without also bumping `updatedAt`, silently producing a stale
timestamp that downstream sync logic (Phase 12 client-server sync, per the file's own comments) is
likely to depend on for conflict resolution. Since this phase intentionally has no service layer yet,
this is a foundation-level gap that will be easy to forget once write endpoints are added.

**Fix:** Add a Hibernate lifecycle callback (or `@UpdateTimestamp`) now, while the entities are still
small, so every future writer gets correct behavior for free:
```kotlin
import org.hibernate.annotations.UpdateTimestamp

@Column(name = "updated_at", nullable = false)
@UpdateTimestamp
var updatedAt: OffsetDateTime,
```
(Note: `@UpdateTimestamp` overwrites on every managed-entity flush including the initial insert, so
verify it plays correctly with the current pattern of passing `updatedAt = now` explicitly at
construction time — or use a manual `@PreUpdate fun touch() { updatedAt = OffsetDateTime.now() }`
instead if the constructor-supplied value must remain authoritative on insert.)

### WR-03: `application-staging.yml`'s `${DATABASE_URL}` assumes a JDBC-prefixed URL, and the boot test can't catch a mismatch

**File:** `backend/src/main/resources/application-staging.yml:8-11`, `backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt:47-49`

**Issue:** `spring.datasource.url: ${DATABASE_URL}` requires the environment variable to already be a
JDBC URL (`jdbc:postgresql://host:5432/db`). Many hosting/PaaS providers (Heroku, Render, Railway,
Fly.io, Supabase, etc.) inject `DATABASE_URL` in the plain `postgres://user:pass@host:5432/db` URI
scheme, which Spring's `DataSourceProperties`/HikariCP cannot parse without the `jdbc:` prefix — this
is a very common real-world staging/production boot failure. `StagingProfileBootTest` registers
`DATABASE_URL` from `postgres.jdbcUrl` (Testcontainers' `getJdbcUrl()`), which is always correctly
`jdbc:postgresql://...`-prefixed, so the test gives green coverage for the happy path but provides no
signal if the real deployment target's env var convention differs.

**Fix:** Confirm the actual hosting platform's `DATABASE_URL` format before deploying to staging. If
it's the bare `postgres://` scheme, either have the deploy pipeline rewrite it to `jdbc:postgres://`
before injection, or parse/convert it in the app (e.g., a `@Bean` that strips/rewrites the scheme).
Consider adding a second `StagingProfileBootTest` case that registers a `postgres://`-scheme URL to
lock in whichever behavior is chosen.

### WR-04: Local Postgres credentials in `compose.yaml` are copy-paste-able into shared environments

**File:** `backend/compose.yaml:4-7`

**Issue:** `POSTGRES_PASSWORD=secret` / `POSTGRES_USER=myuser` are hardcoded plaintext in a file
committed to the repo. This matches the Spring Initializr default scaffold and the container is
local-only/ephemeral with a randomized host port, so the immediate risk is low — but nothing in the
file marks these as throwaway placeholder values, and `compose.yaml` files of this shape are commonly
copy-pasted wholesale into shared dev/staging docker-compose setups where the "local only, never
reused" assumption silently breaks down.

**Fix:** Add a comment marking these as local-only placeholder credentials that must never be reused
outside an ephemeral local container (the project already has this convention for
`application-local.yml`'s D-12 note — extend the same discipline here), e.g.:
```yaml
# 로컬 전용 임시 자격증명 — 공유/스테이징 환경에 절대 재사용하지 않는다.
environment:
  - 'POSTGRES_DB=mydatabase'
  - 'POSTGRES_PASSWORD=secret'
  - 'POSTGRES_USER=myuser'
```

## Info

### IN-01: CI workflow has no `permissions:` block

**File:** `.github/workflows/backend-ci.yml:1-35`

**Issue:** The workflow doesn't declare an explicit `permissions:` scope, so it relies on the
repository-level default `GITHUB_TOKEN` permissions (which may be broader than this job needs — it
only checks out code and runs a build).

**Fix:**
```yaml
permissions:
  contents: read
```

### IN-02: CI job has no `timeout-minutes`

**File:** `.github/workflows/backend-ci.yml:21-34`

**Issue:** Without an explicit timeout, a hung Testcontainers/Docker step (e.g., waiting on a
container that never becomes healthy) could run until GitHub's default job limit, wasting runner
minutes before failing.

**Fix:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

### IN-03: `HealthCheckSmokeTest` asserts on a raw JSON substring instead of parsing the response

**File:** `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt:40-43`

**Issue:** `response.body?.contains("\"status\":\"UP\"")` is a literal-format substring check. It
works today because Actuator's default Jackson serialization is compact with no spaces, but it's
brittle against any future change to JSON output formatting (e.g., `management.endpoint.health.*`
config changes, a Jackson version bump enabling pretty-printing, or the field appearing nested with
different spacing).

**Fix:** Deserialize into a `Map`/DTO and assert on the parsed value, e.g.:
```kotlin
val body = objectMapper.readValue(response.body, Map::class.java)
assertEquals("UP", body["status"])
```

### IN-04: Minor redundancy in `.dockerignore`

**File:** `backend/.dockerignore:10-11,19`

**Issue:** Line 11 (`.env*`) already matches line 10 (`.env`), making line 10 redundant. Similarly,
`HELP.md` on line 19 is already covered by the `*.md` glob on line 13.

**Fix:** Drop the redundant lines, or add a short comment if the duplication is intentional for
readability/explicitness.

---

_Reviewed: 2026-09-02T09:21:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
