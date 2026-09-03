---
title: Spring Security 필터 체인 추가 후 unmapped 엔드포인트가 404 대신 401을 반환하던 버그
date: 2026-09-03
category: runtime-errors
module: backend-security-filter-chain
problem_type: runtime_error
component: authentication
symptoms:
  - "Phase 9의 회귀 테스트(HealthCheckSmokeTest, StagingProfileBootTest)가 GET /actuator/env, GET /actuator/beans에 대해 404를 기대했는데, Phase 10에서 Spring Security 필터 체인을 추가한 뒤 401(Bearer 챌린지)로 바뀌어 실패함"
  - "Phase 9 단독으로는 재현되지 않고, SecurityConfig의 authorizeHttpRequests에 anyRequest().authenticated()가 들어가는 순간부터만 재현됨 — 노출 목록(management.endpoints.web.exposure.include)이나 컨트롤러 코드는 전혀 바뀌지 않았는데도 기존 회귀 테스트가 깨짐"
root_cause: config_error
resolution_type: config_change
severity: medium
related_components: [SecurityConfig, DispatcherServlet, actuator]
tags: [spring-security, error-dispatch, permitall, actuator, 404-vs-401, filter-chain, exceptiontranslationfilter]
---

# Spring Security 필터 체인 추가 후 unmapped 엔드포인트가 404 대신 401을 반환하던 버그

## Problem

Phase 9는 `management.endpoints.web.exposure.include: health`로 `/actuator/health`만 노출하고 나머지(`/actuator/env`, `/actuator/beans` 등)는 매핑 자체를 없애 접근 시 404가 나오는 것을, "노출 목록이 유일한 접근 제어"임을 보장하는 회귀 테스트(`HealthCheckSmokeTest`, `StagingProfileBootTest`)로 고정해뒀다. Phase 10(10-03)에서 `SecurityConfig`에 `anyRequest().authenticated()`를 포함한 stateless JWT 필터 체인을 추가하자, 컨트롤러/노출 설정을 전혀 건드리지 않았는데도 이 두 테스트가 401을 받고 깨졌다.

## Symptoms

- `GET /actuator/env`, `GET /actuator/beans`가 (매핑되지 않은 엔드포인트이므로 기대하던) 404 대신 401 + `WWW-Authenticate: Bearer` 헤더를 반환
- Phase 9가 작성한 회귀 테스트 자체는 수정하지 않았는데, Phase 10의 Security 설정 추가만으로 실패로 전환됨

## What Didn't Work

`SecurityConfig`에 `/actuator/**`를 `permitAll()`로 등록하는 것만으로는 부족했다 — `/actuator/env`, `/actuator/beans`는 애초에 매핑되지 않은 경로라 `/actuator/**` 패턴 매칭과 별개로 여전히 401이 재현됐다. 원인이 컨트롤러 매핑 쪽이 아니라 **에러 처리 경로** 자체에 있었기 때문이다.

## Solution

`/error`를 `permitAll()` 목록에 명시적으로 추가한다.

```kotlin
// backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt:45
.requestMatchers("/actuator/**", "/api/auth/**", "/error").permitAll()
.anyRequest().authenticated()
```

## Why This Works

매핑되지 않은 경로(`/actuator/env` 등)에 접근하면 `DispatcherServlet`이 404 응답을 만들기 위해 서블릿 컨테이너 내부에서 `/error`로 **ERROR 디스패치**를 한다. Spring Security는 기본적으로 이 내부 디스패치도 원본 요청과 동일하게 필터 체인에 다시 통과시킨다 — `/error`가 `permitAll` 목록에 없으면 `anyRequest().authenticated()`에 걸려 `ExceptionTranslationFilter`가 (원래 만들어지고 있던 404 응답 대신) 401을 만들어 덮어써버린다.

즉 겉보기엔 "인증되지 않은 요청이 거부됐다"처럼 보이지만, 실제로는 **에러 응답을 만드는 재진입 요청 자체가 인증을 요구받아 원래 상태 코드를 잃어버린 것**이다. `/error`를 `permitAll`로 둬도 별도 정보가 노출되지는 않는다 — 원래 만들어지고 있던 상태 코드/에러 메시지를 그대로 통과시킬 뿐이다.

## Prevention

- Spring Security 필터 체인을 **기존에 매핑 부재로 404를 보장하던 서비스**에 추가할 때는, `/error`를 `permitAll` 목록에 포함했는지 항상 확인한다 — `/actuator/**` 같은 경로 패턴을 아무리 정확히 열어도 매핑 자체가 없는 요청에는 적용되지 않는다.
- "노출 목록이 유일한 접근 제어"류 계약(예: T-9-02)을 지키는 회귀 테스트가 있다면, Security 설정을 바꿀 때마다 그 테스트를 반드시 재실행해 404 단언이 401로 바뀌지 않았는지 확인한다 — 이 버그는 정확히 그 회귀 테스트 덕분에 머지 전에 잡혔다.
- 테스트 코드에는 왜 404를 기대하는지(T-9-02 같은 위협 ID) 주석으로 남겨서, 나중에 누군가 "이 테스트가 왜 401이 아니라 404를 기대하지?"라고 헷갈리지 않게 한다.

## Related Issues

- Phase 9 회귀 테스트: `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt:46`, `:54` (T-9-02)
- Phase 10 staging 부팅 테스트: `backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt:92`
- `.planning/phases/10-authentication-kakao-oauth2-pkce/10-03-SUMMARY.md` — 이 버그를 포함한 10-03 실행 전체 요약
