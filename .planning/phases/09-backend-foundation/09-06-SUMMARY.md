---
phase: 09-backend-foundation
plan: 06
subsystem: backend-validation-gate
tags: [gradle, docker, docker-compose, flyway, staging-decision, phase-gate]
dependency-graph:
  requires: [09-01, 09-02, 09-03, 09-04, 09-05]
  provides: [phase-9-gate-closed, staging-scope-decision]
  affects: [phase-10, phase-11, phase-12]
tech-stack:
  added: []
  patterns:
    - "spring-boot-docker-compose(4.1.1)의 DockerCli\\$DockerCommands.getDockerComposeCommand()는 `docker compose version --format json`의 JSON 파싱 실패(StreamReadException)에 대한 폴백이 없다 — ProcessExitException(비정상 종료)만 폴백 대상이고, 정상 종료했지만 출력이 깨진 경우는 그대로 앱 기동을 실패시킨다"
key-files:
  created: []
  modified:
    - .planning/phases/09-backend-foundation/09-VALIDATION.md
decisions:
  - "09-06 창업자 결정: option-a(스테이징 = 프로파일 + 자동 테스트까지) 채택 — 실제 PaaS 배포는 Phase 9 범위 밖, Phase 10 이후로 이관"
  - "Task 2 로컬 검증 중 발견한 Docker Desktop(2022-02-10 설치, Compose CLI plugin v2.2.3)의 `docker compose version --format json` 출력 버그는 저장소 코드가 아니라 이 개발 머신의 도구 버전 문제로 판단 — 코드/설정 변경 없이 검증 시점에만 임시 PATH 셔닝으로 우회, 저장소에는 아무 흔적도 남기지 않음"
metrics:
  duration: "약 55분"
  completed: 2026-09-02
---

# Phase 9 Plan 6: 최종 게이트 검증 + 창업자 결정(스테이징 범위) Summary

Phase 9(Backend Foundation) 산출물 전체를 하나의 게이트로 통과시켰다 — 전체 빌드/테스트,
Docker 이미지 비-root 실행, 비밀값 부재, 마이그레이션 불변성, `./gradlew bootRun` 한 줄로의
로컬 Postgres 자동 기동을 전부 실행 증거로 확인했고, 계획 단계부터 열려 있던 "스테이징 범위"
질문을 창업자 결정(option-a)으로 닫았다. 검증 과정에서 이 개발 머신의 구형 Docker Desktop이
가진 CLI 버그를 근본 원인까지 추적해 저장소 코드 변경 없이 우회 검증했다.

## What Was Done

### Task 1 — 전체 게이트(build / docker / 비밀값 / 마이그레이션 불변)

- `cd backend && ./gradlew build` → **BUILD SUCCESSFUL in 37s**. `build/test-results/`에서 5개
  테스트 클래스(`BackendApplicationTests`, `EntityPersistenceTest`, `FlywayMigrationTest`,
  `HealthCheckSmokeTest`, `StagingProfileBootTest`) 결과 파일 전부 확인.
- `docker build -t footlog-backend:phase9 backend/` → 성공(multi-stage, jarmode=tools 레이어
  추출). `docker run --rm --entrypoint id footlog-backend:phase9 -u` → `1001`(비-root `spring`
  유저) 확인.
- `grep -RhE '^[^#]*password:' backend/src/main/resources/application*.yml | grep -v '\${' | wc -l`
  → `0`(평문 비밀값 없음, `application-staging.yml`의 `password: ${DATABASE_PASSWORD}`만 존재).
- `ls backend/src/main/resources/db/migration/ | grep -c '^V'` → `3`(V1~V3만 존재).
  `git log --oneline -- backend/src/main/resources/db/migration/` → 커밋 1건(`57ec18b`, 09-02
  최초 작성)만 존재, 이후 수정 이력 없음 — 마이그레이션 불변 규율 준수 확인.
- `09-VALIDATION.md` 갱신: frontmatter `status: complete` / `nyquist_compliant: true` /
  `wave_0_complete: true`, Per-Task Verification Map 플레이스홀더(`09-01-XX`/`09-02-XX`)를 실제
  플랜·테스트 클래스 5행으로 교체(File Exists ✅, Status ✅ green), Wave 0 체크리스트 4항목
  전부 체크, Validation Sign-Off 전부 체크 + `Approval: approved (09-06)`.

### Task 2 — 로컬 원커맨드 기동 실검증(D-12)

