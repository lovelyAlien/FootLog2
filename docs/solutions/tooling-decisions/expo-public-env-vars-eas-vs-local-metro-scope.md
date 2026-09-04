---
title: EAS 환경변수와 로컬 .env는 서로 다른 빌드 경로에 적용된다 — development 프로필 Dev Client는 로컬 .env를 따른다
date: 2026-09-04
category: tooling-decisions
module: auth-eas-build
problem_type: tooling_decision
component: development_workflow
applies_when:
  - "EXPO_PUBLIC_ 접두사 환경변수를 쓰는 Expo 프로젝트에서 developmentClient: true인 EAS 빌드 프로필로 실기기 검증을 준비할 때"
  - "eas build가 EXPO_NO_DOTENV 때문에 로컬 .env를 못 읽어 eas env:create로 EAS 프로젝트 환경변수를 등록한 뒤에도, 실행 중인 앱이 여전히 옛 값을 쓰는 것처럼 보일 때"
  - "개발 중인 Mac의 LAN IP가 Wi-Fi 재연결 등으로 바뀌어, 실기기에 이미 설치된 Dev Client가 이전 IP로 백엔드를 호출하다 네트워크 에러를 낼 때"
severity: medium
related_components: [app.config.js, eas.json, metro]
tags: [expo, eas-build, expo-public, dotenv, development-client, metro, env-vars]
---

# EAS 환경변수와 로컬 .env는 서로 다른 빌드 경로에 적용된다 — development 프로필 Dev Client는 로컬 .env를 따른다

## Context

Phase 10(카카오 OAuth) 실기기 검증에서, `EXPO_PUBLIC_API_BASE_URL`(백엔드 베이스 URL)을 EAS 프로젝트 환경변수로 등록했음에도 실기기에서 로그인 시도가 "네트워크 연결을 확인한 뒤 다시 시도해주세요"로 실패했다. 원인을 추적한 결과, `developmentClient: true`인 EAS 빌드는 **네이티브 셸(바이너리)만** EAS 클라우드에서 만들어질 뿐, 실행 중 JS 번들은 로컬 Metro 서버가 실시간으로 서빙한다는 점을 놓쳤다 — `EXPO_PUBLIC_` 변수의 인라인은 이 Metro 번들링 시점에 일어나며, 그 시점에 참조되는 값은 **로컬 `.env`**다. EAS 프로젝트 환경변수(`eas env:create`로 등록한 값)는 **EAS 클라우드 빌드 프로세스 자체**(네이티브 컴파일, `app.config.js` 평가 등)에만 주입되고, Metro가 서빙하는 JS 번들 인라인에는 관여하지 않는다.

추가로, EAS 클라우드 빌드는 애초에 로컬 `.env` 파일을 아예 읽지 않는다(`expo:env Skipping .env files because EXPO_NO_DOTENV is defined` — EAS CLI가 의도적으로 설정) — 빌드 서버에는 로컬 파일이 존재하지 않으므로 당연한 동작이다. 그래서 `app.config.js`가 `process.env.KAKAO_NATIVE_APP_KEY` 부재로 throw하는 문제를 `eas env:create`로 해결했는데, 그 해결책이 **Metro가 서빙하는 런타임 값 문제는 전혀 건드리지 않는다**는 점이 함정이었다.

## Guidance

두 값의 출처를 구분해서 관리한다:

| 값이 쓰이는 곳 | 출처 |
|---|---|
| `app.config.js`(네이티브 빌드 시점 평가 — 플러그인 props, 앱 키 등) | EAS 클라우드 빌드: **EAS 프로젝트 환경변수**(`eas env:create`). 로컬 빌드(`expo prebuild`, `expo run:ios`): **로컬 `.env`**(Expo CLI가 자동 로드) |
| `EXPO_PUBLIC_*`로 JS 코드에서 읽는 값(런타임 번들 인라인) | **JS 번들을 실제로 만드는 프로세스의 환경**. `developmentClient: true` 빌드에서 실행 중인 Metro라면 **로컬 `.env`**. 프로덕션/스탠드얼론 빌드(번들이 네이티브 바이너리에 포함)라면 EAS 클라우드 빌드 시점의 환경(EAS 프로젝트 환경변수) |

즉 **"development 프로필로 만든 Dev Client는 실행 중에도 로컬 `.env`를 계속 참조한다"**가 핵심이다 — 한 번 설치했다고 끝이 아니라, 실기기 테스트 세션 내내 Mac의 로컬 `.env`가 최신 상태여야 하고, 특히 LAN IP처럼 세션마다 바뀔 수 있는 값은 매번 확인해야 한다.

## Why This Matters

- EAS 환경변수를 등록했는데도 문제가 재현되면, "등록이 잘못됐나?"보다 먼저 **"이 값이 실제로 어느 프로세스에서 평가되는가"**를 확인해야 시간을 아낀다. development 프로필은 클라우드 빌드 성공 여부와 실기기 런타임 동작이 서로 다른 값에 의존할 수 있다.
- LAN IP 기반 `EXPO_PUBLIC_API_BASE_URL`은 Mac의 네트워크 상태가 바뀔 때마다 로컬 `.env`를 갱신하고 Metro를 재시작해야 실기기에 반영된다(앱을 완전히 재실행해 새 번들을 받아야 함 — Fast Refresh만으로는 `process.env` 인라인 값이 갱신되지 않을 수 있다).

## When to Apply

- `developmentClient: true` EAS 빌드 프로필로 실기기/시뮬레이터 검증을 준비할 때
- `EXPO_PUBLIC_` 변수 값을 바꿨는데 실기기에서 반영이 안 되는 것처럼 보일 때 — EAS 환경변수만 확인하지 말고 로컬 `.env` + Metro 재시작 여부를 먼저 확인
- 여러 세션에 걸쳐 같은 Dev Client 빌드를 재사용하며 LAN IP가 바뀔 가능성이 있는 환경(Wi-Fi 재연결, 다른 네트워크 이동)에서 검증할 때

## Examples

이번 phase에서의 실제 순서:

1. `eas build --profile development` 최초 실패 — `app.config.js`가 `KAKAO_NATIVE_APP_KEY` 부재로 throw (`EXPO_NO_DOTENV`로 `.env` 미로드)
2. `eas env:create development --name KAKAO_NATIVE_APP_KEY ...` + `--name EXPO_PUBLIC_API_BASE_URL ...` 등록 → 빌드 성공, 실기기 설치 완료
3. 실기기 로그인 시도 → network 에러. **1~2단계는 클라우드 빌드 성공에는 필요했지만, 이 네트워크 에러의 원인이 아니었다** — 원인은 로컬 `.env`의 `EXPO_PUBLIC_API_BASE_URL`이 여전히 옛 값(`localhost:8080`, 나중엔 바뀐 LAN IP)이었고, 그 값이 Metro가 서빙하는 번들에 그대로 들어가 있었다는 것
4. 로컬 `.env`를 현재 LAN IP로 갱신 → Metro 재시작 → 앱을 완전히 종료 후 재실행(새 번들 수신) → 정상 동작

## Related
- `.planning/phases/10-authentication-kakao-oauth2-pkce/10-07-SUMMARY.md` — 이 이슈가 발생하고 해결된 전체 맥락(Task 3)
- `.planning/phases/10-authentication-kakao-oauth2-pkce/10-01-SUMMARY.md` — `.env`/`.env.example` 계약이 처음 만들어진 지점
