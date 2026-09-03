# Phase 10: Authentication (Kakao OAuth2/PKCE) - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 20
**Analogs found:** 11 / 20 (structural/role-match; 9 files are genuinely new capability types with no in-repo analog — see "No Analog Found")

## CRITICAL: D-14 amendment changes RESEARCH.md Pattern 1

10-CONTEXT.md's D-14 was **amended during the planning-adjacent research pass (2026-09-02)**,
after 10-RESEARCH.md's "System Architecture Diagram" and "Pattern 1" text was drafted using the
*original* D-14 (code+PKCE→backend exchanges with `kauth.kakao.com/oauth/token`). The amended
decision is different and simpler:

- Client (native Kakao SDK) already holds a Kakao **accessToken** (SDK's `login()` returns it
  directly — no authorization code is ever surfaced to app code).
- Client sends that Kakao `accessToken` to the backend (field name suggestion: `kakaoAccessToken`,
  not `code`/`codeVerifier`/`redirectUri`).
- Backend calls **only** `GET https://kapi.kakao.com/v2/user/me` with that token, then **discards**
  the token immediately (never persisted). **Backend does NOT call `kauth.kakao.com/oauth/token`
  and does NOT need `client_secret` for this call** — `client_secret` in RESEARCH.md Pattern 1 was
  for the token-exchange step, which no longer exists in this phase's actual flow.
- `code_verifier`/PKCE is not used anywhere in the backend contract.

**Practical effect on RESEARCH.md's Recommended Project Structure:**
- `KakaoTokenClient.kt` (RestClient wrapper for `/oauth/token`) and `KakaoTokenResponse.kt` are
  **not needed**. Rename/replace with a `KakaoUserInfoClient.kt` that only wraps
  `GET /v2/user/me` (RESEARCH.md Pattern 2 code is still accurate and reusable as-is).
- `KakaoLoginRequest.kt` should be `{ kakaoAccessToken: String }`, not
  `{ code, codeVerifier, redirectUri }`.
- `KakaoAuthService.kt` skips the token-exchange step entirely — it only calls
  `fetchUserInfo(kakaoAccessToken)` then find-or-create (RESEARCH.md Pattern 2 + the
  find-or-create description in the System Architecture Diagram, minus the token-exchange arrow).
- RESEARCH.md's Pitfall 4 (`client_secret` always required) and the "카카오 인가 코드 재사용"
  threat pattern in the Security Domain section are now moot for this phase's backend — no code
  exchange happens server-side. Keep `kakao.client-secret` config wiring **only if** the planner
  decides to keep it for a future phase; do not block on provisioning it for Phase 10's actual
  code path.
- `POST /api/auth/refresh` (RESEARCH.md Pattern 4/5) is unaffected by this amendment — still
  needed as designed.

