---
phase: 10-authentication-kakao-oauth2-pkce
plan: 01
subsystem: auth
tags: [kakao-oauth, env-contract, package-legitimacy, expo, jwt]

# Dependency graph
requires: []
provides:
  - "카카오 개발자 콘솔 앱 등록 완료(iOS 번들 ID `com.jaeseungchoun.footlog`, 카카오 로그인 활성화, 이메일 동의항목 미설정)"
  - "로컬 `.env`(git-ignored)에 KAKAO_NATIVE_APP_KEY / JWT_SECRET / EXPO_PUBLIC_API_BASE_URL 유효값 확보"
affects: [10-02, 10-03, 10-04, 10-05, 10-06, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/phases/10-authentication-kakao-oauth2-pkce/10-VALIDATION.md

key-decisions:
  - "카카오 콘솔에서 REST API 키/client_secret은 발급하지 않음 — D-14 AMENDMENT로 백엔드가 카카오 토큰 교환을 하지 않으므로 네이티브 앱 키만 필요"

patterns-established: []

requirements-completed: [REQ-auth-kakao-oauth]

duration: TBD
completed: 2026-09-03
---

# Phase 10 Plan 01: 카카오 개발자 콘솔 등록 + 패키지 정통성 게이트 + 환경변수 계약 Summary

**(작성 중 — Task 1 완료 기록. Task 2/3 완료 후 이 SUMMARY가 갱신된다)**

## Task 1 — 카카오 개발자 콘솔 앱 등록 (완료, 창업자 직접 수행)

창업자가 developers.kakao.com에 카카오 계정으로 로그인해 다음을 완료했다:

- 앱 이름 `FootLog` 등록
- iOS 플랫폼 등록 — 번들 ID `com.jaeseungchoun.footlog` (`app.json`의 `expo.ios.bundleIdentifier`와 정확히 일치)
- 카카오 로그인 활성화 설정 ON
- 동의항목: 닉네임(동의) / 프로필 사진(선택 동의) 설정, **카카오계정(이메일)은 설정하지 않음** — D-05(이메일 미저장)/D-07(미동의자도 로그인 허용)에 따라 이 앱은 이메일을 애초에 요청하지 않는다
- REST API 키 / client_secret은 발급하지 않음 — D-14 AMENDMENT로 백엔드가 카카오 `POST /oauth/token` 교환을 하지 않으므로 불필요

저장소 루트의 로컬 `.env`(git-ignored, 커밋 대상 아님)에 3개 환경변수가 유효한 형태로 존재함을 자동 검증했다(**값 자체는 아래에도, 어떤 문서에도 인용하지 않음** — 존재 여부와 길이만 확인):

```
test -f .env                                          → 성공
grep -cE '^KAKAO_NATIVE_APP_KEY=.+$' .env              → 1
grep -E '^JWT_SECRET=' .env | cut -d= -f2- | wc -c     → 45 (≥33 요구치 충족)
grep -cE '^EXPO_PUBLIC_API_BASE_URL=.+$' .env          → 1
git check-ignore -q .env                               → 성공(정상적으로 무시됨)
```

`JWT_SECRET`이 32바이트 이상이므로 10-03의 `NimbusJwtEncoder`/`NimbusJwtDecoder` 기동 실패(10-RESEARCH.md Pitfall 2) 위험이 없다.

10-VALIDATION.md의 Manual-Only Verifications 첫 행을 완료 상태로 갱신하고, AMENDMENT로 불필요해진 REST API 키/client_secret 언급을 실제 수행 내용(네이티브 앱 키만 발급)에 맞게 정정했다.

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*
