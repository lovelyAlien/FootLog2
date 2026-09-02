# Phase 9: Backend Foundation - Research

**Researched:** 2026-09-02
**Domain:** Spring Boot(Kotlin) 백엔드 스캐폴딩, PostgreSQL + Flyway 마이그레이션, Docker/CI 기반 구축
**Confidence:** HIGH (핵심 스택 버전/의존성은 공식 start.spring.io 생성기 + 실제 Gradle 의존성 해석으로 직접 검증)

## Summary

이 phase는 저장소에 백엔드 코드가 전혀 없는 그린필드 스캐폴딩 작업이다. 조사 시점(2026-09-02)
기준으로 **Spring Boot 3.5 라인은 2026-06-30에 OSS EOL을 맞았고, 현재 공식 stable 최신선은
Spring Boot 4.1.1**이다 — 즉 지금 새 프로젝트를 3.5로 시작하면 시작하자마자 지원 종료된 버전을
쓰는 셈이 되므로, 이 조사는 **Spring Boot 4.1.x**를 기준으로 진행했다. 이는 CONTEXT.md의 잠긴
결정(PostgreSQL/Flyway/Spring Data JPA/Gradle Kotlin DSL)과 상충하지 않지만, Boot 4로의 전환이
가져온 **두 가지 breaking change**를 계획 단계에서 반드시 반영해야 한다: (1) Flyway는 더 이상
`flyway-core`만으로 자동 통합되지 않고 `spring-boot-starter-flyway`를 명시적으로 추가해야 하며,
(2) 테스트 의존성이 단일 `spring-boot-starter-test`에서 모듈별 스타터(`*-test` 접미사)로
쪼개졌다.

모든 핵심 버전(Spring Boot 4.1.1, Kotlin 2.3.21, Gradle 9.7.1, Hibernate ORM 7.4.1.Final,
Flyway 12.4.0, PostgreSQL JDBC 42.7.11, jackson-module-kotlin 3.1.4)은 실제로
`https://start.spring.io`에서 프로젝트를 생성하고, 생성된 프로젝트에서 `./gradlew dependencies`를
직접 실행해 Maven Central에서 해석된 최종 버전을 확인하는 방식으로 검증했다 — 이는 단순
`npm view` 수준의 존재 확인보다 강한 검증이다(공식 도구가 실제로 그 좌표를 사용해 프로젝트를
생성하고, 실제 빌드 도구가 그 버전을 Maven Central에서 resolve했음을 직접 확인).

PaaS는 CONTEXT.md가 최종 선택을 연구/계획 단계로 열어뒀다(D-06) — Railway/Fly.io/Render 공식
가격 페이지를 직접 확인한 결과, 1인 개발자 규모(Docker 앱 + 관리형 Postgres)에서는 **Railway**가
가장 단순하고 저렴한 진입점(Hobby $5/월 크레딧 포함, 코드 저장소 연결만으로 Postgres 원클릭
프로비저닝)이라 1차 추천하지만, 이번 phase의 산출물(Dockerfile, Docker Compose, GitHub Actions
build+test)은 세 벤더 어디로 배포하든 그대로 재사용 가능하므로 최종 벤더 확정이 늦어져도 이번
phase 작업에는 영향이 없다.

**Primary recommendation:** Spring Boot 4.1.1 + Kotlin 2.3.21 + Gradle(Kotlin DSL) 9.7.1을
`backend/` 폴더에 `start.spring.io` 동등 구성으로 스캐폴딩하고, Flyway 순차 마이그레이션
(`V1__create_users_table.sql` → `V2__create_checkins_table.sql` →
`V3__create_daily_reflections_table.sql`)으로 서버 스키마를 소유시키며,
`spring.jpa.hibernate.ddl-auto=validate`로 JPA가 스키마를 검증만 하게 하고,
`spring-boot-docker-compose`(개발 전용 스코프) + `compose.yaml`로 로컬 Postgres를 자동
기동시킨다.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** DB 엔진은 **PostgreSQL**을 쓴다.
- **D-02:** `checkins`/`daily_reflections` 서버측 테이블에는 **Phase 9부터 `user_id` 컬럼을
  포함**한다. 지금은 `users` 테이블에 단일 플레이스홀더 로우를 두고 FK로 연결해둔다.
- **D-03:** 마이그레이션 프레임워크는 **Flyway**를 쓴다.
- **D-04:** 데이터 접근 계층은 **Spring Data JPA**를 쓴다.
- **D-05:** 백엔드 코드는 **같은 git 저장소(FootLog2) 하위 `backend/` 폴더**에 둔다 — 별도
  저장소로 분리하지 않는다.
- **D-06:** 실제 배포 대상은 **PaaS(Railway/Fly.io/Render 등)**를 염두에 둔다 — 구체적인 벤더
  선택은 연구/계획 단계에서 좁힌다.
- **D-07:** **Docker 컨테이너화를 Phase 9부터 포함**한다 — Dockerfile을 처음부터 작성한다.
- **D-08:** 빌드 도구는 **Gradle(Kotlin DSL, `build.gradle.kts`)**을 쓴다.
- **D-09:** 이번 phase의 환경 범위는 **로컬 + 스테이징까지**다. 프로덕션 배포 자동화는 포함하지
  않는다.
- **D-10:** **CI 파이프라인(GitHub Actions)을 Phase 9에 포함**한다 — 최소한 build+test
  워크플로우.
- **D-11:** 환경별 설정은 **Spring Profiles**(`application-{env}.yml`, local/staging)로
  관리한다. 비밀값은 환경변수로 주입하고 하드코딩하지 않는다.
- **D-12:** 로컬 개발 시 PostgreSQL은 **Docker Compose**(`docker-compose.yml`/`compose.yaml`)로
  띄운다.

### Claude's Discretion

- 구체적인 PaaS 벤더(Railway vs Fly.io vs Render) 최종 선택.
- `backend/` 폴더 내부 패키지 구조(도메인별 vs 레이어별 패키징) — 표준 Spring Boot 관례를 따름.
- `users` 테이블의 정확한 컬럼 구성(이메일/닉네임 등 추가 필드 여부) — 이번 phase는 최소 스키마
  (id, created_at)로 시작.
- GitHub Actions 워크플로우의 정확한 스텝 구성(캐싱 전략 등).

### Deferred Ideas (OUT OF SCOPE)