Everything else in RESEARCH.md (JWT issuance via `NimbusJwtEncoder`/`NimbusJwtDecoder`, V4
migration, SecurityConfig Lambda DSL, Don't Hand-Roll table, Pitfalls 1-3/5, dependency versions)
is unaffected by the D-14 amendment and should be used as-is.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/main/resources/db/migration/V4__add_kakao_fields_to_users_table.sql` | migration | CRUD (schema) | `backend/src/main/resources/db/migration/V1__create_users_table.sql` | role-match (same table; no prior ALTER TABLE migration exists — see below) |
| `backend/src/main/kotlin/com/footlog/backend/user/User.kt` (MODIFY) | model | CRUD | itself (pre-amendment) + `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt` | exact (self) / role-match (nullable `@Column` pattern) |
| `backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt` (MODIFY, add `findByKakaoId`) | model/repository | CRUD | itself | exact (self); no existing custom-finder repo method exists anywhere in repo to copy the derived-query idiom from |
| `backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt` | controller | request-response | — none in repo | no analog — first controller in this codebase |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthService.kt` | service | request-response (external API + CRUD) | — none in repo | no analog — first `@Service` class in this codebase |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoClient.kt` (was `KakaoTokenClient.kt` in RESEARCH.md — renamed per D-14 amendment) | service (external API client) | request-response | — none in repo | no analog |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoResponse.kt` | model (DTO) | transform | — none in repo | no analog — no other DTO class exists (only JPA `@Entity`) |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoLoginRequest.kt` | model (DTO) | transform | — none in repo | no analog |
| `backend/src/main/kotlin/com/footlog/backend/auth/TokenResponse.kt` | model (DTO) | transform | — none in repo | no analog |
| `backend/src/main/kotlin/com/footlog/backend/auth/JwtIssuerService.kt` | service | transform | — none in repo | no analog |
| `backend/src/main/kotlin/com/footlog/backend/config/JwtConfig.kt` | config | — | — none in repo | no analog |
| `backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt` | config/middleware | request-response | — none in repo | no analog — no Spring Security config exists yet |
| `backend/build.gradle.kts` (MODIFY) | config | — | itself | exact (self) |
| `backend/src/main/resources/application.yml` / `application-local.yml` / `application-staging.yml` (MODIFY) | config | — | itself | exact (self) |
| `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` (MODIFY) | test | CRUD (schema assertions) | itself | exact (self) |
| `backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt` | test | request-response (mocked external API) | `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt` | role-match (Testcontainers + repository assertions); `MockRestServiceServer` usage itself has no analog |
| `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt` | test | transform | — none in repo | no analog |
| `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt` | test | request-response | `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt` | role-match (`@SpringBootTest` + `TestRestTemplate` + HTTP status assertions) |
| `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt` | test | request-response | `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt` | role-match (same `TestRestTemplate` idiom, extended to POST + JSON body) |

## Pattern Assignments

### `backend/src/main/resources/db/migration/V4__add_kakao_fields_to_users_table.sql`

**Analog:** `backend/src/main/resources/db/migration/V1__create_users_table.sql` (same table) +
`backend/src/main/resources/db/migration/V2__create_checkins_table.sql` (append-only header
comment convention)

**Append-only discipline header convention** (V1, lines 1-11; V2, lines 1-11):
```sql
-- (a) 대응 클라이언트 DDL: ...
-- (b) 규율: 이 파일은 한 번 적용되면 절대 수정하지 않는다. 스키마 변경이 필요하면 이 파일을
--     고치지 말고 새 V{n+1}__*.sql 파일을 추가한다(... append-only 규율).
-- (c) ...
```
Every migration file in this repo opens with a lettered rationale comment block like this
explaining client-DDL correspondence, the append-only rule, and any type/default decisions. V4
should follow the same structure — RESEARCH.md's Pattern 3 already drafts this comment style
correctly (BIGINT for `kakao_id`, TEXT for `nickname`/`profile_image_url`, nullable + UNIQUE
co-existing per D-11).

**Table definition + placeholder row precedent** (V1, full file, lines 12-20):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001');
```
No existing migration in this repo performs `ALTER TABLE` — V1/V2/V3 are all `CREATE TABLE`. V4
is the first `ALTER TABLE` migration; there is no in-repo ALTER precedent to copy syntax from
(RESEARCH.md Pattern 3 is the concrete source to use instead — `ADD COLUMN` + `ADD CONSTRAINT
... UNIQUE`).

**Index declaration convention** (V2, lines 33-34, for reference if any index is later needed on
`kakao_id` beyond the UNIQUE constraint's implicit index):
```sql
CREATE INDEX idx_checkins_local_date_key ON checkins (local_date_key);
CREATE INDEX idx_checkins_user_id ON checkins (user_id);
```

---

### `backend/src/main/kotlin/com/footlog/backend/user/User.kt` (MODIFY)

**Analog:** itself (extend in place) + `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt` (nullable-column idiom)

**Current full file** (lines 1-22):
```kotlin
package com.footlog.backend.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "users")
class User(
    @Id
    val id: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,
)
```
Note the existing top-of-file comment (not reproduced verbatim here, see file) documents *why*
`User.id` has no `@GeneratedValue` — update/extend this comment when adding kakao fields since
the "server never creates users" premise it describes is exactly what this phase changes.

**Nullable `@Column` idiom to copy for `kakaoId`/`nickname`/`profileImageUrl`** (Checkin.kt,
lines 46-51):
```kotlin
@Column(name = "accuracy_meters")
var accuracyMeters: Double? = null,

@Column(name = "location_source", nullable = false, length = 32)
var locationSource: String,

var note: String? = null,
```
Follow this idiom: `@Column(name = "kakao_id") val kakaoId: Long? = null`,
`@Column(name = "nickname") var nickname: String? = null`,
`@Column(name = "profile_image_url") var profileImageUrl: String? = null` — `nickname`/
`profileImageUrl` should be `var` (mutable) since D-06 requires refreshing them on every login;
`kakaoId` can stay `val` (set once at account creation, never changes for an existing row). No
`length = N` on nickname/profileImageUrl since V4 defines them as `TEXT` (unbounded), matching
RESEARCH.md Pattern 3's rationale (A7) — unlike `locationSource`'s bounded `VARCHAR(32)` above.

---

### `backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt` (MODIFY)

**Analog:** itself

**Current full file** (lines 1-6):
```kotlin
package com.footlog.backend.user

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID>
```
Add a Spring Data derived query method for the find-or-create lookup:
```kotlin
interface UserRepository : JpaRepository<User, UUID> {
    fun findByKakaoId(kakaoId: Long): User?
}
```
No other repository in this codebase (`CheckinRepository`, `DailyReflectionRepository`) declares
a custom finder — both are bare `JpaRepository<T, UUID>` interfaces, so this is a new idiom for
the repo but a completely standard Spring Data JPA pattern (no analog needed beyond the interface
declaration shape above).

---

### `backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt`, `KakaoAuthService.kt`, `KakaoUserInfoClient.kt`, `JwtIssuerService.kt`, `config/JwtConfig.kt`, `config/SecurityConfig.kt`

**No analog in this codebase** — these are the first controller, first `@Service`, first
Spring Security config, and first JWT issuance code in the `backend/` module. Phase 9 only
produced entities/repositories/config-yml/Flyway migrations; no `@RestController`, `@Service`,
`@Configuration` (beyond `@SpringBootApplication`), or auth code exists to copy from.

**Use RESEARCH.md directly as the primary source for these files**, with the D-14 amendment
correction noted at the top of this document applied:
- `KakaoUserInfoClient.kt` ← RESEARCH.md Pattern 2 (`fetchUserInfo`, `KakaoUserInfoResponse` DTO)
  — reusable as-is, this part of RESEARCH.md was not affected by the D-14 amendment.
- `JwtIssuerService.kt` + `config/JwtConfig.kt` ← RESEARCH.md Pattern 4 (`NimbusJwtEncoder`/
  `NimbusJwtDecoder`, `token_use` claim, access/refresh TTL split) — reusable as-is.
- `config/SecurityConfig.kt` ← RESEARCH.md Pattern 5 (Lambda DSL `SecurityFilterChain`,
  `permitAll` on `/api/auth/**`) — reusable as-is.
- `AuthController.kt` + `KakaoAuthService.kt` ← RESEARCH.md System Architecture Diagram, **minus
  the `kauth.kakao.com/oauth/token` exchange step** (see amendment note above) — the flow is:
  receive `{ kakaoAccessToken }` → `KakaoUserInfoClient.fetchUserInfo(kakaoAccessToken)` →
  `UserRepository.findByKakaoId(...)` (update nickname/profileImageUrl if found, D-06) or create
  new `User` (D-08 UNIQUE guarantees no race-condition duplicate under normal single-writer load)
  → `JwtIssuerService.issueAccessToken`/`issueRefreshToken` → return `TokenResponse`.
- `KakaoLoginRequest.kt` — `data class KakaoLoginRequest(@field:NotBlank val kakaoAccessToken: String)`
  (see Validation pattern below for the `@field:NotBlank` idiom source).
- `TokenResponse.kt` — `data class TokenResponse(val accessToken: String, val refreshToken: String? = null, val expiresIn: Long)`.

**Validation idiom** — no existing DTO with `@NotBlank`/`@Valid` exists in this repo yet
(`spring-boot-starter-validation` is already a dependency per `build.gradle.kts` line 26, but
unused so far). Use standard Jakarta Bean Validation annotations
(`@field:NotBlank`, `@Valid` on the controller parameter) per RESEARCH.md's Security Domain V5
row — there is no in-repo precedent to deviate from this standard usage.

---

### `backend/build.gradle.kts` (MODIFY)

**Analog:** itself

**Existing dependency block conventions to extend** (lines 22-48):
```kotlin
dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("tools.jackson.module:jackson-module-kotlin")
	developmentOnly("org.springframework.boot:spring-boot-docker-compose")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	// TestRestTemplate(...)의 자동설정이 요구하는 RestTemplateBuilder(...)를 제공한다 — Boot 4.1부터
	// REST 클라이언트 지원이 별도 모듈로 분리되어 webmvc-test 스타터만으로는 부족하다
	// (09-05 실행 중 발견, ./gradlew dependencies로 좌표 존재 확인 후 추가).
	testImplementation("org.springframework.boot:spring-boot-starter-restclient-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```
Note every non-obvious dependency has a `//` comment explaining *why* it's there (Boot4 module
split, 09-05 discovery) — follow the same annotation discipline when adding the three new
`implementation(...)` lines from RESEARCH.md's "Installation" block (security,
security-oauth2-resource-server, restclient) and their `testImplementation` counterparts.
`spring-boot-starter-restclient-test` is **already present** (line 42) for a different reason
(TestRestTemplate) — do not duplicate it.

