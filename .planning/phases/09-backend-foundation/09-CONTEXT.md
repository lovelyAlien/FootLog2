# Phase 9: Backend Foundation - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Spring Boot(Kotlin) 백엔드 프로젝트가 스캐폴딩되고, 로컬/스테이징 환경에서 빌드·기동되며,
클라이언트 `Checkin`/`DailyReflection` 스키마에 대응하는 서버측 DB 테이블이 버전 관리되는
마이그레이션 프레임워크로 존재한다(REQ-backend-scaffold, REQ-backend-db-schema). 이 phase는
1단계 로컬 앱 로드맵(Phase 1~8)과 독립적으로 병행 진행되는 트랙의 첫 phase다 — 1단계 실사용
트라이얼 완료를 기다리지 않고 사용자 명시적 승인으로 착수됐다(PROJECT.md Key Decisions,
2026-09-01 참고).

**Phase 9가 만들지 않는 것:**
- 카카오 OAuth2/PKCE 인증 자체(Phase 10) — 이번 phase는 `users` 테이블과 `user_id` FK
  컬럼만 스키마에 미리 반영해두고, 실제 로그인/토큰 발급 로직은 만들지 않는다.
- S3 호환 오브젝트 스토리지 연동(Phase 11) — 사진 업로드 엔드포인트 없음.
- 클라이언트-서버 동기화 로직(Phase 12) — 이번 phase는 서버가 "존재하고 기동될 뿐", 클라이언트
  Expo 앱과의 실제 통신/API 계약은 아직 없다.
- 프로덕션 배포 — 이번 phase의 환경 범위는 로컬+스테이징까지이며, 프로덕션 배포 자동화는
  이후 phase(또는 별도 phase)로 미룬다.

</domain>

<decisions>
## Implementation Decisions

### DB 엔진 & 스키마 전략
- **D-01:** DB 엔진은 **PostgreSQL**을 쓴다 — Spring Boot/Kotlin 생태계에서 가장 흔한 조합이고,
  이후 Phase 12(client-server sync) 충돌 해소 로직에도 유리하다는 판단.
- **D-02:** `checkins`/`daily_reflections` 서버측 테이블에는 **Phase 9부터 `user_id` 컬럼을
  포함**한다 — Phase 10 인증이 들어온 뒤 다시 마이그레이션으로 추가하지 않는다. 지금은 `users`
  테이블에 단일 플레이스홀더 로우를 두고 FK로 연결해둔다(Phase 12가 여러 기기/계정 동기화를
  목표로 하므로 user_id는 처음부터 필수라는 판단).
- **D-03:** 마이그레이션 프레임워크는 **Flyway**를 쓴다 — 클라이언트의 `PRAGMA user_version` +
  순차 마이그레이션 함수 방식과 철학이 비슷하고(순차 적용되는 버전 SQL 파일), Spring Boot와
  가장 흔히 통합되는 조합.
- **D-04:** 데이터 접근 계층은 **Spring Data JPA**를 쓴다 — Kotlin data class + JPA 엔티티
  조합이 이 프로젝트 규모의 단순 CRUD에 적합하고, 참고 자료가 가장 풍부하다.

### 저장소 구조 & 호스팅
- **D-05:** 백엔드 코드는 **같은 git 저장소(FootLog2) 하위 `backend/` 폴더**에 둔다 — 별도
  저장소로 분리하지 않는다. Expo 클라이언트 빌드/CI와 Spring Boot 서버 빌드/CI 경로는
  분리하되(예: `backend/` 하위에서만 Gradle 실행), 저장소 자체는 하나로 유지해 클라이언트/서버
  스키마 변경을 한 커밋으로 추적하기 쉽게 한다.
- **D-06:** 실제 배포 대상은 **PaaS(Railway/Fly.io/Render 등)**를 염두에 둔다 — 1인
  프로젝트 규모에서 서버/DB 운영 부담이 가장 적고, Docker 이미지 하나로 배포 가능해 이번
  phase의 산출물(Dockerfile)이 그대로 쓰인다. 구체적인 PaaS 벤더 선택은 연구/계획 단계에서
  더 좁혀도 된다(D-06은 "직접 서버/VPS 관리는 하지 않는다"는 방향성 결정).
- **D-07:** **Docker 컨테이너화를 Phase 9부터 포함**한다 — Dockerfile을 처음부터 작성해,
  나중에 배포 단계에서 다시 손대지 않게 한다.
- **D-08:** 빌드 도구는 **Gradle(Kotlin DSL, `build.gradle.kts`)**을 쓴다 — Kotlin 프로젝트의
  사실상 표준.

### 환경 구성 범위
- **D-09:** 이번 phase의 환경 범위는 **로컬 + 스테이징까지**다 — ROADMAP.md Goal에 이미
  명시된 범위 그대로. 프로덕션 배포 자동화는 포함하지 않는다.
- **D-10:** **CI 파이프라인(GitHub Actions)을 Phase 9에 포함**한다 — 최소한 build+test
  워크플로우부터 시작해, 이후 phase에서 배포 자동화로 확장할 수 있는 기반을 만든다.
- **D-11:** 환경별 설정(DB 접속정보, 포트 등)은 **Spring Profiles**(`application-{env}.yml`,
  local/staging)로 관리한다. 비밀값(DB 비밀번호 등)은 환경변수로 주입하고 설정 파일에
  하드코딩하지 않는다. 별도 secret manager(Vault 등) 도입은 이번 phase 스코프 밖 — 1인
  프로젝트 초기 단계에는 과한 설정으로 판단.
- **D-12:** 로컬 개발 시 PostgreSQL은 **Docker Compose**(`docker-compose.yml`)로 띄운다 —
  D-07의 컨테이너화 결정과 자연스럽게 이어지며, 로컬 환경을 재현 가능하게 만든다.

