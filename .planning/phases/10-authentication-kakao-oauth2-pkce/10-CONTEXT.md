# Phase 10: Authentication (Kakao OAuth2/PKCE) - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 카카오 계정으로 OAuth2/PKCE 로그인 플로우를 완료하면 서버가 사용자 계정을
생성/조회하고 자체 인증 토큰(access+refresh JWT)을 발급한다. 클라이언트는 발급된 토큰을
안전하게 저장하고, 만료 임박 시 선제적으로 갱신하며, 이후 모든 서버 요청에 재사용한다
(REQ-auth-kakao-oauth, REQ-auth-session-token). Phase 9(Backend Foundation)에 이은
백엔드/인증/클라우드 병행 트랙의 두 번째 phase다.

**Phase 10이 만들지 않는 것:**
- 1단계(로컬 앱, Phase 1~8) UI에 로그인 화면을 통합하는 것 — 로그인 플로우는 Phase 10
  백엔드 검증용으로만 존재하며, 1단계 앱은 여전히 무인증 단일 사용자 모델을 유지한다
  (PROJECT.md "1단계에는 다중 사용자·인증·계정 개념이 전혀 없음").
- S3 호환 오브젝트 스토리지 연동(Phase 11).
- 클라이언트-서버 동기화 로직(Phase 12) — 발급된 토큰이 실제로 체크인/회고 API 호출에
  쓰이는 것은 Phase 12 스코프.
- 로그아웃/카카오 연결끊기(unlink), 계정 탈퇴 — ROADMAP Success Criteria에 없음, 필요시
  별도 phase.

</domain>

<decisions>
## Implementation Decisions

### 세션/토큰 정책
- **D-01:** 토큰 형식은 **JWT**(stateless) — Redis/세션 스토어 인프라 추가 없이 Spring
  Security로 바로 검증 가능. 1인 프로젝트 규모에 적합.
- **D-02:** **Access + Refresh 이중 토큰** 구조 — REQ-auth-session-token이 명시적으로
  "만료 시 갱신"을 요구.
- **D-03:** TTL은 **access 15분~1시간 / refresh 30일**.
- **D-04:** 클라이언트는 **만료 임박 선제 갱신**(reactive 401 재시도가 아니라 proactive
  refresh) — 사용자가 401을 경험할 일이 거의 없게 한다.

### 카카오 프로필 저장 범위
- **D-05:** users 테이블에 저장할 프로필 필드는 **표준 범위**: `kakao_id` +
  `nickname` + `profile_image_url`. 이메일은 저장하지 않음(선택 동의 항목이라 배제).
- **D-06:** 닉네임/프로필사진은 **매 로그인 시 카카오 최신값으로 갱신** — 별도 API 호출
  없이 로그인 응답에 이미 포함된 값으로 갱신 가능.
- **D-07:** 카카오 이메일 제공에 **동의하지 않은 사용자도 로그인 허용** — 이메일 필드는
  애초에 저장 대상이 아니므로(D-05) 자연스럽게 필수 동의 항목이 아니다.
- **D-08:** `kakao_id` 컬럼에 **UNIQUE 제약** — 동일 카카오 계정으로 중복 계정 생성 방지.
  (선택지가 하나뿐이라 질문 없이 적용.)

### 플레이스홀더 사용자 전환
- **D-09:** Phase 9의 플레이스홀더 사용자 로우(`00000000-0000-0000-0000-000000000001`)는
  **실데이터가 전혀 없는 테스트/스캐폴딩 fixture**다 — 클라이언트-서버 동기화(Phase 12)가
  아직 없어 실사용 데이터가 쌓일 경로 자체가 없었다. 따라서 이건 "데이터 마이그레이션"
  문제가 아니라 "새 스키마와 기존 fixture의 공존" 문제다.
- **D-10:** 플레이스홀더 로우는 **그대로 두고 테스트 전용으로 유지** — Phase 9의
  `FlywayMigrationTest`/`EntityPersistenceTest`가 계속 참조하는 fixture로 남긴다. 삭제하고
  테스트를 카카오 로그인 흐름 기반으로 재작성하지 않는다.
- **D-11:** V4 마이그레이션(카카오 관련 신규 컬럼 추가)에서 플레이스홀더 로우의 새 컬럼
  값은 **NULL 허용**(nullable) — `kakao_id` 등은 nullable이어야 하며, UNIQUE 제약(D-08)은
  실사용자 로우에만 적용된다(Postgres는 NULL을 UNIQUE 위반으로 취급하지 않음).