**1차 시도 실패 → 근본 원인 추적:** `SPRING_PROFILES_ACTIVE=local ./gradlew bootRun`을 처음
포트 8081로 실행했을 때 `docker compose version --format json`의 JSON 파싱 중
`StreamReadException`으로 앱 기동 자체가 실패했다. `.claude/skills/systematic-debugging` 절차대로
`spring-boot-docker-compose-4.1.1.jar`의 `DockerCli$DockerCommands` 클래스를 `javap`로 직접
디컴파일해 정확한 원인을 확인했다:

- 이 머신의 Docker Desktop(설치일 2022-02-10, Compose CLI plugin v2.2.3)에서
  `docker compose version --format json`을 실행하면 `{"version":"v2.2.3"}` 뒤에 실제 개행
  바이트(0x0A)가 아니라 **리터럴 두 글자 `\n`(백슬래시+n)**이 출력된다(`od -c`로 바이트 단위
  확인). Spring Boot 4.1.1의 `DockerCli$DockerCommands.getDockerComposeCommand()`는
  `ProcessExitException`(비정상 종료)만 폴백 처리하고, 정상 종료했지만 JSON이 깨진 이 경우는
  전혀 잡지 못해 앱 기동이 그대로 크래시한다.
- 같은 머신에서 `docker compose config --format json`, `docker compose ps --format json`은
  전부 정상적으로 실제 개행으로 끝난다는 것을 `od -c`로 교차 확인 — 버그는 `compose version`
  서브커맨드 하나에만 국한되며, Docker 데몬·Testcontainers·Task 1의 5개 자동 테스트가 이미
  같은 Docker 데몬으로 정상 동작했으므로 Docker 자체는 문제가 아니었다.
- **우회:** 검증 목적으로만 `PATH`에 얇은 셸 스크립트 하나를 임시로 앞세워, `docker compose
  version`만 가로채 실제 `docker` 바이너리 출력의 트레일링 바이트를 정상 개행으로 정규화하고
  나머지 모든 명령은 그대로 실제 바이너리에 위임했다(스크립트는 스크래치패드 디렉터리에만
  존재, 저장소에는 커밋되지 않음 — `backend/compose.yaml`, `application-local.yml` 등 프로덕션
  코드는 전혀 수정하지 않았다). 이 셸 스크립트로 재시도하자 정상 기동을 확인했다.
- **2차 시도(포트 8081)도 재실패:** 이번엔 다른 프로젝트(`Team3-rdParty`, 이 사용자의 별도
  워크스페이스)가 이미 `--server.port=8081`로 떠 있어 "Port 8081 was already in use"로 실패 —
  우리 앱이 아닌 기존 프로세스가 응답한 걸 헬스체크가 잘못 200으로 잡아낸 상황이었다(같은 PID를
  직접 대조해 우리 프로세스가 아님을 확인 후 재시도 판단).
- **3차 시도(포트 8082, 완전히 비어있는 포트 확인 후):** 성공.

**최종 성공 로그(포트 8082):**
```
Using Docker Compose file .../backend/compose.yaml
Container backend-postgres-1  Creating → Created → Starting → Started
Database: jdbc:postgresql://127.0.0.1:<random>/mydatabase (PostgreSQL 17.5)
Migrating schema "public" to version "1 - create users table"
Migrating schema "public" to version "2 - create checkins table"
Migrating schema "public" to version "3 - create daily reflections table"
Successfully applied 3 migrations to schema "public", now at version v3
Tomcat started on port 8082 (http) with context path '/'
```
`curl http://localhost:8082/actuator/health` → `200` / `{"groups":["liveness","readiness"],"status":"UP"}`.
`docker ps` → `postgres:latest backend-postgres-1 Up 17 seconds`(사전에 수동으로 띄우지 않았는데도
자동 기동됨 — D-12 증거). 확인 후 프로세스(PID 63606) `kill`, `docker compose down -v`로 정리,
`docker compose -f backend/compose.yaml ps -q | wc -l` → `0` 확인.

이 태스크는 새 파일을 만들지 않으며, 계획대로 실행 확인과 로그 기록만이 산출물이다.
`backend/compose.yaml`, `application-local.yml` 등 어떤 프로덕션 코드도 수정하지 않았다.

### Task 3 — 창업자 결정: 스테이징 범위와 PaaS 벤더

**선택된 옵션: `option-a`("스테이징 = 프로파일 + 자동 테스트까지, 권장")**

**근거(창업자 승인 인용):** D-09 문구("로컬+스테이징까지, 프로덕션 배포 자동화는 제외")와 가장
정합적이고, Phase 9를 지금 닫을 수 있다. PaaS 계정/과금 결정은 Phase 10(인증)까지 미룰 수
있다 — 아직 도메인 API가 없어 실제로 배포해서 얻는 것이 없다.

이 결정에 따라 `09-VALIDATION.md`의 Manual-Only Verifications 행을 다음과 같이 갱신했다(Task
1 커밋에 포함):

