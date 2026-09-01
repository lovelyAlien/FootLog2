# Phase 9: Backend Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 9-Backend Foundation
**Areas discussed:** DB 엔진 & 스키마 전략, 호스팅 & 저장소 구조, 환경 구성 범위

---

## DB 엔진 & 스키마 전략

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL | Spring Boot/Kotlin 생태계 표준, JSON/UUID 지원, 향후 동기화 로직에 유리 | ✓ |
| MySQL | 더 널리 쓰이지만 이 프로젝트 규모에서 이점 크지 않음 | |
| 직접 지정 | SQLite 서버측/MariaDB 등 | |

**User's choice:** PostgreSQL

| Option | Description | Selected |
|--------|-------------|----------|
| 지금부터 user_id 포함 | Phase 12 동기화를 목표로 하므로 user_id가 처음부터 필수 | ✓ |
| Phase 10에서 추가 | 더 빠른 출발이지만 나중에 백필 마이그레이션 필요 | |

**User's choice:** 지금부터 user_id 포함

| Option | Description | Selected |
|--------|-------------|----------|
| Flyway | Spring Boot와 가장 흔히 통합, 클라이언트 PRAGMA user_version 철학과 유사 | ✓ |
| Liquibase | XML/YAML 기반, 더 강력하지만 이 규모엔 과함 | |
| JPA ddl-auto만 사용 | 가장 빠르지만 프로덕션에서 위험 | |

**User's choice:** Flyway

| Option | Description | Selected |
|--------|-------------|----------|
| Spring Data JPA | Spring Boot 표준 조합, Kotlin과 궁합 좋음 | ✓ |
| jOOQ | 타입안전 SQL 빌더, 이 규모엔 과한 설정 | |
| 직접 지정 | 순수 JDBC/MyBatis 등 | |

**User's choice:** Spring Data JPA

**Notes:** 4개 질문 후 "더 논의 vs 다음 단계" 체크에서 사용자가 "다음 단계로" 선택 —
이 영역은 4문항으로 충분히 결정됨.

---

## 호스팅 & 저장소 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 같은 git 저장소 하위 backend/ 폴더 | 모노레포로 관리, 클라이언트/서버 스키마 변경을 한 커밋으로 추적 | ✓ |
| 완전히 별도 git 저장소 | 독립적 배포 주기, 관리 부담 증가 | |

**User's choice:** 같은 git 저장소 하위 backend/ 폴더

| Option | Description | Selected |
|--------|-------------|----------|
| PaaS(Railway/Fly.io/Render 등) | 1인 프로젝트 규모에 서버/DB 관리 부담 최소, Docker 이미지로 배포 | ✓ |
| 자체 서버/VPS | 운영 비용은 낮지만 TLS/방화벽/백업 직접 관리 | |
| 클라우드(AWS/GCP) IaaS | 확장성 좋지만 초기 단계엔 과한 설정, 비용도 높음 | |
| 아직 미결정 | 배포 대상 결정 없이 로컬 빌드/기동만 목표 | |

**User's choice:** PaaS(Railway/Fly.io/Render 등)

| Option | Description | Selected |
|--------|-------------|----------|
| 포함(Dockerfile부터 시작) | PaaS 배포 시 Docker 이미지 전제이므로 처음부터 작성 | ✓ |
| 미포함(로컬은 gradle bootRun) | 로컬 개발만 목표, 컨테이너화는 나중에 | |

**User's choice:** 포함(Dockerfile부터 시작)

| Option | Description | Selected |
|--------|-------------|----------|
| Gradle (Kotlin DSL) | Kotlin 프로젝트 사실상 표준, build.gradle.kts | ✓ |
| Maven | XML 기반, 더 보수적이지만 Kotlin엔 덜 쓰임 | |

**User's choice:** Gradle (Kotlin DSL)

**Notes:** 4문항 완료 후 "더 논의 vs 정리" 체크에서 사용자가 "환경 구성 범위도 마저 논의"를
선택 — 처음 제시했던 3개 영역(DB, 호스팅, 환경) 전부를 순서대로 다루게 됨.

---

## 환경 구성 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 로컬+스테이징까지만 | ROADMAP Goal에 이미 명시된 범위 그대로 | ✓ |
| 프로덕션까지 지금 포함 | Phase 9 범위를 확장해 실제 서비스 운영까지 다룸 | |

**User's choice:** 로컬+스테이징까지만

| Option | Description | Selected |
|--------|-------------|----------|
| 포함(GitHub Actions) | build+test 워크플로우부터 시작, 이후 배포 자동화로 확장 가능 | ✓ |
| 미포함 — 로컬 빌드만 먼저 | CI는 나중에 배포 자동화와 함께 추가 | |

**User's choice:** 포함(GitHub Actions)

| Option | Description | Selected |
|--------|-------------|----------|
| Spring Profiles(application-{env}.yml) | Spring Boot 표준 방식, 비밀값은 환경변수로 주입 | ✓ |
| 별도 secret manager 도입(Vault 등) | 더 안전하지만 1인 프로젝트 초기엔 과한 설정 | |

**User's choice:** Spring Profiles(application-{env}.yml)

| Option | Description | Selected |
|--------|-------------|----------|
| Docker Compose로 로컬 PostgreSQL 실행 | 컨테이너화 결정과 자연스럽게 이어짐, 팀원 간 동일 환경 재현 | ✓ |
| 로컬에 직접 PostgreSQL 설치 | 추가 도구 없이 쓰지만 머신마다 설치 과정이 다를 수 있음 | |

**User's choice:** Docker Compose로 로컬 PostgreSQL 실행

**Notes:** 마지막 "더 불분명한 영역 있나요?" 체크에서 사용자가 "이제 준비됨 — CONTEXT.md
작성"을 선택해 논의 종료.

---

## Claude's Discretion

- 구체적인 PaaS 벤더(Railway vs Fly.io vs Render) 최종 선택
- `backend/` 폴더 내부 패키지 구조(도메인별 vs 레이어별)
- `users` 테이블의 정확한 컬럼 구성(Phase 10 요구사항 구체화 전까지는 최소 스키마)
- GitHub Actions 워크플로우의 정확한 스텝 구성(캐싱 전략 등)

## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md` (점수 0.3,
  약한 매칭) — Today 뷰 UI 항목으로 백엔드 파운데이션과 무관 판단, 폴드하지 않음.