---

### `backend/src/main/resources/application.yml` / `application-local.yml` / `application-staging.yml` (MODIFY)

**Analog:** itself

**Common profile pattern** (application.yml, full file, lines 1-19) — `ddl-auto: validate` +
`open-in-view: false` + actuator `include: health` only. New JWT/Kakao config should NOT alter
`ddl-auto` (Flyway V4 remains sole schema owner, JPA only validates the extended `User` entity
against it, per the header comment on line 7-9).

**Secret-via-env-var pattern to copy for `jwt.secret`/`kakao.client-id`** (application-staging.yml,
full file, lines 1-12):
```yaml
# 스테이징 프로파일 — 비밀값(URL/사용자명/비밀번호)은 전부 환경변수 참조로만 주입한다(D-11).
# 평문 비밀값을 이 파일에 단 한 글자도 넣지 않는다(T-9-01).
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
```
Add analogous `jwt.secret: ${JWT_SECRET}` (no default in staging — RESEARCH.md Pitfall 2) and
`kakao.client-id: ${KAKAO_CLIENT_ID}` here, with the same "no plaintext secret in this file"
comment convention. `kakao.client-secret` is **not required by the amended D-14 flow** (see top
of this document) — only add it if the planner decides to keep the token-exchange code path for
a future phase.

