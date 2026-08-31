---
phase: 3
slug: check-in-core-loop
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + `jest-expo/ios` 프리셋 |
| **Config file** | `jest.config.js` (루트) |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/<file>.test.ts` |
| **Full suite command** | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run 해당 태스크가 건드린 `src/checkin/*.test.ts` 또는 `src/db/migrations.test.ts` 개별 실행
- **After every plan wave:** Run `npm test` (전체 스위트)
- **Before `/gsd:verify-work`:** 전체 스위트 green + manual-only 항목(비행기모드 재시작, 실기기 확인 핀 드래그, EAS Dev Client 재빌드 설치 확인) 수동 확인 필요
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-07-T1 | 03-07 | 3 | REQ-checkin-core | — | 5초 타임아웃 레이스가 GPS 성공/타임아웃/OS캐시 3가지 분기를 올바르게 나눔 | unit | `npx jest src/checkin/location.test.ts` | ✅ | ⬜ pending |
| 03-04-T3 | 03-04 | 2 | REQ-checkin-core | V5 | `checkins` insert 함수가 올바른 컬럼으로 row를 씀 (파라미터 바인딩 사용) | unit | `npx jest src/checkin/checkinRepo.test.ts` | ✅ | ⬜ pending |
| 03-04-T3 | 03-04 | 2 | REQ-checkin-write-failure-ui | — | 1회 자동 재시도 후 실패 시 에러 상태 반환, 수동 재시도 시 같은 함수 재호출로 성공 가능(insert 성공 후에만 draft 삭제) | unit | `npx jest src/checkin/checkinRepo.test.ts` | ✅ | ⬜ pending |
| 03-04-T2 | 03-04 | 2 | REQ-checkin-confirm-pin | — | `drafts` 테이블 CRUD(upsert/delete/조회) + 날짜 경계 만료 판정 | unit | `npx jest src/checkin/draftRepo.test.ts` | ✅ | ⬜ pending |
| 03-03-T1/T2 | 03-03 | 1 | REQ-checkin-confirm-pin | — | `migrateDbIfNeeded`가 `drafts` 테이블을 생성하고 `DATABASE_VERSION`을 2로 올리며 기존 데이터 보존 | unit | `npx jest src/db/migrations.test.ts` | ✅ (기존 파일 확장) | ⬜ pending |
| 03-07-T2 | 03-07 | 3 | REQ-location-denied-flow | — | 3단계 자체 폴백 체인(최근 checkin → 지도 마지막 좌표 → D-07 하드코딩 기본값)이 순서대로 시도되고 `location_source` 5값이 올바르게 매핑됨 | unit | `npx jest src/checkin/location.test.ts` | ✅ | ⬜ pending |
| 03-05-T1/T2 | 03-05 | 2 | REQ-location-denied-flow | — | 위치 권한 배너 표시/해제 판정 + `AppState` 포그라운드 재확인, Phase 3가 `requestForegroundPermissionsAsync()` 소유 | unit | `npx jest src/checkin/permissions.test.ts` | ✅ | ⬜ pending |
| 03-06-T1/T2 | 03-06 | 2 | REQ-checkin-core (사진) | Tampering | 사진 파일명은 항상 `Crypto.randomUUID()` 기반, picker의 원본 uri/파일명을 목적지 경로에 그대로 쓰지 않음, `documentDirectory`에 저장 | unit | `npx jest src/checkin/photo.test.ts` | ✅ | ⬜ pending |
| 03-02-T1 | 03-02 | 1 | REQ-location-denied-flow | — | D-07 폴백 좌표가 `checkpoint:decision`으로 창업자 확정값을 받고, `lat:0`/`lng:0` 잔존 시 자동 실패 | unit | `npx jest src/checkin/fallbackLocation.test.ts` | ✅ | ⬜ pending (blocking checkpoint) |
| 03-08-T1~T3 | 03-08 | 4 | REQ-checkin-write-failure-ui | — | 체크인 상태 머신(CAPTURING→CONFIRM→SAVING→SAVED/SAVE_FAILED)에서 메모/사진은 SAVED에서만 마운트(disabled/pointerEvents 미사용, 미마운트로 차단 구현) | unit | `npx jest src/checkin/checkinReducer.test.ts` | ✅ | ⬜ pending |
| 03-09-T1/T2 | 03-09 | 5 | REQ-checkin-confirm-pin | — | MapView + 확인 핀 드래그 배선, `customMapStyle`/`PROVIDER_GOOGLE`/mapLand·mapRoad·mapWater 토큰 미사용 회귀 가드 | unit | `npx jest src/checkin/checkin-wiring.test.ts` | ✅ | ⬜ pending |
| 03-10-T1~T3 | 03-10 | 6 | REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin | — | 저장 커밋 + 메모/사진 저장 + 드래프트 복구 + 미저장 이탈 Alert | unit | `npx jest src/checkin/checkinFlow.test.ts` | ✅ | ⬜ pending |
| E2E (manual) | 03-11 | 7 | 전체 | — | 비행기모드에서 체크인 후 앱 재시작해도 기록 유지(product-design.md T3 Verify 기준), 실기기 확인 핀 드래그, EAS Dev Client 재빌드 | manual-only — 실기기 필요, CI 자동화 불가 | — | manual | ⬜ pending (blocking checkpoint) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs (`03-XX-TN`) reference the task number within each PLAN.md's `<tasks>` block. Filled in after gsd-plan-checker verified all 11 plans (`## VERIFICATION PASSED`, 2026-08-27) — File Exists column reflects each plan's `<automated>` command target, not yet executed (execution happens in `/gsd:execute-phase`).*

---

## Wave 0 Requirements

All Wave 0 gaps are now assigned to concrete Wave 1 plans (03-01/03-02/03-03) rather than left open:

- [x] `src/checkin/testing/fakeLocation.ts` — `notifications/testing/fakeNotifications.ts` 패턴 복제, `getCurrentPositionAsync`/`getLastKnownPositionAsync` 더블 → 03-01
- [x] `src/checkin/testing/fakeImagePicker.ts` — `launchCameraAsync`/`launchImageLibraryAsync` 더블 → 03-01
- [x] `src/checkin/config.ts` + `deps.ts` — DI 골격 (Phase 2 notifications 패턴 복제) → 03-01
- [x] `src/db/migrations.test.ts`에 `drafts` 테이블 컬럼/제약 검증 테스트 추가 (기존 파일 확장, 새 파일 아님) → 03-03
- [x] 프레임워크 설치 불필요 — Jest/`jest-expo`/`node:sqlite` 어댑터 전부 Phase 1에서 이미 구축됨
- [x] 네이티브 모듈 설치(`expo-location`, `expo-image-picker`, `expo-file-system`, `react-native-maps`, `expo-crypto`) + 신규 EAS Dev Client 빌드 필요 — Wave 0에서 선행 → 03-01 (설치), 03-11 (재빌드+실기기 설치 확인)

*Wave 0 also carries the native module installs and EAS Dev Client rebuild called out in RESEARCH.md, since no phase task can run on-device without them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 비행기모드 체크인 후 앱 재시작 시 기록 유지 | REQ-checkin-core | 실기기/네트워크 단절 상태 필요, CI 자동화 불가 | 실기기에서 비행기모드 켜고 체크인 완료 → 앱 강제종료 → 재실행 → 체크인 기록 존재 확인 |
| 확인 핀 드래그 vs 지도 팬 제스처 우선순위 | REQ-checkin-confirm-pin | react-native-maps의 실제 터치 동작은 시뮬레이터/에뮬레이터에서 신뢰할 수 없음, Android 알려진 버그(react-native-maps#3777) 존재 | 실기기(iOS+Android)에서 확인 핀을 드래그해 지도가 함께 팬되지 않는지, 드래그 종료 후 터치가 계속 반응하는지 확인 |
| EAS Dev Client 재빌드 설치 및 신규 네이티브 모듈 정상 로드 | 전체 | 신규 네이티브 모듈은 JS 번들 업데이트만으로 반영되지 않음 | Wave 0 완료 후 EAS Dev Client를 실기기에 재설치하고 앱이 크래시 없이 부팅되는지 확인 |
| 카메라/사진 라이브러리 권한 거부 후 액션시트 재진입 | REQ-checkin-core (사진) | OS 권한 다이얼로그는 자동화 테스트에서 신뢰성 있게 트리거할 수 없음 | 실기기에서 카메라 권한 거부 → 액션시트 재오픈 시 적절한 안내/설정 딥링크 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

Verified by `gsd-plan-checker` against all 11 PLAN.md files (`## VERIFICATION PASSED`, 2026-08-27) — checks 8a–8d confirmed passing directly from plan inspection.

**Approval:** approved 2026-08-27