> 스테이징 환경 실제 배포·기동 확인 → "프로파일 + 자동 테스트로 대체됨, 실제 PaaS 배포는
> 이번 phase 범위 밖" — `StagingProfileBootTest`가 `application-staging.yml` 프로파일 +
> 환경변수 DataSource 기동을 자동 테스트로 커버, 실제 PaaS(Railway 등) 배포는 Phase 10 이후
> 별도 플랜 스코프로 이관.

option-b/c(실제 PaaS 배포)는 선택되지 않았으므로 이 플랜에서 배포 작업을 실행하지 않았고,
후속 플랜(09-07)도 필요하지 않다 — Phase 9는 이 플랜으로 닫힌다.

**Phase 10~12 인계 사항 3건:**

1. **인증 주체 ↔ `user_id` 결합(T-9-05/T-9-16):** 현재 `checkins`/`daily_reflections`는
   `users` 테이블의 플레이스홀더 로우(`00000000-0000-0000-0000-000000000001`) 하나에만
   FK로 연결되어 있다. Phase 10(카카오 OAuth2/PKCE)이 실제 계정을 만들면, 그리고 Phase
   12(동기화 API)가 "인증된 주체의 `user_id`로만 읽고 쓴다"는 접근 제어를 강제해야 한다 —
   지금은 이 접근 제어 자체가 존재하지 않는다(도메인 API가 없으므로 강제할 대상도 없음).
2. **`schema_version` 채우기 전략(09-RESEARCH.md A3 / Open Question 2):** 현재
   `checkins.schema_version`은 `DEFAULT 1`만 존재하고 실제로 값을 어떻게 채울지(클라이언트가
   보낸 값을 그대로 저장할지, 서버가 자체 기본값으로 고정할지)는 결정되지 않았다. Phase
   12(동기화 API 설계 시점)에서 결정한다.
3. **`lat`/`lng` 부동소수점 비교 전략(09-RESEARCH.md A5 / Open Question 3):** 서버
   `DOUBLE PRECISION`과 클라이언트 SQLite `REAL`은 둘 다 IEEE 754 배정밀도라 표현은 동일하지만,
   Phase 12가 "변경 여부"를 필드 단위로 비교할 때 정확 동등비교를 쓸지 허용오차(epsilon)
   비교를 쓸지는 아직 설계되지 않았다 — Phase 12 RESEARCH.md로 이관한다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Docker Desktop의 구형 Compose CLI plugin JSON 출력 버그로
`./gradlew bootRun` 크래시**
- **Found during:** Task 2 1차 실행
- **Issue:** 위 "Task 2" 섹션에 기술한 대로, 이 개발 머신의 Docker Compose CLI plugin(v2.2.3,
  2022년 설치된 Docker Desktop 번들)이 `docker compose version --format json`에서 깨진 JSON을
  출력해 Spring Boot의 `spring-boot-docker-compose` 자동설정이 앱 기동 자체를 크래시시켰다.
- **Fix:** 저장소 코드는 전혀 건드리지 않았다 — `javap`로 `DockerCli$DockerCommands` 바이트코드를
  직접 읽어 정확한 원인(정상 종료 + JSON 파싱 실패는 폴백 없음)을 확인한 뒤, 검증 세션에만
  적용되는 임시 `PATH` 셔닝(스크래치패드 디렉터리, 저장소 밖)으로 `docker compose version`
  호출의 트레일링 바이트만 정규화해 재현·검증했다. `docker compose config`/`ps` 등 실제
  컨테이너 조작 명령은 전부 정상 동작함을 먼저 확인했으므로, 이 우회는 "가짜로 통과시킨" 것이
  아니라 다른 정상 경로들과 동일한 방식으로 실제 컨테이너를 실제로 띄우고 실제 헬스체크
  응답을 받은 것이다.
- **Files modified:** 없음(저장소 파일 변경 없음, 검증 전용 임시 셸 스크립트는
  `/private/tmp/.../scratchpad/`에만 존재하고 커밋되지 않았다).
- **후속 조치 필요(사용자 액션):** 이 특정 개발 머신에서 `./gradlew bootRun`을 워크어라운드
  없이 실행하면 동일하게 크래시한다. Docker Desktop을 최신 버전으로 업그레이드하거나
  `~/.docker/cli-plugins/docker-compose`를 최신 compose CLI 바이너리로 교체하면 근본적으로
  해결된다 — 이는 저장소/코드 문제가 아니라 이 머신의 도구 버전 문제이므로 Phase 9 게이트
  통과 여부와는 무관하다고 판단했다(실제 기동 능력 자체는 위 로그로 증명됨).