**Local-only permissive default pattern** (application-local.yml, full file, lines 1-6):
```yaml
spring:
  docker.compose.enabled: true
```
RESEARCH.md Pitfall 2 proposes `${JWT_SECRET:local-dev-only-insecure-placeholder-32bytes-min}`
for local — this is a *new* idiom (Spring property placeholder default syntax) not previously
used in this file, but consistent with the file's stated purpose ("로컬 개발 프로파일").

---

### `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` (MODIFY)

**Analog:** itself

**Column-set assertion to extend** (line 26):
```kotlin
private val usersColumns = setOf("id", "created_at")
```
→ update to `setOf("id", "created_at", "kakao_id", "nickname", "profile_image_url")`. This feeds
Test 2 (lines 96-100):
```kotlin
@Test
fun `users 테이블 컬럼 집합이 정확히 id created_at이다`() {
    assertEquals(usersColumns, columnNames("users"))
}
```
(rename the test description once kakao columns are added).

**UNIQUE constraint assertion pattern to copy for `kakao_id`** (Test 8, lines 200-217, currently
asserting `UNIQUE(user_id, date)` on `daily_reflections`):
```kotlin
@Test
fun `daily_reflections에 user_id date UNIQUE 제약이 존재한다`() {
    val uniqueCount = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*) FROM (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'daily_reflections'
          GROUP BY tc.constraint_name
          HAVING COUNT(*) = 2 AND bool_and(kcu.column_name IN ('user_id', 'date'))
        ) sub
        """.trimIndent(),
        Int::class.javaObjectType,
    )
    assertEquals(1, uniqueCount, "...")
}
```
Adapt to a single-column `HAVING COUNT(*) = 1 AND bool_and(kcu.column_name = 'kakao_id')` variant
for `users`.

**Nullable-column assertion pattern to extend** (Test 6, lines 147-177) — add
`assertTrue(isNullable("users", "kakao_id"))` etc. to the existing nullable-columns list (D-11:
new V4 columns must be nullable).

**Flyway history assertion to extend** (Test 1, lines 84-94) — extend the `IN ('1', '2', '3')`
list and `listOf("1", "2", "3")` to include `'4'`.

