---
phase: 09-backend-foundation
plan: 03
subsystem: infra
tags: [docker, dockerfile, github-actions, ci, gradle, spring-boot]

# Dependency graph
requires:
  - phase: 09-backend-foundation (09-01)
    provides: backend/ Spring Boot/Kotlin 스캐폴드(build.gradle.kts, src/)
provides:
  - "backend/Dockerfile — multi-stage(빌드→레이어 추출→런타임) 컨테이너 이미지 정의(D-07), 어느 PaaS로든 재사용 가능"
  - "backend/.dockerignore — 빌드 컨텍스트에서 로컬 산출물/비밀 파일 제외"
  - ".github/workflows/backend-ci.yml — backend/** 경로 필터 build+test CI 게이트(D-10)"
affects: [09-04, 09-05, 09-06, 10-authentication, 11-object-storage, 12-client-server-sync]

# Tech tracking
tech-stack:
  added: [Docker multi-stage build, GitHub Actions, gradle/actions/setup-gradle@v4]
  patterns:
    - "Spring Boot jarmode=tools 레이어 추출(구 layertools 아님)"
    - "비-root 컨테이너 실행(uid 1001 spring 사용자)"
    - "모노레포 경로 필터 CI(backend/** 변경에만 반응, 클라이언트 CI와 완전 분리)"

key-files:
  created:
    - backend/Dockerfile
    - backend/.dockerignore
    - .github/workflows/backend-ci.yml
  modified: []

key-decisions:
  - "이미지 태그는 09-RESEARCH.md에서 Docker Hub API로 실측 확인된 그대로 사용: 빌드 gradle:9.7.1-jdk21-ubi9, 런타임 eclipse-temurin:21-jre-jammy"
  - "브랜치 보호 필수 상태 체크로 backend-ci.yml을 등록하지 않음(Pitfall 4 — 경로 필터 스킵이 '체크 대기 중' 무한 대기를 유발할 수 있음)"

patterns-established:
  - "Pattern: 3-stage Dockerfile(build → extract → runtime)로 Gradle 캐시/원본 소스를 런타임 이미지에서 완전 배제"
  - "Pattern: 모노레포 CI는 워크플로별 paths 필터로 클라이언트/서버를 분리하고, 필수 체크 미등록으로 상호 간섭을 피함"

requirements-completed: [REQ-backend-scaffold]

# Metrics
duration: ~20min
completed: 2026-09-02
---

# Phase 9 Plan 3: 백엔드 컨테이너화 + CI Summary

**Spring Boot jarmode=tools 3단계 Dockerfile(비-root 실행)과 backend/\*\* 경로 필터가 걸린 GitHub Actions build+test 워크플로**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-02
- **Tasks:** 2
- **Files modified:** 3 (전부 신규 생성)

## Accomplishments
- `backend/Dockerfile` 작성 및 `docker build -t footlog-backend:phase9 backend/` 실제 빌드 성공 확인
- 컨테이너가 uid 1001(`spring`) 비-root 사용자로 실행됨을 `docker run --entrypoint id` 실측 확인
- 최종 런타임 이미지에 `/workspace`(빌드 스테이지 작업 디렉터리)나 `*.gradle`/`build.gradle.kts`가 전혀 없음을 실측 확인(T-9-08)
- `.github/workflows/backend-ci.yml`을 저장소 최초 GitHub Actions 워크플로로 생성 — `backend/**` 경로 필터, `gradle/actions/setup-gradle@v4` 캐싱, `./gradlew build --no-daemon` 게이트

## Task Commits

Each task was committed atomically:

1. **Task 1: multi-stage Dockerfile + .dockerignore** - `0bb8bf3` (feat)
2. **Task 2: GitHub Actions backend-ci 워크플로** - `5c3e1f0` (feat)

_TDD 대상 아님(인프라/설정 파일) — RED/GREEN 커밋 사이클 미적용._

## Files Created/Modified
- `backend/Dockerfile` - gradle:9.7.1-jdk21-ubi9 빌드 → eclipse-temurin:21-jre-jammy 레이어 추출/런타임 3단계, `spring`(uid 1001) 비-root 실행
- `backend/.dockerignore` - `build/`, `.gradle/`, `*.jar`, `.git`, `.env*`, `compose.yaml`, `*.md` 등 컨텍스트 제외
- `.github/workflows/backend-ci.yml` - `backend/**` 경로 필터 push/PR 트리거, `actions/setup-java@v4`(temurin 21) + `gradle/actions/setup-gradle@v4` + `./gradlew build --no-daemon`

## Decisions Made
- 이미지 태그는 리서치 단계에서 이미 Docker Hub API로 존재가 실측 확인된 값을 그대로 채택 — 재검증 없이 신뢰
- `backend-ci.yml`을 브랜치 보호 필수 체크로 등록하지 않음(Pitfall 4 — 09-06 게이트 이후 필요 시 재검토)

## Deviations from Plan

None - plan executed exactly as written. Dockerfile에 Pattern 4 원문 대비 추가된 비-root 사용자 블록(`useradd`/`chown`/`USER spring`)은 플랜의 `<action>`에서 명시적으로 지시된 부분이라 편차가 아님.

## Issues Encountered
- Dockerfile 주석에 `jarmode=tools` 문자열을 그대로 인용했더니 acceptance criteria의 `grep -c 'jarmode=tools'`가 실제 RUN 지시문(1건)이 아닌 2건(주석 포함)을 세어 게이트를 벗어남 — 주석 문구를 "jarmode tools 모드"로 바꿔 실제 명령 인용 1건만 매칭되도록 수정. 동작 변경 없음, 순수 문구 조정.

## User Setup Required
None - no external service configuration required. 실제 GitHub Actions 실행 결과 확인(push 이후)은 09-06 게이트에서 수행 예정.

## Next Phase Readiness
- `backend/Dockerfile`은 D-06(PaaS 지향)에 따라 Railway/Fly.io/Render 어디로 배포하든 그대로 재사용 가능한 상태
- CI 게이트가 `backend/**` 변경마다 컴파일+Testcontainers 통합 테스트를 자동 실행하므로, 이후 09-04/09-05(엔티티·API 구현) 플랜부터 회귀 방지 안전망이 작동
- 브랜치 보호 필수 체크 등록 여부는 09-06 이후 사용자 판단으로 결정 필요(비차단)

---
*Phase: 09-backend-foundation*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: backend/Dockerfile
- FOUND: backend/.dockerignore
- FOUND: .github/workflows/backend-ci.yml
- FOUND: .planning/phases/09-backend-foundation/09-03-SUMMARY.md
- FOUND commit: 0bb8bf3 (Task 1)
- FOUND commit: 5c3e1f0 (Task 2)
- FOUND commit: ea4caf3 (docs: SUMMARY.md)