None — 이번 phase 논의는 스코프 밖으로 나가지 않았다(09-CONTEXT.md `<deferred>` 참고).
카카오 OAuth2/PKCE 인증(Phase 10), S3 오브젝트 스토리지(Phase 11), 클라이언트-서버 동기화
(Phase 12), 프로덕션 배포 자동화는 이 phase가 만들지 않는 것으로 명시적으로 경계가 그어져
있다.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-backend-scaffold | Spring Boot(Kotlin) 프로젝트가 초기화되고 로컬/스테이징 환경에서 빌드·기동된다 | `## Standard Stack`(검증된 버전 조합) + `## Architecture Patterns`(프로젝트 구조, Dockerfile, GitHub Actions) + `## Environment Availability`(로컬 Java/Docker 확인 완료) |
| REQ-backend-db-schema | 서버측 DB에 `Checkin`/`DailyReflection` 대응 테이블이 존재하고 Flyway로 버전관리된다 | `## Architecture Patterns` Pattern 2(Flyway 마이그레이션 SQL, 클라이언트 스키마 1:1 매핑) + `## Common Pitfalls`(ddl-auto 충돌, Boot4 Flyway starter 누락) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTTP 노출(이번 phase는 `/actuator/health`만) | API/Backend | — | Spring Boot MVC 스타터가 담당. 실제 도메인 REST 계약은 Phase 12(동기화) 소관, 이번 phase엔 없음 |
| 스키마 정의·버전 관리 | Database/Storage | API/Backend | Flyway SQL 파일이 스키마의 단일 소유자(source of truth); JPA 엔티티는 `ddl-auto=validate`로 검증만 함 |
| 데이터 접근(Repository) | API/Backend | Database/Storage | Spring Data JPA repository가 도메인 계층에서 DB 접근을 캡슐화 |
| 환경별 설정(local/staging) | API/Backend | — | Spring Profiles가 애플리케이션 프로세스 내부에서 처리, 비밀값은 env var로 외부 주입 |
| 로컬 Postgres 실행 | Database/Storage | — | Docker Compose가 앱과 분리된 별도 컨테이너로 기동(D-12) |
| 컨테이너 패키징 | API/Backend | — | Dockerfile이 Spring Boot 앱을 이미지로 패키징. CDN/Static 계층은 해당 없음(순수 백엔드, 정적 자산 없음) |
| CI 빌드/테스트 게이트 | *(5개 표준 tier 밖 — 빌드 파이프라인)* | — | GitHub Actions는 런타임 tier가 아니라 커밋 시점 게이트. `backend/**` 경로 필터로 Expo 클라이언트 CI와 분리(D-05 근거) |
| PaaS 배포 대상 | API/Backend + Database/Storage | — | 하나의 PaaS 계정에서 앱 서비스(API/Backend)와 관리형 Postgres(Database/Storage)를 함께 프로비저닝(D-06) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| Spring Boot | **4.1.1** | 애플리케이션 프레임워크 | 2026-09 기준 공식 stable 최신선. 3.5 라인은 2026-06-30 OSS EOL — 그린필드 프로젝트를 EOL 버전으로 시작할 이유가 없음 `[VERIFIED: start.spring.io metadata API 직접 조회]` |
| Kotlin | **2.3.21** | 언어/컴파일러 | Boot 4.1 Gradle 플러그인이 기본으로 고정하는 버전(Boot4는 Kotlin 2.2+ 요구) `[VERIFIED: start.spring.io 생성 build.gradle.kts]` |
| Gradle (Wrapper) | **9.7.1** | 빌드 도구(D-08, Kotlin DSL) | start.spring.io Boot4.1 기본 wrapper 버전 `[VERIFIED: gradle-wrapper.properties 직접 확인]` |
| Spring Data JPA (`spring-boot-starter-data-jpa`) | Boot BOM 관리 (Hibernate ORM **7.4.1.Final**) | 데이터 접근 계층(D-04) | JPA/Hibernate가 여전히 Kotlin+Spring 생태계 표준 조합 `[VERIFIED: ./gradlew dependencies 직접 실행 결과]` |
| Flyway (`spring-boot-starter-flyway` + `flyway-database-postgresql`) | **12.4.0** | 버전관리 마이그레이션(D-03) | Boot4부터 `flyway-core` 단독으로는 자동 통합 안 됨 — 반드시 이 starter 필요(breaking change, 아래 Pitfall 참고) `[VERIFIED: ./gradlew dependencies]` |
| PostgreSQL JDBC Driver | **42.7.11** | DB 드라이버(D-01) | Boot BOM 관리 버전, `runtimeOnly` 스코프 `[VERIFIED: ./gradlew dependencies]` |
| jackson-module-kotlin | **3.1.4** (`tools.jackson.module` 네임스페이스) | Kotlin data class ↔ JSON 직렬화 | Boot4는 Jackson 3.x로 이동하며 패키지 네임스페이스가 `com.fasterxml.jackson` → `tools.jackson`으로 변경됨 — Phase 12에서 REST DTO 만들 때 import 경로 주의 `[VERIFIED: ./gradlew dependencies]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `spring-boot-starter-validation` | Boot BOM (Hibernate Validator **9.1.0.Final**) | Bean Validation | `users`/API 확장 시(Phase 10+) 요청 바디 검증 대비 — 지금 넣어둬도 비용 없음 |
| `spring-boot-starter-actuator` | Boot BOM | `/actuator/health` 헬스체크 | REQ-backend-scaffold 성공 기준("로컬/스테이징에서 기동")을 확인하는 표준 엔드포인트, PaaS 헬스체크 프로브로도 재사용 |
| `spring-boot-docker-compose` (`developmentOnly` 스코프) | Boot BOM | `compose.yaml` 자동 기동 + DataSource 자동 설정(D-12) | `./gradlew bootRun`/IDE 실행만으로 Postgres 컨테이너 자동 연결 — application.yml에 접속정보 하드코딩 불필요. **프로덕션/스테이징 jar에는 포함되지 않음**(스코프가 developmentOnly) |
| `spring-boot-testcontainers` + `org.testcontainers:testcontainers-postgresql` (`testImplementation`) | Boot BOM / Testcontainers | 통합 테스트에서 실제 Postgres 컨테이너 사용 | H2 등 인메모리 DB 대신 실제 Postgres로 테스트해야 Flyway SQL·컬럼 타입 불일치를 조기 발견(Validation Architecture 참고) |
| `kotlin-reflect` | Boot BOM | Spring의 Kotlin 리플렉션 요구사항 | Spring이 코틀린 클래스 내부 검사(빈 등록 등)에 필요, 스타터 생성 시 기본 포함 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flyway | Liquibase | XML/YAML 선언적 방식이라 유연하지만, 클라이언트의 "순차 버전 + SQL 문자열" 철학(D-03 근거, `src/db/migrations.ts` 패턴)과 덜 맞음 |
| Spring Data JPA | jOOQ / Kotlin Exposed | 타입-세이프 SQL 빌더지만 이 규모의 단순 CRUD엔 과함(D-04 근거), 학습자료도 JPA가 압도적으로 많음 |
| Dockerfile 수동 작성 | Cloud Native Buildpacks(`bootBuildImage` Gradle 태스크) | Buildpacks가 이미지 최적화를 자동화하지만 D-07이 Dockerfile을 명시적으로 요구 |
| Docker Compose 로컬 개발(D-12) | 테스트 전용 Testcontainers만 사용(로컬 실행에도 재사용) | IDE에서 개발자가 직접 실행할 때는 익숙한 `compose.yaml`이 더 직관적; Testcontainers는 테스트 코드에서만 자동 관리하도록 역할을 분리하는 것이 표준 관례 |

**Installation (재현 가능한 스캐폴딩 명령 — 이 조사에서 실제로 실행해 검증함):**
```bash
curl -s "https://start.spring.io/starter.zip?type=gradle-project-kotlin&language=kotlin&bootVersion=4.1.1&baseDir=backend&groupId=com.footlog&artifactId=backend&name=backend&packageName=com.footlog.backend&dependencies=web,data-jpa,postgresql,flyway,validation,actuator,docker-compose,testcontainers&javaVersion=21" -o backend.zip
unzip backend.zip
```

**Version verification (실제로 수행함):**
```bash
# 1. 공식 생성기가 실제로 해당 버전 조합을 지원하는지 확인
curl -s "https://start.spring.io/metadata/client" | jq '.bootVersion.default'
# -> "4.1.1.RELEASE" (2026-09-02 확인)