- **Commit:** 없음(코드 변경이 없어 커밋 대상 없음, 이 SUMMARY와 로그가 증거).

**2. [작업 재시도 - 환경 충돌] 포트 8081 충돌**
- **Found during:** Task 2 2차 실행
- **Issue:** 계획이 언급한 "포트 8080이 점유돼 있으면 8081로 전환" 대응대로 8081을 썼으나,
  이 머신에서 무관한 다른 프로젝트(`Team3-rdParty`)가 이미 8081을 쓰고 있어 우리 앱이
  "Port 8081 was already in use"로 기동 실패했다 — 게다가 그 무관한 서버의 헬스체크가 마침
  200을 반환해 처음엔 우리 앱이 뜬 것으로 착각할 뻔했으나, PID를 직접 대조해 아님을 확인했다.
- **Fix:** 완전히 비어있는 포트(8082, `lsof`로 사전 확인)로 전환해 재시도, 성공.
- **Files modified:** 없음.
- **Commit:** 없음.

## Known Stubs

없음 — 이 플랜은 검증·문서 갱신만 다루며 UI/데이터 배선이 없다.

## Threat Flags

없음 — 새 엔드포인트/인증 경로/스키마 변경이 없다. 이 플랜의 유일한 관련 위협(T-9-01, T-9-19,
T-9-20, T-9-05/T-9-16)은 09-06-PLAN.md `<threat_model>`에 이미 정의되어 있었고, T-9-01(평문
비밀값 게이트)은 Task 1에서 mitigate 완료(grep 0건), T-9-20은 option-a 선택으로 이번 phase에서
실제로 발생하지 않음(PaaS 배포 자체가 없음), T-9-05/T-9-16은 Task 3에서 Phase 10/12 인계
사항으로 명시적으로 transfer 문서화했다.

## Verification

- `cd backend && ./gradlew build` → BUILD SUCCESSFUL, 5개 테스트 클래스 전부 실행 확인
- `docker build -t footlog-backend:phase9 backend/` → 성공, `docker run --rm --entrypoint id
  footlog-backend:phase9 -u` → `1001`(비-root)
- `grep -RhE '^[^#]*password:' backend/src/main/resources/application*.yml | grep -v '\${' | wc -l`
  → `0`
- `ls backend/src/main/resources/db/migration/ | grep -c '^V'` → `3`
- `./gradlew bootRun`(local 프로파일, 포트 8082) → Postgres 컨테이너 자동 기동 + Flyway 3개
  마이그레이션 적용 + `/actuator/health` 200 `{"status":"UP"}` 확인, 이후 완전 정리 확인
  (`docker compose -f backend/compose.yaml ps -q | wc -l` → `0`)
- `grep -c 'nyquist_compliant: true' .planning/phases/09-backend-foundation/09-VALIDATION.md` → `1`
- `grep -c 'wave_0_complete: true' .planning/phases/09-backend-foundation/09-VALIDATION.md` → `1`
- `grep -c '09-01-XX\|09-02-XX' .planning/phases/09-backend-foundation/09-VALIDATION.md` → `0`
- `grep -c 'HealthCheckSmokeTest' .planning/phases/09-backend-foundation/09-VALIDATION.md` → `2`
- `grep -cE 'option-(a|b|c)' .planning/phases/09-backend-foundation/09-06-SUMMARY.md` → 이 문서
  자체에 `option-a`가 다수 등장(Task 3 결정 인용)

## Note for Orchestrator

`.planning/REQUIREMENTS.md`의 `REQ-backend-scaffold`/`REQ-backend-db-schema`는 현재 두 곳
모두 `Pending`으로 표시되어 있다(불릿 라인 81-82, Traceability 표 165-166행). 이 플랜의 게이트
통과로 두 요구사항 모두 실제로 충족되었으므로, 이 워크트리 에이전트는 공유 파일(STATE.md /
ROADMAP.md와 함께 REQUIREMENTS.md도 `gsd-sdk query requirements.mark-complete`가 auto-mode
classifier에 의해 거부됨)을 직접 수정하지 않고 오케스트레이터의 병합 후 처리로 남겨둔다.
오케스트레이터가 `requirements mark-complete REQ-backend-scaffold REQ-backend-db-schema`를
실행해야 한다.

## Self-Check: PASSED

- FOUND: .planning/phases/09-backend-foundation/09-VALIDATION.md (수정됨, Task 1 커밋에 포함)
- FOUND commit: 9fb19ac (Task 1 — 09-VALIDATION.md 갱신)
- Task 2/3: 파일 변경 없음(계획대로 실행 확인 + 문서 기록만이 산출물), 별도 커밋 없음