- **D-12:** 창업자 본인이 카카오로 로그인하면 새 UUID로 새 계정이 생성되어 users
  테이블에 로우가 2개(플레이스홀더 + 실사용자) 남는다 — **문제없음, 그대로 둔다**. 1인
  프로젝트 규모에서 정리 작업은 불필요.

### 클라이언트 로그인 트리거 방식
- **D-13:** **카카오 공식 네이티브 SDK**(`@react-native-seoul/kakao-login` 계열)를 쓴다 —
  카카오톡 설치 시 앱 전환, 미설치 시 웹뷰 폴백을 SDK가 자동 처리. 프로젝트가 이미
  EAS Dev Client(네이티브 모듈 필수, `react-native-maps` 때문)를 쓰고 있어 SDK 도입에
  제약이 없다(PROJECT.md Constraints).
- **D-14 (2026-09-02 계획 단계에서 수정, 원안 폐기):** 원안은 "인가 코드+PKCE만 백엔드로
  전달, 백엔드가 카카오와 토큰 교환"이었으나, 계획 단계에서 `@react-native-seoul/kakao-login`
  v6.0.4의 실제 타입 정의(`node_modules/.../src/index.d.ts`, `src/types/index.d.ts`)를
  직접 설치·확인한 결과 `login()`/`loginWithKakaoAccount()`는 인가 코드가 아니라 카카오
  `accessToken`/`refreshToken`/`idToken`을 포함한 `KakaoOAuthToken` 전체를 JS로 직접
  반환하며, 인가 코드만 받는 저수준 API는 SDK에 존재하지 않음을 확인(D-13 네이티브 SDK
  유지와 구조적으로 양립 불가). **수정된 결정:** 클라이언트는 SDK가 반환한 카카오
  `accessToken`을 백엔드로 전달하고, 백엔드는 그 액세스 토큰으로 카카오
  `/v2/user/me`만 호출해 사용자 정보를 얻은 뒤 **DB에 저장하지 않고 폐기**한다(자체
  JWT만 발급). PKCE `code_verifier`는 이 경로에서 쓰이지 않는다(SDK 내부에서 이미
  처리됨). "카카오 액세스 토큰을 저장하지 않는다"는 D-14의 핵심 취지는 유지되며,
  "클라이언트가 그 토큰을 아예 보지 않는다"는 부분만 완화됐다.
- **D-15:** 로그인 실패/취소 시 **에러 메시지 + 재시도 버튼**을 표시 — 기존 앱의 체크인
  저장 실패 UX 패턴과 일관성 유지.
- **D-16:** 로그인 화면은 **Phase 10 백엔드 검증용으로만 존재** — 1단계(Phase 1~8) 앱
  UI에는 통합하지 않는다. PROJECT.md의 "1단계에는 다중 사용자·인증·계정 개념이 전혀
  없음" 원칙을 그대로 지킨다. 검증은 별도 개발자용 테스트 화면 또는 백엔드 통합 테스트로
  수행 — 정확한 검증 메커니즘(테스트 앱 화면 vs API 레벨 테스트)은 연구/계획 단계에서
  결정.

### Claude's Discretion
- 로그인 검증 메커니즘의 정확한 형태(테스트용 최소 화면 vs 순수 백엔드 통합 테스트 vs
  둘 다) — D-16이 "1단계 UI에 통합하지 않는다"는 방향만 정했고, 구체적 검증 방법은
  연구/계획 단계에서 판단.
- `backend/` 패키지 구조(예: `com.footlog.backend.auth`) 내부 클래스 분할(컨트롤러/서비스/
  DTO 경계) — 표준 Spring Boot 관례를 따르며 계획 단계에서 결정.
- 카카오 SDK의 정확한 버전/네이티브 설정(Config Plugin 여부 등) — 기술 구현 세부사항,
  연구 단계에서 결정.
- V4 마이그레이션의 정확한 컬럼 타입/길이(예: `nickname VARCHAR(?)`) — 계획 단계에서
  카카오 API 응답 스펙 확인 후 결정.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §백엔드/인증/클라우드 (Phase 9~12) — `REQ-auth-kakao-oauth`,
  `REQ-auth-session-token`. Phase 11/12의 `REQ-storage-*`/`REQ-sync-*`는 이 phase 소관이
  아니지만 Phase 10의 토큰 설계(D-01~D-04)가 이들의 인증 전제가 된다.