# 2. 생성된 프로젝트에서 실제 Maven Central 해석 결과 확인
cd backend && ./gradlew dependencies --configuration runtimeClasspath | grep -Ei "flyway|postgresql|hibernate-core|jackson-module-kotlin"
```
출력(실측):
```
org.hibernate.orm:hibernate-core:7.4.1.Final
org.flywaydb:flyway-core:12.4.0
org.flywaydb:flyway-database-postgresql -> 12.4.0
tools.jackson.module:jackson-module-kotlin -> 3.1.4
org.postgresql:postgresql -> 42.7.11
```

## Package Legitimacy Audit

> 이 phase는 **JVM/Gradle 생태계**다 — Package Legitimacy Gate의 기본 절차(`slopcheck`, `npm view`,
> `pip index versions`)는 Node.js/Python/Rust를 대상으로 하며 Maven Central 좌표에는 적용되지
> 않는다. 대신 이번 조사는 **더 강한 검증 경로**를 사용했다: (1) 패키지 좌표를 훈련 데이터나
> 웹검색이 아니라 **공식 Spring 팀이 운영하는 `start.spring.io` 생성기**에서 직접 뽑아냈고,
> (2) 생성된 프로젝트에서 **`./gradlew dependencies`를 실제로 실행**해 그 좌표가 Maven
> Central에서 실제로 resolve됨을 확인했다. 이는 "존재만 확인하는" `npm view` 동급 검사보다
> 강하다 — 슬롭스쿼팅된 패키지는애초에 `start.spring.io`의 관리형 의존성 카탈로그에 존재할 수
> 없다(Spring 팀이 직접 큐레이션).

| Package | Registry | Verification Method | Disposition |
|---------|----------|---------------------|-------------|
| `org.springframework.boot:*` (전체 스타터) | Maven Central | 공식 start.spring.io 생성 + `gradlew dependencies` 해석 | Approved `[VERIFIED]` |
| `org.flywaydb:flyway-core` / `flyway-database-postgresql` | Maven Central | 동일 | Approved `[VERIFIED]` |
| `org.postgresql:postgresql` | Maven Central | 동일 | Approved `[VERIFIED]` |
| `org.jetbrains.kotlin:kotlin-reflect` | Maven Central | 동일 | Approved `[VERIFIED]` |
| `tools.jackson.module:jackson-module-kotlin` | Maven Central | 동일 (신규 네임스페이스, Jackson 3.x) | Approved `[VERIFIED]` — 네임스페이스 변경(구 `com.fasterxml.jackson.module`) 유의 |
| `org.testcontainers:testcontainers-postgresql` | Maven Central | 동일 | Approved `[VERIFIED]` |

**Packages removed due to slopcheck `[SLOP]` verdict:** none (slopcheck 미적용 생태계)
**Packages flagged as suspicious `[SUS]`:** none — 위 검증 경로로 대체, 계획자는 이 패키지들에
`checkpoint:human-verify`를 걸 필요가 없다.

## Architecture Patterns

### System Architecture Diagram

```
[개발자 로컬 머신]
  git push (backend/** 변경 포함)
        │
        ▼
[GitHub Actions: backend-ci.yml]  (paths: backend/**)
  actions/checkout → setup-java(21) → gradle/actions/setup-gradle
        │
        ▼
  ./gradlew build --no-daemon
        │  (내부에서: 컴파일 → Testcontainers가 임시 Postgres 컨테이너 기동
        │   → Flyway 마이그레이션 적용 → JPA 컨텍스트 로딩 검증 → 테스트 실행)
        ▼
  빌드 성공/실패 = 이번 phase의 CI 게이트(D-10, 배포 스텝 없음)

──────────────────────────────────────────────────────────────

[로컬 개발 실행 경로]
  ./gradlew bootRun
        │
        ├─▶ spring-boot-docker-compose 모듈이 backend/compose.yaml 감지
        │       └─▶ `docker compose up` 으로 postgres:17 컨테이너 자동 기동(D-12)
        │       └─▶ DataSource 접속정보 자동 주입(하드코딩 불필요)
        ▼
  Spring Boot 앱(BackendApplication) 기동
        │
        ├─▶ Flyway: src/main/resources/db/migration의 V1~V3 SQL을 순서대로 적용
        │       (users → checkins → daily_reflections, 스키마의 단일 소유자)
        ▼
  Hibernate: ddl-auto=validate로 엔티티↔실제 스키마 일치 여부만 검증(불일치 시 기동 실패)
        │
        ▼
  GET /actuator/health → 200 OK  (REQ-backend-scaffold 성공 기준 1 확인 지점)

──────────────────────────────────────────────────────────────

[PostgreSQL — 로컬은 Docker Compose, 스테이징은 PaaS 관리형 인스턴스]
  users(id UUID PK, created_at) ── 플레이스홀더 1행(D-02)
     │ FK: user_id
     ├── checkins(id UUID PK[클라이언트 발급], user_id, timestamp_utc, ...)
     └── daily_reflections(id UUID PK[클라이언트 발급], user_id, date, ...)
```

### Recommended Project Structure

```
backend/                              # 저장소 루트 하위 신규 폴더(D-05) — Expo 앱과 분리
├── build.gradle.kts                  # Gradle Kotlin DSL(D-08)
├── settings.gradle.kts
├── compose.yaml                      # 로컬 Postgres(D-12) — spring-boot-docker-compose가 자동 인식
├── Dockerfile                        # multi-stage(D-07)
├── .dockerignore
├── gradlew / gradlew.bat / gradle/wrapper/
├── src/main/kotlin/com/footlog/backend/
│   ├── BackendApplication.kt
│   ├── user/                         # 도메인(feature)별 패키징 — Claude's Discretion 항목
│   │   ├── User.kt                   # JPA 엔티티
│   │   └── UserRepository.kt
│   ├── checkin/
│   │   ├── Checkin.kt
│   │   └── CheckinRepository.kt
│   └── dailyreflection/
│       ├── DailyReflection.kt
│       └── DailyReflectionRepository.kt
├── src/main/resources/
│   ├── application.yml               # 공통 설정(포트, spring.application.name 등)
│   ├── application-local.yml         # D-11 로컬 프로파일(로컬 Postgres 접속 등)
│   ├── application-staging.yml       # D-11 스테이징 프로파일(env var 참조만, 비밀값 없음)
│   └── db/migration/
│       ├── V1__create_users_table.sql
│       ├── V2__create_checkins_table.sql
│       └── V3__create_daily_reflections_table.sql
└── src/test/kotlin/com/footlog/backend/
    ├── TestcontainersConfiguration.kt  # start.spring.io가 자동 생성(@ServiceConnection)
    ├── TestBackendApplication.kt
    ├── FlywayMigrationTest.kt          # 신규 작성 필요(Wave 0 gap)
    └── HealthCheckSmokeTest.kt         # 신규 작성 필요(Wave 0 gap)

.github/workflows/
└── backend-ci.yml                    # 저장소 루트 — backend/** 경로 필터로 Expo CI와 분리
```

패키지 구조는 **도메인(feature)별 패키징**을 권장한다(레이어별 `controller/service/repository`
패키징 대신) — 이 프로젝트 규모(3개 도메인: user/checkin/dailyreflection)에서는 관련 코드가
한 폴더에 모여 응집도가 높고, Phase 10~12에서 도메인이 늘어나도(auth, storage, sync) 구조가
자연스럽게 확장된다. `[ASSUMED]` — 이는 Spring 커뮤니티에서 널리 퍼진 관례이지 Spring 공식
문서가 단일하게 못박은 규칙은 아니다(A1, Assumptions Log 참고). 레이어별 패키징으로
바꾸더라도 이번 phase 산출물(마이그레이션 SQL, 엔티티 필드)은 그대로 재사용 가능하므로 위험은
낮다.

### Pattern 1: Kotlin JPA 엔티티 설계 (allOpen 필수 설정 포함)

```kotlin
// Source: 공식 start.spring.io 생성기 실측(build.gradle.kts의 allOpen 블록) +
// https://blog.jetbrains.com/idea/2026/01/how-to-avoid-common-pitfalls-with-jpa-and-kotlin/
// build.gradle.kts — kotlin("plugin.jpa")를 적용해도 이 블록은 별도로 필요하다(Pitfall 1 참고)
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
```

```kotlin
// src/main/kotlin/com/footlog/backend/checkin/Checkin.kt
// 클라이언트 CheckinRow(src/db/schema.ts)의 필드 구성을 1:1로 매핑
import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "checkins")
class Checkin(
    @Id
    val id: UUID,                                   // 클라이언트가 crypto.randomUUID()로 발급(검증: src/checkin/photos.ts 등) — 서버는 @GeneratedValue를 절대 붙이지 않는다

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(name = "timestamp_utc", nullable = false)
    var timestampUtc: OffsetDateTime,

    @Column(name = "local_date_key", nullable = false, length = 10)
    var localDateKey: String,

    @Column(name = "timezone_at_capture", nullable = false, length = 64)
    var timezoneAtCapture: String,

    @Column(nullable = false)
    var lat: Double,

    @Column(nullable = false)
    var lng: Double,

    @Column(name = "accuracy_meters")
    var accuracyMeters: Double? = null,

    @Column(name = "location_source", nullable = false, length = 32)
    var locationSource: String,

    var note: String? = null,

    @Column(name = "photo_path")
    var photoPath: String? = null,                  // Phase 11에서 S3 키/URL로 재검토 예정(09-CONTEXT.md 명시)

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime,

    @Column(name = "schema_version", nullable = false)
    var schemaVersion: Int = 1,
) {
    // JPA는 no-arg 생성자를 요구한다 — kotlin("plugin.jpa")가 바이트코드 레벨에서 합성해준다.
    // allOpen 블록이 없으면 이 클래스는 Kotlin 기본값인 `final`이라 Hibernate 프록시(지연
    // 로딩)가 동작하지 않는다.
}
```

### Pattern 2: Flyway 순차 마이그레이션 (클라이언트 스키마 1:1 매핑)

```sql
-- src/main/resources/db/migration/V1__create_users_table.sql
-- Postgres 13+는 gen_random_uuid()가 core 내장 함수라 pgcrypto 확장이 불필요하다
-- (postgres:17 사용 시 확실히 해당) [CITED: postgresql.org 13 릴리스 노트]
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 10 인증 도입 전까지 쓸 단일 플레이스홀더 로우(D-02)
INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001');
```

```sql
-- V2__create_checkins_table.sql
-- 클라이언트 CREATE_CHECKINS_TABLE_SQL(src/db/schema.ts)과 필드 1:1 대응
CREATE TABLE checkins (
    id UUID PRIMARY KEY,                  -- 클라이언트가 발급(crypto.randomUUID()) — 서버 기본값 없음
    user_id UUID NOT NULL REFERENCES users(id),
    timestamp_utc TIMESTAMPTZ NOT NULL,
    local_date_key VARCHAR(10) NOT NULL,
    timezone_at_capture VARCHAR(64) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,        -- 클라이언트 SQLite REAL(부동소수점)과 동일 계열로 유지
    lng DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    location_source VARCHAR(32) NOT NULL,
    note TEXT,
    photo_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_checkins_local_date_key ON checkins (local_date_key);
CREATE INDEX idx_checkins_user_id ON checkins (user_id);
```

```sql
-- V3__create_daily_reflections_table.sql
-- 클라이언트 CREATE_DAILY_REFLECTIONS_TABLE_SQL(date UNIQUE)과 달리, 서버는 다중 사용자를
-- 전제하므로 UNIQUE(user_id, date)로 제약을 넓힌다 — Phase 12 동기화 이후 여러 사용자가
-- 같은 서버를 쓰게 되는 상황을 이번 phase에서 미리 반영(스키마 레벨 결정, A4 참고)
CREATE TABLE daily_reflections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    new_place_answer TEXT,
    free_reflection TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);
```

### Pattern 3: `application.yml` 프로파일 분리(D-11) + ddl-auto 고정

```yaml
# application.yml (공통)
spring:
  application:
    name: backend
  jpa:
    hibernate:
      ddl-auto: validate   # Flyway가 유일한 스키마 소유자 — JPA는 검증만(Pitfall 참고)
    open-in-view: false
management:
  endpoints:
    web:
      exposure:
        include: health    # actuator 전체 노출 금지(Security Domain 참고)
```

```yaml
# application-local.yml — spring-boot-docker-compose가 compose.yaml에서 자동 주입하므로
# 보통 datasource 블록이 필요 없다. 명시가 필요하면 여기(로컬 전용, 비밀값 아님)에만 둔다.
spring:
  docker:
    compose:
      enabled: true
```

```yaml
# application-staging.yml — 비밀값은 전부 환경변수 참조(D-11), 하드코딩 금지
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
```

### Pattern 4: Dockerfile — multi-stage + jarmode 레이어 추출

```dockerfile
# syntax=docker/dockerfile:1
# Stage 1: Gradle 빌드(bootJar 생성) — 검증된 wrapper 버전과 맞춘 gradle 이미지 사용
FROM gradle:9.7.1-jdk21-ubi9 AS build
WORKDIR /workspace
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
RUN gradle bootJar --no-daemon

# Stage 2: 레이어 추출 — Spring Boot 공식 문서 패턴(jarmode=tools)
# Source: https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
FROM eclipse-temurin:21-jre-jammy AS extract
WORKDIR /builder
COPY --from=build /workspace/build/libs/*.jar application.jar
RUN java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# Stage 3: 런타임 이미지 — 빌드 캐시/Gradle 캐시가 최종 이미지에 남지 않음(Security Domain 참고)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /application
COPY --from=extract /builder/extracted/dependencies/ ./
COPY --from=extract /builder/extracted/spring-boot-loader/ ./
COPY --from=extract /builder/extracted/snapshot-dependencies/ ./
COPY --from=extract /builder/extracted/application/ ./
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
```

`[VERIFIED]` — 이미지 태그 존재 여부는 Docker Hub API로 직접 확인함
(`gradle:9.7.1-jdk21-ubi9`, `eclipse-temurin:21-jre-jammy` 둘 다 실측 확인).

### Pattern 5: GitHub Actions — 모노레포 경로 필터

```yaml
# .github/workflows/backend-ci.yml (저장소 루트에 위치 — Expo용 워크플로와 별도 파일)
name: Backend CI

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - uses: gradle/actions/setup-gradle@v4   # 공식 Gradle 캐싱 액션(gradle-build-action 후속)
      - name: Build and test
        run: ./gradlew build --no-daemon
```

`ubuntu-latest` GitHub 호스팅 러너는 Docker가 사전 설치되어 있어 Testcontainers 기반 통합
테스트(Flyway 마이그레이션을 실제 Postgres에 적용)가 별도 설정 없이 CI에서도 동작한다.

### Anti-Patterns to Avoid

- **`ddl-auto: update`를 Flyway와 함께 쓰기:** 두 도구가 동시에 스키마를 "소유"하려 하면
  충돌한다. Flyway가 스키마를 만들고 나면 JPA는 `validate`(또는 `none`)만 써야 한다.
- **`flyway-core`만 추가하고 `spring-boot-starter-flyway`를 생략:** Boot4에서는 마이그레이션이
  아예 실행되지 않는다(Pitfall 2).
- **체크인/회고 엔티티에 `@GeneratedValue` 붙이기:** 이 프로젝트는 클라이언트가 ID를 발급하는
  local-first 설계(Phase 12 동기화 전제)다 — 서버가 ID를 재발급하면 향후 동기화 로직이 깨진다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB 스키마 버전 관리 | 커스텀 SQL 실행 스크립트/순번 파일 관리 로직 | Flyway(`spring-boot-starter-flyway`) | 체크섬 검증, 실행 이력 테이블(`flyway_schema_history`), 실패 시 롤백 안내까지 이미 구현되어 있음 — 클라이언트의 수동 `PRAGMA user_version` 방식을 서버에서 재구현할 이유 없음 |
| 로컬 개발용 DB 기동/해제 관리 | `docker run` 래퍼 스크립트 + 헬스체크 폴링 로직 | `spring-boot-docker-compose` + `compose.yaml` | Spring이 앱 생명주기에 맞춰 컨테이너를 자동 기동/정지하고 DataSource까지 자동 주입 |
| JAR 레이어 최적화 | 수동 `unzip`/`jar xf` 후 디렉터리 재배치 | Spring Boot `jarmode=tools extract --layers` | 의존성/애플리케이션 코드 레이어 분리를 공식 도구가 이미 제공 — Docker 캐시 히트율을 수작업보다 안정적으로 보장 |
| 통합 테스트용 DB 격리 | 테스트마다 스키마 truncate/reset 스크립트 | Testcontainers(`PostgreSQLContainer`, `@ServiceConnection`) | 매 테스트 클래스가 격리된 실제 Postgres 인스턴스를 받음 — H2 등 인메모리 대체 DB의 방언 차이 리스크 자체가 사라짐 |

**Key insight:** 이 phase가 다루는 문제(마이그레이션 버전관리, 로컬 컨테이너 생명주기, JAR
패키징 레이어링)는 전부 Spring Boot/Flyway 생태계가 "이미 풀어놓은" 문제다. 커스텀 코드를 짜야
할 지점은 도메인 엔티티/리포지토리뿐이며, 그마저도 Kotlin data class 수준의 얇은 래퍼다.

## Common Pitfalls

### Pitfall 1: kotlin-jpa 플러그인이 allOpen을 자동으로 안 해줌

**What goes wrong:** `kotlin("plugin.jpa")`만 적용하고 `allOpen` 블록을 생략하면, `@Entity`
클래스가 Kotlin 기본값인 `final`로 컴파일된다. Hibernate는 지연 로딩(lazy loading) 프록시를
만들기 위해 엔티티를 서브클래싱해야 하는데, `final` 클래스는 서브클래싱이 불가능해 프록시 생성이
조용히 실패하거나 즉시 로딩(eager)으로 동작이 바뀐다.
**Why it happens:** `kotlin("plugin.jpa")`는 `noarg` 컴파일러 플러그인만 설정하고, `allOpen`은
별도로 설정해야 한다는 사실이 문서화가 약하다.
**How to avoid:** `build.gradle.kts`에 명시적으로 `allOpen { annotation("jakarta.persistence.Entity") ... }`
블록을 추가한다(Pattern 1 참고) — 실제로 `start.spring.io`가 생성하는 프로젝트조차 `plugin.jpa`를
적용한 상태에서 이 블록을 자동으로 함께 넣어준다는 사실 자체가, Spring 팀도 플러그인 단독으로는
불충분하다고 판단했다는 신호다.
**Warning signs:** `LazyInitializationException` 없이 그냥 즉시 모든 연관관계가 로딩되거나,
프록시 관련 `HibernateException`이 런타임에만 나타남.

### Pitfall 2: Spring Boot 4에서 Flyway가 조용히 실행되지 않음

**What goes wrong:** Boot 3.x 시절 습관대로 `org.flywaydb:flyway-core` 의존성만 추가하면,
Boot 4에서는 Flyway 자동설정 자체가 활성화되지 않아 마이그레이션이 전혀 실행되지 않는다 —
명확한 에러 없이 그냥 빈 스키마 상태로 앱이 기동되거나, JPA `ddl-auto=validate`가 "테이블이
없다"는 에러를 내면서 원인이 Flyway인지 헷갈리게 만든다.
**Why it happens:** Boot 4가 Flyway 통합을 자동설정(auto-configuration) 방식에서 명시적 스타터
의존 방식으로 바꿨다(`[CITED: Spring Boot 4.0 Migration Guide]`).
**How to avoid:** `implementation("org.springframework.boot:spring-boot-starter-flyway")`를
반드시 추가한다(Standard Stack 표 참고). `flyway-database-postgresql`은 별도로 필요하다(DB별
드라이버 어댑터).
**Warning signs:** 앱은 정상 기동되는데 테이블이 하나도 없음, `flyway_schema_history` 테이블
자체가 생성되지 않음.

### Pitfall 3: `spring-boot-docker-compose`는 개발 전용이며 스테이징에는 아무 효과가 없다

**What goes wrong:** 로컬에서 `compose.yaml`만으로 DB 연결이 잘 되는 걸 확인하고, 스테이징
배포 시에도 같은 방식이 동작할 거라 착각한다.
**Why it happens:** 이 모듈은 `developmentOnly` 스코프로 추가되어 있어 패키징된 실행 가능
jar(운영/스테이징에 배포되는 산출물)에는 아예 포함되지 않는다 — 의도된 동작이다.
**How to avoid:** 스테이징 환경은 반드시 `application-staging.yml` + 환경변수(D-11)로 별도
DataSource 설정을 완성해야 한다. "로컬에서 됐으니 스테이징도 되겠지"라고 넘기지 않는다.
**Warning signs:** 로컬에서만 통합 테스트/실행이 잘 되고, 스테이징 배포 후 DataSource 연결
실패.

### Pitfall 4: GitHub Actions 경로 필터 + 브랜치 보호 필수 체크의 충돌

**What goes wrong:** `backend/**` 경로 필터가 걸린 워크플로를 브랜치 보호 규칙의 "필수 상태
체크"로 지정하면, 클라이언트(Expo)만 변경한 PR에서는 이 워크플로 자체가 아예 실행되지 않아
"체크 대기 중" 상태로 영원히 머무르며 머지가 막힐 수 있다.
**Why it happens:** GitHub은 경로 필터로 스킵된 워크플로를 "아직 실행 안 됨"으로 취급하지,
"통과"로 취급하지 않는다.
**How to avoid:** 이번 phase 스코프(CI 워크플로 신설)에서는 브랜치 보호 규칙에 이 워크플로를
필수 체크로 등록하지 않거나, 등록한다면 `paths-ignore` 없이 항상 실행되는 가벼운 wrapper
job으로 감싸는 패턴을 검토한다.
**Warning signs:** 클라이언트 전용 PR이 "일부 체크 대기 중" 상태로 머지 버튼이 비활성화됨.

### Pitfall 5: 체크인/회고 엔티티에 서버 측 ID 자동 생성을 실수로 넣음

**What goes wrong:** JPA 튜토리얼 관성으로 `@Id @GeneratedValue` 패턴을 모든 엔티티에
습관적으로 붙이면, 클라이언트가 이미 발급한 UUID(`crypto.randomUUID()`, 코드베이스에서
확인됨)를 서버가 무시하고 새 ID를 만들어버린다.
**Why it happens:** 대부분의 JPA 예제/튜토리얼이 서버가 ID를 발급하는 시나리오를 기본으로
가정한다.
**How to avoid:** `checkins`/`daily_reflections`는 `@Id`만 붙이고 `@GeneratedValue`를 절대
붙이지 않는다(Pattern 1 참고). `users`의 플레이스홀더 로우만 `gen_random_uuid()` DB 기본값을
써도 무방하다(서버가 유일하게 ID를 소유하는 테이블).
**Warning signs:** Phase 12(동기화) 설계 시점에 "서버에 저장된 ID가 클라이언트 ID와 다르다"는
정합성 문제로 뒤늦게 발견됨 — 지금 잡아두지 않으면 나중에 마이그레이션이 필요해짐.

## Code Examples

Verified patterns from official sources — 위 Architecture Patterns 섹션의 Pattern 1~5가 이
phase에서 실제로 쓰일 전체 코드 예시다(엔티티, 마이그레이션 SQL, `application.yml`,
Dockerfile, GitHub Actions 워크플로). 중복을 피하기 위해 여기서는 반복하지 않는다.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `flyway-core`만 추가하면 자동 통합 | `spring-boot-starter-flyway` 명시적 추가 필요 | Spring Boot 4.0 GA(2026-06) | 기존 Boot3 자습서/블로그를 그대로 따라 하면 마이그레이션이 조용히 실행 안 됨(Pitfall 2) |
| `com.fasterxml.jackson.*` 패키지 | `tools.jackson.*` 네임스페이스(Jackson 3.x) | Boot4/Jackson3 전환과 함께 | 커스텀 Jackson 설정 코드의 import 전면 변경 필요(Phase 12에서 DTO 작성 시 주의) |
| 단일 `spring-boot-starter-test` | 모듈별 테스트 스타터(`*-actuator-test`, `*-data-jpa-test`, `*-webmvc-test`, `*-flyway-test` 등) | Boot4 | 필요한 모듈만 선택적으로 테스트 의존성 추가 가능해짐, 다만 예전 자습서의 "test 스타터 하나만 추가" 지침은 더 이상 안 통함 |
| `gradle-build-action`(legacy) | `gradle/actions/setup-gradle` | 공식 후속 액션, v6에서 캐싱 아키텍처 재편(2026) | 새 워크플로 작성 시 최신 액션명 사용 필요 |
| `-Djarmode=layertools` | `-Djarmode=tools` | Boot 3.3~3.4 구간에서 전환, Boot4에서도 유지 | 기존 블로그 예시가 옛 jarmode 이름을 쓰는 경우가 많음(Dockerfile 예시 작성 시 공식 문서 재확인 필요) |

**Deprecated/outdated:**
- `-Djarmode=layertools`: `-Djarmode=tools`로 대체됨(AOT/CDS 친화적 레이아웃).
- Boot3용 `spring-boot-starter-test` 단일 의존성 패턴: Boot4에서는 모듈별 분리로 대체.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | 도메인(feature)별 패키지 구조가 이 프로젝트 규모에 적합하다는 권장 | Architecture Patterns > Recommended Project Structure | 낮음 — 나중에 레이어별로 재구성해도 마이그레이션 SQL/엔티티 필드는 그대로 재사용 가능 |
| A2 | Railway를 1차 PaaS로 추천 | Summary, Sources | 중간 — 벤더 변경 시 Dockerfile/compose.yaml은 재사용 가능하나, 실제 배포 스텝(이번 phase엔 없음, D-09 스코프 밖)은 벤더별로 재작성 필요 |
| A3 | `checkins.schema_version` 컬럼은 서버에서 클라이언트 스키마 버전 참고용 메타데이터로만 남기고, 서버 자체 마이그레이션 추적(Flyway `flyway_schema_history`)과는 무관하다는 해석 | Architecture Patterns > Pattern 2 | 낮음~중간 — Phase 12 설계자가 이 컬럼 용도를 다르게 해석하면 동기화 로직에서 혼선 가능, 계획 단계에서 명시적으로 재확인 권장 |
| A4 | `daily_reflections`에 서버 전용 `UNIQUE(user_id, date)` 제약을 추가(클라이언트는 `UNIQUE(date)`만 가짐, 다중 사용자 대비) | Architecture Patterns > Pattern 2 | 낮음 — 오히려 넣지 않으면 다중 사용자 도입(Phase 10) 후 데이터 무결성 버그가 됨 |
| A5 | `lat`/`lng`를 `DOUBLE PRECISION`(부동소수점)으로, 클라이언트 SQLite `REAL`과 같은 계열로 맞춤(고정소수점 `NUMERIC` 대신) | Architecture Patterns > Pattern 2 | 낮음~중간 — Phase 12 동기화 시 부동소수점 비교(정확한 동등 비교 vs 허용오차 비교) 이슈 가능성, Open Questions에도 별도 기재 |

## Open Questions

1. **PaaS 최종 벤더(Railway vs Fly.io vs Render) 확정 시점**
   - What we know: 세 벤더 모두 Dockerfile 배포를 지원하고, 관리형 Postgres를 제공한다. 공식
     가격 페이지 기준 Railway가 1인 개발자 진입 비용이 가장 낮다.
   - What's unclear: 실제 스테이징 배포(계정 생성, Postgres 프로비저닝, 도메인 연결)는 이번
     phase 스코프에 포함되는지 여부가 CONTEXT.md 상 완전히 명시적이지 않음 — Success
     Criteria 1("로컬/스테이징 환경에서 빌드·기동")이 "PaaS에 실제로 떠 있어야 한다"는
     뜻인지, "스테이징 프로파일로 로컬에서 기동 가능해야 한다"는 뜻인지 두 가지로 읽힐 수
     있음.
   - Recommendation: 계획 단계에서 Success Criteria 1의 "스테이징"을 어느 수준까지 만족시킬지
     (실제 Railway 계정 생성까지 포함할지, 아니면 `application-staging.yml` 프로파일 존재 +
     로컬 검증까지만으로 충분한지) 창업자에게 짧게 확인 필요.

2. **`schema_version` 컬럼의 서버측 의미**
   - What we know: 클라이언트에서는 SQLite 마이그레이션 버전(현재 3)을 추적하는 용도.
   - What's unclear: 서버 테이블에도 그대로 컬럼을 두되, 실제로 값을 어떻게 채울지(항상 클라이언트가
     보낸 값을 그대로 저장? 서버가 자체 기본값 1로 고정?) Phase 12 이전엔 API 계약이 없어 결정할
     수 없음.
   - Recommendation: 이번 phase는 컬럼만 만들어두고(DEFAULT 1), 실제 채우기 로직은 Phase 12
     스코프로 명시적으로 넘긴다(A3 참고).

3. **`lat`/`lng` 정밀도가 Phase 12 동기화 비교 로직에 미칠 영향**
   - What we know: 클라이언트 SQLite `REAL`과 서버 Postgres `DOUBLE PRECISION`은 둘 다 IEEE
     754 배정밀도 부동소수점이라 표현 자체는 동일하다.
   - What's unclear: Phase 12가 "변경 여부"를 필드 단위로 비교할 때 부동소수점 동등비교를 쓸지,
     허용오차(epsilon) 비교를 쓸지는 아직 설계되지 않았다.
   - Recommendation: 이번 phase에서는 타입 선택(DOUBLE PRECISION)만 확정하고, 비교 전략은
     Phase 12 RESEARCH.md로 명시적으로 이관한다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Java (JDK) | Gradle 빌드/실행 | ✓ | 21.0.6 LTS(로컬 실측) | Gradle 툴체인이 로컬에 없어도 자동 프로비저닝 가능 |
| Docker Desktop (daemon) | Docker Compose(D-12), Dockerfile 빌드, Testcontainers | ✓ | Client 20.10.12 / daemon 정상 기동 확인(aarch64) | 없음 — 이 phase 진행의 핵심 전제, 대체 불가 |
| Docker Compose v2 | `compose.yaml` 실행 | ✓ | v2.2.3 | — |
| Git | 버전관리(D-05, 단일 저장소) | ✓ | 2.39.0 | — |
| GitHub CLI(`gh`) | 선택적, PR/workflow 상태 확인 | ✓ | 2.95.0 | 없어도 GitHub 웹 UI로 대체 가능 |
| 로컬 네이티브 PostgreSQL 설치 | 불필요 — Docker Compose로 완전히 대체(D-12) | N/A | — | — |

**Missing dependencies with no fallback:** 없음.
**Missing dependencies with fallback:** 없음 — 모든 필요 도구가 이미 로컬에 준비되어 있음.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5(Boot4 기본) + `kotlin-test-junit5`, Testcontainers(`testcontainers-postgresql`) |
| Config file | `backend/build.gradle.kts`(`tasks.withType<Test> { useJUnitPlatform() }`) — 별도 설정 파일 없음 |
| Quick run command | `cd backend && ./gradlew test --tests "*MigrationTest" -q` |
| Full suite command | `cd backend && ./gradlew build` (컴파일 + 전체 테스트 + jar 패키징) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| REQ-backend-scaffold | 앱이 로컬/스테이징 프로파일로 빌드·기동되고 `/actuator/health`가 200을 반환 | smoke/integration | `./gradlew test --tests "*HealthCheckSmokeTest"` (`@SpringBootTest(webEnvironment=RANDOM_PORT)`) | ❌ Wave 0(신규 작성) |
| REQ-backend-db-schema | `users`/`checkins`/`daily_reflections` 테이블이 Flyway로 생성되고 기대 컬럼/제약이 존재 | integration | `./gradlew test --tests "*FlywayMigrationTest"` (Testcontainers Postgres 위에서 마이그레이션 적용 후 `information_schema` 조회) | ❌ Wave 0(신규 작성) |

### Sampling Rate

- **Per task commit:** `./gradlew test --tests "<관련 테스트 클래스>"`
- **Per wave merge:** `./gradlew build`(전체 스위트, Testcontainers 포함)
- **Phase gate:** `/gsd:verify-work` 전 `./gradlew build` 전체 그린 확인

### Wave 0 Gaps

- [ ] `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` — Testcontainers
  Postgres에 V1~V3 마이그레이션이 에러 없이 적용되는지, 기대 컬럼/타입/제약(FK, UNIQUE)이
  실제로 존재하는지 검증 — REQ-backend-db-schema 커버
- [ ] `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt` —
  `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)`로 컨텍스트 로딩 +
  `/actuator/health` 200 확인 — REQ-backend-scaffold 성공 기준 1 커버
- [ ] `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt` —
  start.spring.io 스캐폴딩 태스크가 자동 생성(추가 작업 불필요, 확인만)
- [ ] `.github/workflows/backend-ci.yml` — 신규 작성 필요(D-10, 아직 저장소에 없음)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | Phase 10(카카오 OAuth2/PKCE) 소관 — 이번 phase는 인증 로직 자체가 없음 |
| V3 Session Management | No | 위와 동일한 이유 |
| V4 Access Control | No | 이번 phase는 도메인 API 엔드포인트가 없음(`/actuator/health`만 노출) |
| V5 Input Validation | Yes | `spring-boot-starter-validation`(Hibernate Validator 9.1.0) — Phase 10+ API 바디 검증 대비 이미 포함 |
| V6 Cryptography | N/A(이번 phase 범위 밖, 비밀번호/토큰 저장 없음) | 대신 **비밀값 관리**(DB 비밀번호 등)를 Spring Profiles + 환경변수로 강제(D-11), 하드코딩 금지가 실질적 통제 |

### Known Threat Patterns for Spring Boot/Kotlin/PostgreSQL 백엔드

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| SQL Injection | Tampering | Spring Data JPA/Hibernate가 파라미터 바인딩을 기본 사용; Flyway 마이그레이션 SQL은 정적 파일이라 런타임 사용자 입력이 개입하지 않음 |
| Actuator 엔드포인트 과다 노출(`/actuator/env`, `/actuator/beans` 등) | Information Disclosure | `management.endpoints.web.exposure.include=health`로 명시적으로 `health`만 노출(Pattern 3 `application.yml` 참고), 스테이징도 동일 설정 유지 |
| 평문 DB 비밀번호 커밋 | Information Disclosure / Tampering | `application-*.yml`에 비밀번호 하드코딩 금지(D-11) — 환경변수(`${DATABASE_PASSWORD}`) 참조만 허용, GitHub Actions Secrets/PaaS 환경변수로 주입 |
| Docker 이미지에 빌드 캐시/소스 잔존 | Information Disclosure | multi-stage 빌드로 빌드 스테이지(Gradle 캐시, 원본 소스)가 최종 런타임 이미지에 포함되지 않도록 분리(Pattern 4 Dockerfile 참고) |

## Sources

### Primary (HIGH confidence)
- `https://start.spring.io` (공식 Spring Initializr 생성기·metadata API) — Boot 4.1.1 기본값,
  Kotlin 2.3.21, Gradle 9.7.1 wrapper, `docker-compose`/`testcontainers` 의존성 ID, 생성된
  `compose.yaml`/`TestcontainersConfiguration.kt` 확인
- `./gradlew dependencies --configuration runtimeClasspath` 실제 실행 결과 — Hibernate ORM
  7.4.1.Final, Flyway 12.4.0, PostgreSQL JDBC 42.7.11, jackson-module-kotlin 3.1.4 확인
- `https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html` —
  공식 multi-stage Dockerfile(jarmode=tools) 패턴
- `https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide` — Flyway
  starter 필수화, Kotlin 2.2+ 요구, Java 17+ 요구 확인
- Docker Hub API(`hub.docker.com/v2/repositories/library/...`) — `postgres:17`,
  `gradle:9.7.1-jdk21-ubi9`, `eclipse-temurin:21-jre-jammy` 태그 존재 실측
- `https://www.postgresql.org` 13 릴리스 노트 기반 — `gen_random_uuid()` core 내장 확인
- 코드베이스 직접 grep(`src/checkin/photos.ts`) — 클라이언트가 `crypto.randomUUID()`로 ID를
  발급함을 확인(Pitfall 5, Pattern 1 근거)
- `railway.com/pricing`, `fly.io/docs/about/pricing/` 공식 가격 페이지 직접 fetch

### Secondary (MEDIUM confidence)
- JetBrains 공식 블로그(`blog.jetbrains.com/idea`) — Kotlin+JPA `allOpen`/`noarg` 필수 설정
  가이드(Pitfall 1)
- `gradle/actions` GitHub 저장소 — `setup-gradle` 공식 후속 액션, v6 캐싱 아키텍처 재편
- Render 공식 블로그의 Railway/Fly.io/Render 비교 아티클 + 복수의 2026년 커뮤니티 비교
  아티클(Railway/Fly.io/Render 가격·기능 교차검증)

### Tertiary (LOW confidence)
- 없음 — 이번 조사의 핵심 주장은 전부 공식 도구 실행 결과 또는 공식 문서로 교차검증됨

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 버전 정보 전부 `start.spring.io` 실행 + `gradlew dependencies` 실측
- Architecture: HIGH — Dockerfile/GitHub Actions/JPA 패턴은 공식 문서 또는 공식 생성기 산출물
  그대로 인용
- Pitfalls: HIGH(Flyway starter, allOpen) / MEDIUM(GitHub Actions path filter 상호작용) —
  전자는 공식 마이그레이션 가이드 직접 인용, 후자는 GitHub 커뮤니티에서 널리 보고된 패턴이지만
  단일 공식 문서로 못박히진 않음

**Research date:** 2026-09-02
**Valid until:** 2026-10-02 (Spring Boot 4.x는 아직 신생 major 버전대라 패치 릴리스가 빠르게
나올 수 있음 — 30일보다 짧게, 계획 착수 시점에 `start.spring.io` 기본 버전을 재확인 권장)
