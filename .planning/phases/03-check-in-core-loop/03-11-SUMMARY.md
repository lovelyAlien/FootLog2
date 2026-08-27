---
phase: 03-check-in-core-loop
plan: 11
subsystem: infra
tags: [eas-build, ios, dev-client, react-native-maps, expo-location, expo-image-picker, manual-verification]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: 03-10까지 완성된 체크인 코어 루프 전체(위치 캡처, 확인 핀 드래그, SQLite 저장, 드래프트 복구, 사진/메모)
provides:
  - "5개 네이티브 모듈(expo-location/expo-image-picker/expo-file-system/expo-crypto/react-native-maps)이 링크된 새 EAS development Dev Client 빌드 (FINISHED)"
  - "실기기 검증 5개 항목(부팅, 위치 권한 문구, 확인 핀 드래그 vs 지도 팬, 비행기모드 저장+재시작 생존, 드래프트 복구+사진/메모 차단) 전부 통과 확인"
  - "03-RESEARCH.md Assumptions Log A4(react-native-maps#3777 iOS 재현 여부) 해소 판정 — iOS 미재현"
affects: [phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/03-check-in-core-loop/03-11-SUMMARY.md
  modified: []

key-decisions:
  - "expo-doctor가 보고한 12개 패키지 패치 버전 드리프트는 Phase 3 변경과 무관한 기존(Phase 1/2) 상태로 판단해 빌드를 막지 않고 진행 — npm test/tsc --noEmit이라는 plan의 실제 blocking gate만 충족하면 됨"
  - "창업자의 '전부 통과' 응답을 있는 그대로 5개 항목 전부 통과로 기록 — 세부 관찰 코멘트가 없었다는 점도 그대로 남김(창업자를 대신해 추정하지 않음)"

patterns-established: []

requirements-completed: [REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-location-denied-flow]

# Metrics
duration: 약 15분 (자동화 구간 기준: npm install/test/tsc + EAS 클라우드 빌드 대기 약 5.5분; 창업자 실기기 테스트 소요 시간은 별도)
completed: 2026-08-27
---

# Phase 3 Plan 11: EAS Dev Client 재빌드 + 실기기 수동 검증 Summary

**5개 네이티브 모듈(expo-location/expo-image-picker/expo-file-system/expo-crypto/react-native-maps)을 링크한 새 EAS iOS development 빌드를 발급하고, 창업자 iPhone에서 체크인 코어 루프 실기기 검증 5개 항목 전부 통과를 확인했다 — react-native-maps#3777 드래그 후 버튼 무반응 이슈는 iOS에서 미재현으로 판정.**

## Performance

- **Duration:** 약 15분 (오케스트레이터 진행 기준, 자동화 구간만. 창업자 실기기 테스트 대기 시간 제외)
- **Started:** 2026-08-27T12:00:00Z (추정, npm install 시작 시점)
- **Completed:** 2026-08-27T16:08:27Z
- **Tasks:** 2/2 완료 (Task 1 자동 실행, Task 2 창업자 실기기 검증)
- **Files modified:** 0 (이 SUMMARY.md만 생성 — 코드 변경 없음)

## Accomplishments
- `expo-location`/`expo-image-picker`/`expo-file-system`/`expo-crypto`/`react-native-maps` 5개 네이티브 모듈이 링크된 새 iOS development Dev Client 빌드를 EAS에서 발급 (`status: FINISHED`, build id `18d9a7f9-bd3a-4580-945d-8650d7d3992a`)
- 빌드 로그에 Google Maps API 키 관련 에러 없음 확인 — `react-native-maps`가 Apple Maps 기본 provider로 정상 빌드됨
- 창업자 iPhone에 설치 후 부팅, 위치 권한 문구, 확인 핀 드래그, 비행기모드 저장+재시작 생존, 드래프트 복구+사진/메모 차단 5개 항목 전부 통과 확인
- 03-RESEARCH.md Assumptions Log A4(`react-native-maps#3777` Android 커뮤니티 이슈의 iOS 재현 여부)를 **해소(iOS 미재현)**로 확정

## Task Commits

1. **Task 1: EAS Dev Client 재빌드** — 빌드 자체는 산출물(코드 커밋 아님, 리포지토리 파일 변경 없음)
2. **Task 2: 창업자 iPhone 실기기 수동 검증** — 코드 변경 없음, 이 SUMMARY.md가 유일한 산출물

**Plan metadata:** (이 커밋)

## Files Created/Modified
- `.planning/phases/03-check-in-core-loop/03-11-SUMMARY.md` — 이 문서 (신규 생성)

## Decisions Made

- **expo-doctor 패치 버전 경고를 빌드 blocking 사유로 취급하지 않음**: `npx expo-doctor` 실행 결과 21개 체크 중 20개 통과, 1개(패키지 버전 정합성) 실패 — `@expo/ui`, `expo`, `expo-constants` 등 12개 패키지가 SDK 57 내에서 마이너 패치 버전만 뒤처져 있었음(예: `expo@57.0.16`→`57.0.17`). 이 드리프트는 Phase 1/2에서 이미 설치된 기존 상태이고 Phase 3 작업 범위(SCOPE BOUNDARY) 밖이며, plan의 실제 acceptance criteria는 `npm test`/`npx tsc --noEmit`만 명시하므로 이 둘이 green임을 확인한 뒤 빌드를 진행함. 별도 `npm install`로 패치 업그레이드를 시도하지 않음(Rule 3 exclusion — 패키지 설치는 자동수정 대상 아님, 또한 애초에 blocking 문제가 아니었음).
- **창업자 응답을 있는 그대로 기록**: 창업자가 "전부 통과"로만 응답하고 세부 관찰 코멘트를 추가로 주지 않음 — 이를 5개 항목 각각의 개별 관찰 내용을 추정해서 채워 넣지 않고, 응답 그대로("전부 통과", 세부 코멘트 없음)를 기록함.

## Deviations from Plan

None — plan executed exactly as written. (expo-doctor 패치 버전 경고는 위 Decisions Made에 기록된 판단 사항이며, 코드나 설정을 수정하지 않았으므로 deviation이 아님.)

## Issues Encountered

None.

## User Setup Required

None - 외부 서비스 설정 불필요. (EAS 자격증명은 02-08에서 이미 동기화 완료된 상태를 그대로 재사용, 새 자격증명 생성 없음.)

## Manual Verification Results (Task 2)

Task 1이 발급한 EAS 빌드(`https://expo.dev/accounts/jaeseungchoun/projects/footlog/builds/18d9a7f9-bd3a-4580-945d-8650d7d3992a`)를 창업자 iPhone에 설치한 뒤 확인한 결과:

| # | 항목 | 결과 |
|---|------|------|
| 1 | 부팅 + 네이티브 모듈 로드 (크래시 없이 지도 + 체크인 버튼 표시) | **통과** |
| 2 | 위치 권한 프롬프트 한국어 문구 + 확인 핀 드롭 | **통과** |
| 3 | 확인 핀 드래그 vs 지도 팬, 드래그 직후 "확인" 버튼 반응 (03-RESEARCH.md A4 검증) | **통과** — 드래그 직후 "확인" 버튼 정상 반응 |
| 4 | 비행기모드 체크인 저장 + 앱 강제종료/재실행 생존 | **통과** |
| 5 | 저장 전 드래프트 복구 + 복구 화면에서 사진/메모 입력 영역 미노출 | **통과** |

**A4 가정 판정:** `react-native-maps#3777`(Android 커뮤니티에 보고된 "마커 드래그 후 버튼 무반응" 이슈)은 **해소(iOS 미재현)**로 확정. 창업자가 항목 3에서 드래그 직후 곧바로 "확인" 버튼을 탭했을 때 정상 반응했음을 확인했다.

세부 관찰 코멘트: 창업자가 "전부 통과"로만 응답했으며, 화면이 스펙과 다르게 보이는 부분(색/문구/간격)에 대한 별도 코멘트는 없었음.

## Next Phase Readiness

- **완료된 것:** Phase 3(체크인 코어 루프)의 4개 요구사항(REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-location-denied-flow)이 실기기 검증까지 포함해 전부 충족됨. 03-VALIDATION.md의 Manual-Only Verifications 4개 항목이 03-11의 5개 실기기 검증 항목으로 커버됨.
- **남은 것:** 없음 — Phase 3는 이 plan으로 완료. Phase 4(Today view: 지도+바텀시트, 사진 리사이징/저장, 맥락적 온보딩, 이동 궤적선)로 진행 가능.
- **참고:** expo-doctor가 보고한 12개 패키지 패치 버전 드리프트는 blocking은 아니었으나, 향후 편한 시점에 `npx expo install --check`로 정리하는 것을 권장(TODOS.md 후보로 남길 수 있으나 이 plan 범위 밖이라 자동 기록하지 않음).

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-check-in-core-loop/03-11-SUMMARY.md`
- FOUND: commit `4839877` (docs(03-11): EAS Dev Client 재빌드 + 실기기 검증 결과 기록)
- No unexpected file deletions in the commit
