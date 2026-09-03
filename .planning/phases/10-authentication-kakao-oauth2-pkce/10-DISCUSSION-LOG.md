# Phase 10: Authentication (Kakao OAuth2/PKCE) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 10-Authentication (Kakao OAuth2/PKCE)
**Areas discussed:** 세션/토큰 정책, 카카오 프로필 저장 범위, 플레이스홀더 사용자 전환, 클라이언트 로그인 트리거 방식

---

## 세션/토큰 정책

| Option | Description | Selected |
|--------|-------------|----------|
| JWT | Stateless — 서버가 서명해 발급, 검증시 DB 조회 불필요 | ✓ |
| Opaque 토큰 + 서버 세션 테이블 | 무작위 문자열을 DB에 저장하고 요청마다 조회 | |

**User's choice:** JWT

| Option | Description | Selected |
|--------|-------------|----------|
| Access + Refresh 이중 토큰 | access는 짧게, refresh는 길게 | ✓ |
| 단일 장수명 토큰 | 구현은 단순하지만 토큰 유출 시 위험 큼 | |

**User's choice:** Access + Refresh 이중 토큰

| Option | Description | Selected |
|--------|-------------|----------|
| access 15분~1시간 / refresh 30일 | 업계 통상 범위 | ✓ |
| 더 짧게 (access 5분 / refresh 7일) | | |
| 더 길게 (access 1일 / refresh 90일) | | |

**User's choice:** access 15분~1시간 / refresh 30일

| Option | Description | Selected |
|--------|-------------|----------|
| 만료 임박 선제 갱신 | 백그라운드로 미리 갱신, 사용자가 401 경험 없음 | ✓ |
| 401 응답 받으면 재시도(reactive) | 구현은 더 간단 | |

**User's choice:** 만료 임박 선제 갱신

---

## 카카오 프로필 저장 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 (kakao_id만) | 닉네임/사진은 매번 카카오에서 재조회 | |
| 표준 (kakao_id + 닉네임 + 프로필사진 URL) | 화면 표시용 정보를 로컬 캐시 | ✓ |
| 전체 (+ 이메일) | 이메일까지 저장, nullable 필요 | |

**User's choice:** 표준 (kakao_id + 닉네임 + 프로필사진 URL)

| Option | Description | Selected |
|--------|-------------|----------|
| 매 로그인시 갱신 | 로그인 응답에 이미 포함된 값으로 갱신 | ✓ |
| 최초 가입 시만 저장(고정) | | |

**User's choice:** 매 로그인시 갱신

| Option | Description | Selected |
|--------|-------------|----------|
| 허용 | 이메일 선택 동의 거부해도 로그인 가능 | ✓ |
| 차단 (이메일 필수) | 카카오 심사에서 필수 동의 항목으로 승인 필요 | |

**User's choice:** 허용

**Notes:** kakao_id UNIQUE 제약은 선택지가 하나뿐이라 질문 없이 적용(중복 계정 방지).

---

## 플레이스홀더 사용자 전환

**Notes:** 논의 전 확인한 사실 — Phase 9의 플레이스홀더 로우는 실데이터가 전혀 없는
테스트/스캐폴딩 fixture(클라이언트-서버 동기화가 아직 없어 실사용 데이터가 쌓일 경로
자체가 없었음). 그래서 "데이터 마이그레이션" 문제가 아니라 "새 스키마와 fixture의 공존"
문제로 재구성해 질문함.

| Option | Description | Selected |
|--------|-------------|----------|
| 그대로 두고 테스트 전용으로 유지 | 신규 카카오 로그인은 새 로우 생성, 기존 테스트는 fixture 계속 참조 | ✓ |
| Phase 10에서 삭제하고 테스트 재작성 | 더 깔끔하지만 기존 테스트 전부 수정 필요 | |

**User's choice:** 그대로 두고 테스트 전용으로 유지

| Option | Description | Selected |
|--------|-------------|----------|
| NULL 허용 | 플레이스홀더는 카카오 데이터 없음을 NULL로 표현 | ✓ |
| 더미 값 채우기 | 인위적 구분값 삽입 | |

**User's choice:** NULL 허용

| Option | Description | Selected |
|--------|-------------|----------|
| 문제없음, 그대로 둠 | 1인 프로젝트, 실사용은 새 계정 하나뿐 | ✓ |
| 로그인 후 수동 정리 | 창업자가 직접 확인 후 삭제 | |

**User's choice:** 문제없음, 그대로 둠

---

## 클라이언트 로그인 트리거 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 카카오 공식 네이티브 SDK | 카카오톡 전환/웹뷰 폴백을 SDK가 자동 처리, EAS Dev Client 이미 사용 중이라 제약 없음 | ✓ |
| expo-auth-session 기반 순수 웹 OAuth | SDK 의존성 없음, 항상 인앱 브라우저 | |

**User's choice:** 카카오 공식 네이티브 SDK

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드가 처리 | 클라이언트는 인가 코드+code_verifier만 전달, 카카오 액세스 토큰 미노출 | ✓ |
| 클라이언트가 직접 교환 | 카카오 액세스 토큰이 클라이언트에 노출됨 | |

**User's choice:** 백엔드가 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 에러 메시지 + 재시도 버튼 | 기존 체크인 저장 실패 UX와 일관 | ✓ |
| 조용히 이전 화면으로 복귀 | | |

**User's choice:** 에러 메시지 + 재시도 버튼

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드 검증용으로만 존재 | PROJECT.md "1단계엔 인증 개념 없음" 원칙 유지 | ✓ |
| 지금 앱에 로그인 화면 추가 | 1단계 UI에 새 진입점 추가 | |

**User's choice:** 백엔드 검증용으로만 존재

---

## Claude's Discretion

- 로그인 검증 메커니즘의 정확한 형태(테스트용 최소 화면 vs 순수 백엔드 통합 테스트 vs 둘 다)
- `backend/` 패키지 구조 내부 클래스 분할(컨트롤러/서비스/DTO 경계)
- 카카오 SDK의 정확한 버전/네이티브 설정(Config Plugin 여부 등)
- V4 마이그레이션의 정확한 컬럼 타입/길이

## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음. 로그아웃/연결끊기, 계정 탈퇴, 1단계 UI 통합
후보들은 논의 중 스코프 밖으로 확인되었을 뿐 새 capability로 제안된 것은 아니었음.