**Placeholder-row-survives assertion** (Test 12, lines 244-253) — no change needed structurally,
but this is the concrete proof point for D-10/D-11 ("placeholder row still exists, now with NULL
kakao fields") — planner may want to add an explicit assertion that
`kakao_id`/`nickname`/`profile_image_url` are NULL for the placeholder row specifically.

---

### `backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt`

**Analog (structural, Testcontainers wiring):** `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt`

**Testcontainers + transactional test class shape to copy** (lines 32-48):
```kotlin
@Import(TestcontainersConfiguration::class)
@SpringBootTest
@Transactional
class EntityPersistenceTest {

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var entityManager: EntityManager
    ...
```
Reuse `@Import(TestcontainersConfiguration::class)` + `@SpringBootTest` exactly
(`backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt`, full file, lines
1-18, defines the shared `@ServiceConnection PostgreSQLContainer` bean — do not redefine a new
container). Add `@AutoConfigureMockRestServiceServer` (or manually build one, per RESEARCH.md
Validation Architecture) to stub `GET https://kapi.kakao.com/v2/user/me` — this specific idiom
has no in-repo precedent, follow Spring's official `MockRestServiceServer` docs referenced in
RESEARCH.md's Standard Stack table (`spring-boot-starter-restclient-test`, already a dependency
per build.gradle.kts line 42).

**Find-or-create assertion shape to mirror** (find pattern from EntityPersistenceTest Test 1,
lines 49-54):
```kotlin
@Test
fun `플레이스홀더 사용자를 findById로 조회할 수 있다`() {
    val found = userRepository.findById(PLACEHOLDER_USER_ID)
    assertTrue(found.isPresent, "...")
}
```
Mirror this shape for "kakao_id로 신규 사용자가 생성된다" / "기존 kakao_id 사용자의
nickname이 갱신된다" (D-06) test cases — query `userRepository.findByKakaoId(...)` after calling
`KakaoAuthService.login(...)`.

---

### `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt`, `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt`

**Analog:** `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt`

**`TestRestTemplate` + `WebEnvironment.RANDOM_PORT` idiom to copy** (full file, lines 26-44):
```kotlin
@Import(TestcontainersConfiguration::class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class HealthCheckSmokeTest {

    @Autowired
    lateinit var restTemplate: TestRestTemplate

    @Test
    fun `actuator health는 200과 UP 상태를 반환한다`() {
        val response = restTemplate.getForEntity("/actuator/health", String::class.java)

        assertEquals(HttpStatus.OK, response.statusCode)
        assertTrue(
            response.body?.contains("\"status\":\"UP\"") == true,
            "응답 본문에 \"status\":\"UP\"이 포함돼야 한다 — 실제 응답: ${'$'}{response.body}",
        )
    }
}
```
Note the **Boot 4.1 import path gotcha** already documented in this file's comment (lines 22-25):
`TestRestTemplate` lives in `org.springframework.boot.resttestclient`, not
`org.springframework.boot.test.web.client`, and `@AutoConfigureTestRestTemplate` must be
explicit — apply the same imports in the two new test files.

For `SecurityConfigTest.kt`: mirror the 404-for-unexposed-endpoint idiom (Test 2/3, lines 46-60)
but assert `401 Unauthorized` for a protected `/api/**` route called without a bearer token, and
`200`/expected body with a valid access JWT (construct via `JwtIssuerService` or
`SecurityMockMvcRequestPostProcessors.jwt()` per RESEARCH.md Supporting stack table
`spring-boot-starter-security-oauth2-resource-server-test`).

For `AuthControllerTest.kt`: use `restTemplate.postForEntity("/api/auth/kakao/login", request,
TokenResponse::class.java)` in place of `getForEntity`, mocking the downstream
`kapi.kakao.com/v2/user/me` call via `MockRestServiceServer` (see KakaoAuthServiceTest note
above) since this is a full-stack `@SpringBootTest`, not a sliced `@WebMvcTest`.

---

### `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt`

**No analog** — no JWT issuance code exists yet to test. Use RESEARCH.md Pattern 4
(`NimbusJwtEncoder`/`NimbusJwtDecoder`, `token_use` claim) directly: assert issued access tokens
decode with `token_use=access` and the configured TTL (D-03: 15min-1h), refresh tokens decode
with `token_use=refresh` and 30-day TTL (D-03), and that a refresh-claim token is rejected by the
`jwtDecoder()` bean's custom validator (Pattern 4's `DelegatingOAuth2TokenValidator`) when used as
if it were an access token.

## Shared Patterns

### Append-only Flyway migration discipline
**Source:** `backend/src/main/resources/db/migration/V1__create_users_table.sql` (comment header,
lines 1-11), same convention in V2/V3.
**Apply to:** V4 migration file only. Never edit V1-V3.