### Claude's Discretion
- 구체적인 PaaS 벤더(Railway vs Fly.io vs Render) 최종 선택 — D-06은 방향성(자체 서버 대신
  PaaS)만 결정했고, 벤더별 가격/기능 비교는 연구 단계에서 판단.
- `backend/` 폴더 내부 패키지 구조(도메인별 vs 레이어별 패키징) — 표준 Spring Boot 관례를
  따르며 연구/계획 단계에서 결정.
- `users` 테이블의 정확한 컬럼 구성(이메일/닉네임 등 추가 필드 여부) — Phase 10 인증
  요구사항이 구체화되기 전까지는 최소 스키마(id, created_at 정도)로 시작하고, Phase 10에서
  카카오 OAuth2 응답 필드에 맞춰 확장. 이번 phase는 FK 관계만 만들어두면 충분.
- GitHub Actions 워크플로우의 정확한 스텝 구성(캐싱 전략 등) — 기술 구현 세부사항, 연구/계획
  단계에서 결정.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §백엔드/인증/클라우드 (Phase 9~12) — REQ-backend-scaffold,
  REQ-backend-db-schema. 이 섹션은 기존 단일 백로그 버킷(`REQ-phase2-backend`)을 8개
  원자적 요구사항으로 분해한 것 — 나머지 6개(REQ-auth-*, REQ-storage-*, REQ-sync-*)는
  Phase 10~12 소관이지만, Phase 9의 스키마 설계(D-02 user_id)는 이들을 미리 감안한 결정.

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` §Key Decisions (2026-09-01 항목) — 1단계 실사용 트라이얼 완료
  게이트를 사용자 명시적 승인으로 우회하고 착수했다는 결정과 그 배경(⚠️ Revisit 표시,
  트라이얼 데이터 없이 착수했으므로 kill condition 재평가 필요).
- `.planning/PROJECT.md` §Context — 명시적 kill condition 문단(2026-09-01 갱신) — 백엔드
  착수가 kill condition 자체를 폐기한 것은 아니며, 1단계 실사용 중 조건이 실제 발동하면
  재평가가 필요하다는 점을 downstream이 인지해야 함.
- `.planning/ROADMAP.md` §Phase 9 — Goal(로컬/스테이징 환경 빌드·기동) / Success Criteria 2개
  / Depends on: Nothing(1단계 roadmap과 독립 트랙).
- `.planning/STATE.md` §Roadmap Evolution, §Decisions (2026-09-01 항목) — Phase 9~12 추가
  경위와 `/gsd-new-milestone` 대신 `/gsd-phase`를 선택한 이유(데이터 손실 회피).

### 클라이언트 스키마 (서버 스키마 설계의 근거)
- `src/db/schema.ts` — 클라이언트 SQLite `CheckinRow`/`DailyReflectionRow` 타입과 DDL.
  서버측 `checkins`/`daily_reflections` 테이블은 이 필드 구성(id, timestamp_utc,
  local_date_key, timezone_at_capture, lat, lng, accuracy_meters, location_source, note,
  photo_path, created_at, updated_at, schema_version / date, new_place_answer,
  free_reflection)에 대응해야 한다 — Phase 12 동기화가 필드 단위로 비교·병합할 수 있으려면
  클라이언트·서버 스키마가 최대한 1:1로 맞아야 함. 단, `photo_path`는 서버에서는 로컬
  파일시스템 경로가 아니라 Phase 11의 S3 객체 키/URL로 대체될 가능성이 높음 — Phase 11에서
  재검토.
- `src/db/migrations.ts` — 클라이언트의 `PRAGMA user_version` + 순차 마이그레이션 함수 패턴.
  D-03(Flyway 채택)의 철학적 근거 — 순차 버전 SQL 파일이라는 점에서 유사한 사고방식.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 없음 — 이 phase는 저장소에 백엔드 코드가 전혀 없는 상태에서 시작하는 그린필드 작업.
  `backend/` 폴더 자체가 신규 생성 대상(D-05).

### Established Patterns
- `src/db/schema.ts`/`migrations.ts`의 "순차 버전 마이그레이션 + 스키마를 문자열 상수로
  명시" 패턴 — 서버측 Flyway 마이그레이션 파일 설계 시 참고할 사고방식(직접 재사용되는
  코드는 아님, 언어/프레임워크가 다름).

### Integration Points
- 현재는 없음 — 클라이언트 Expo 앱과 이 백엔드 사이의 실제 API 연동은 Phase 12(동기화)
  스코프. Phase 9는 서버가 독립적으로 기동되는 것까지만 확인한다.

</code_context>

<specifics>
## Specific Ideas

- PostgreSQL + Flyway + Spring Data JPA + Gradle(Kotlin DSL) 조합, Docker Compose로 로컬
  DB 실행, PaaS(Railway/Fly.io/Render 계열) 배포 지향, GitHub Actions CI 포함 — 이 8가지가
  이번 논의의 핵심 스택 결정.
- `backend/` 폴더를 같은 저장소에 두어 클라이언트/서버 스키마 변경을 함께 추적(D-05).

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음. DB 스택, 저장소/호스팅 구조, 환경 구성이라는 세
영역 모두 "Backend Foundation을 어떻게 지을지"에 대한 결정이었고, 새로운 capability를
스코프에 추가하지 않았다.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md`(약한 매칭,
  점수 0.3) — "재센터 버튼을 애플 지도 방식으로 개선". Today 뷰 UI 항목으로 백엔드 파운데이션
  스코프와 전혀 무관하다고 판단해 폴드하지 않음.

</deferred>

---

*Phase: 9-Backend Foundation*
*Context gathered: 2026-09-01*