- `.planning/ROADMAP.md` §Phase 10 — Goal(카카오 OAuth2/PKCE 로그인 + 토큰 발급) /
  Success Criteria 2개 / Depends on: Phase 9.

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` §Context — "1단계에는 다중 사용자·인증·계정 개념이 전혀 없음"
  (D-16의 근거) 및 명시적 kill condition 문단(백엔드 착수가 kill condition을 폐기한 것은
  아님, downstream이 인지해야 함).
- `.planning/PROJECT.md` §Constraints — EAS Dev Client 필수(Expo Go 불가) 근거, D-13
  네이티브 SDK 채택이 이 제약과 충돌하지 않는 이유.

### Phase 9 산출물 (이 phase가 확장하는 기반)
- `.planning/phases/09-backend-foundation/09-CONTEXT.md` — D-02(`user_id` FK를 Phase 9부터
  포함시킨 이유), Claude's Discretion("users 테이블은 Phase 10에서 카카오 응답 필드에 맞춰
  확장") — 이 phase가 바로 그 확장을 수행한다.
- `backend/src/main/resources/db/migration/V1__create_users_table.sql` — 현재 `users`
  스키마(`id UUID PK DEFAULT gen_random_uuid()`, `created_at`)와 플레이스홀더 로우
  INSERT. V4 마이그레이션은 이 파일을 수정하지 않고 새 파일로 추가한다(append-only 규율,
  09-PATTERNS.md).
- `backend/src/main/kotlin/com/footlog/backend/user/User.kt` — 현재 JPA 엔티티(ID
  자동생성 없음, 호출부가 UUID 지정). 카카오 필드 추가 시 이 엔티티도 확장 필요.
- `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt`,
  `EntityPersistenceTest.kt` — `PLACEHOLDER_USER_ID` 상수를 참조하는 기존 테스트(D-10에
  따라 유지).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/main/kotlin/com/footlog/backend/user/{User,UserRepository}.kt` — 이번
  phase가 확장할 기존 엔티티/리포지토리.
- Spring Boot 4.1.1 + Kotlin 2.3.21 + Flyway + Spring Data JPA 스택(Phase 9 완료) — 인증
  기능도 동일 스택 위에 얹는다. Spring Security는 아직 의존성에 없음 — 이번 phase에서
  추가 필요.
- `backend/src/main/resources/application*.yml`(공통/local/staging) — 카카오 OAuth
  client_id/secret 등 비밀값은 D-11의 비밀값 미하드코딩 원칙(Phase 9 D-11 계승)에 따라
  환경변수로 주입.

### Established Patterns
- Flyway 마이그레이션 append-only 규율(V1~V3 기존 파일 수정 금지, V4+로만 확장).
- 클라이언트가 ID를 발급하는 테이블(`checkins`/`daily_reflections`)과 서버가 ID를
  발급하는 테이블(`users`)의 구분 — 카카오로 신규 가입하는 사용자도 서버가
  `gen_random_uuid()`로 ID를 발급(User.kt 주석 참고, 09-RESEARCH.md Pitfall 5).

### Integration Points
- 클라이언트(Expo 앱)와의 실제 연동은 Phase 12(동기화) 스코프 — Phase 10은 서버 인증
  플로우 + 검증용 클라이언트 트리거(D-16)까지만 다룬다.

</code_context>

<specifics>
## Specific Ideas

- 토큰 발급까지의 흐름(2026-09-02 D-14 수정 반영): 클라이언트(네이티브 카카오 SDK, D-13)
  → `login()`이 카카오 `accessToken`을 직접 반환 → 백엔드로 그 `accessToken` 전달(D-14) →
  백엔드가 그 토큰으로 카카오 `/v2/user/me`만 호출해 사용자 정보 수신, 토큰 자체는 저장하지
  않고 폐기 → `users` 테이블 조회/생성(kakao_id UNIQUE 매칭, D-08) → 자체 JWT(access+refresh,
  D-01~D-04) 발급 → 클라이언트가 안전하게 저장.

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음. 로그아웃/연결끊기, 계정 탈퇴, 1단계 UI 통합
같은 후보들은 논의 중 자연스럽게 스코프 밖으로 확인되었을 뿐 사용자가 새 capability로
제안한 것은 아니었다.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md`(약한 매칭,
  점수 0.3) — "재센터 버튼을 애플 지도 방식으로 개선". Today 뷰 UI 항목으로 인증
  스코프와 전혀 무관하다고 판단해 폴드하지 않음(Phase 9에서도 동일하게 리뷰됨).

</deferred>

---

*Phase: 10-Authentication (Kakao OAuth2/PKCE)*
*Context gathered: 2026-09-02*