### Testcontainers-backed integration test wiring
**Source:** `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt` (full
file, defines shared `@ServiceConnection PostgreSQLContainer` bean).
**Apply to:** `KakaoAuthServiceTest.kt`, `SecurityConfigTest.kt`, `AuthControllerTest.kt`,
extended `FlywayMigrationTest.kt` — always `@Import(TestcontainersConfiguration::class)`, never
declare a second container.

### Secrets via environment variable only (D-11 lineage from Phase 9)
**Source:** `backend/src/main/resources/application-staging.yml` (full file, lines 1-12).
**Apply to:** `jwt.secret` and any Kakao client credentials wired into `application*.yml` —
staging must require the env var with no default; local may use a clearly-labeled insecure
placeholder default (RESEARCH.md Pitfall 2).

### Flyway owns schema, JPA only validates
**Source:** `backend/src/main/resources/application.yml`, lines 6-9 (`ddl-auto: validate` +
comment).
**Apply to:** `User.kt` entity extension — the new `kakaoId`/`nickname`/`profileImageUrl` fields
must be backed by the V4 migration first; JPA will fail startup validation if the entity and
schema disagree.

### Domain-package-per-feature structure
**Source:** existing `user/`, `checkin/`, `dailyreflection/` packages under
`backend/src/main/kotlin/com/footlog/backend/`.
**Apply to:** new `auth/` package (controller, service, DTOs) and `config/` package
(SecurityConfig, JwtConfig) — matches RESEARCH.md's Recommended Project Structure exactly.

### Client-owned vs server-owned ID distinction (context, not directly modified)
**Source:** `User.kt`/`Checkin.kt` header comments, `V1`/`V2` migration comments.
**Relevant to:** confirms `users.id` remains server-generated (`gen_random_uuid()`) even for
kakao-created accounts — `KakaoAuthService`'s "create" branch must let the DB/JPA default assign
`id`, never accept or synthesize one from the Kakao response (`kakao_id` is a separate column,
not the primary key).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt` | controller | request-response | First controller in this codebase — use RESEARCH.md Pattern 5 + amended flow description above |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthService.kt` | service | request-response | First service class — use RESEARCH.md architecture diagram, amended per D-14 note above |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoClient.kt` | service (external client) | request-response | No RestClient usage exists yet in main/ — use RESEARCH.md Pattern 2 (unaffected by amendment) |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoResponse.kt` | model (DTO) | transform | No DTO classes exist yet, only `@Entity` — use RESEARCH.md Pattern 2 DTO shape |
| `backend/src/main/kotlin/com/footlog/backend/auth/KakaoLoginRequest.kt` | model (DTO) | transform | Same as above; field shape changed per D-14 amendment (`kakaoAccessToken` only) |
| `backend/src/main/kotlin/com/footlog/backend/auth/TokenResponse.kt` | model (DTO) | transform | Same as above |
| `backend/src/main/kotlin/com/footlog/backend/auth/JwtIssuerService.kt` | service | transform | First JWT code — use RESEARCH.md Pattern 4 |
| `backend/src/main/kotlin/com/footlog/backend/config/JwtConfig.kt` | config | — | First security/JWT config — use RESEARCH.md Pattern 4 |
| `backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt` | config/middleware | request-response | First `SecurityFilterChain` — use RESEARCH.md Pattern 5 |
| `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt` | test | transform | No JWT code exists to test yet — use RESEARCH.md Pattern 4 as the spec to assert against |

## Metadata

**Analog search scope:** `backend/src/main/kotlin/com/footlog/backend/**`,
`backend/src/main/resources/**`, `backend/src/test/kotlin/com/footlog/backend/**`,
`backend/build.gradle.kts`. No `frontend`/`src` (Expo app) files were in scope — Phase 10's
client-side login screen (D-16) is a test-only artifact whose exact form (native screen vs
integration test) was left to planning discretion per 10-CONTEXT.md; no existing Expo screen
patterns were mapped here since RESEARCH.md's Open Question #1 flags the client SDK contract
itself as unresolved.
**Files scanned:** 18 backend files (all `.kt`/`.sql`/`.yml` files under `backend/src` plus
`build.gradle.kts` and the three `application*.yml` files).
**Pattern extraction date:** 2026-09-03

---

*Phase: 10-Authentication (Kakao OAuth2/PKCE)*
*Patterns mapped: 2026-09-03*
