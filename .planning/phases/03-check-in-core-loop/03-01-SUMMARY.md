---
phase: 03-check-in-core-loop
plan: 01
subsystem: infra
tags: [expo-location, expo-image-picker, expo-file-system, expo-crypto, react-native-maps, dependency-injection, jest]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    provides: "config.ts(타입 전용)/deps.ts(런타임 import 유일 지점)/testing/fake*.ts 3파일 분리 DI 패턴"
provides:
  - "expo-location/expo-image-picker/expo-file-system/expo-crypto/react-native-maps 5종 SDK 57 호환 설치"
  - "src/checkin/config.ts + deps.ts DI 골격(LocationDeps/ImagePickerDeps/CryptoDeps/PhotoStorageDeps)"
  - "src/checkin/testing/fakeLocation.ts, fakeImagePicker.ts, fakePhotoStorage.ts 인메모리 더블 3종"
  - "src/checkin/deps.ts만을 유일한 런타임 import 지점으로 강제하는 격리 회귀 가드"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: [expo-location@~57.0.14, expo-image-picker@~57.0.14, expo-file-system@~57.0.6, expo-crypto@~57.0.2, react-native-maps@1.27.2]
  patterns:
    - "config.ts(타입 전용 import) + deps.ts(런타임 import 유일 지점) + testing/fake*.ts(인메모리 더블) 3파일 분리 — Phase 2 알림 모듈 패턴을 checkin 모듈에 복제"
    - "expo-file-system 새 클래스 API(File/Paths)를 함수 포트 하나(PhotoStorageDeps.copyIntoDocumentDirectory)로 좁혀 테스트 더블 복잡도 최소화"

key-files:
  created:
    - src/checkin/config.ts
    - src/checkin/deps.ts
    - src/checkin/testing/fakeLocation.ts
    - src/checkin/testing/fakeImagePicker.ts
    - src/checkin/testing/fakePhotoStorage.ts
    - src/checkin/testing/fakeCheckinDeps.test.ts
    - src/checkin/__tests__/nativeDeps.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "react-native-maps는 npx expo install이 실제로 고른 1.27.2를 채택(RESEARCH.md 기대값 1.29.0과 다름) — plan 지시대로 npx expo install 결과를 우선"
  - "PhotoStorageDeps.copyIntoDocumentDirectory 반환 타입을 Promise<string>으로 구현(plan 원문은 string) — expo-file-system File.copy()가 비동기이므로 동기 시그니처는 실제로 구현 불가능한 타입 오류"

patterns-established:
  - "네이티브 SDK 타입은 config.ts에서 Pick<typeof SDK, ...>로 좁히고, deps.ts 한 곳에서만 런타임 import + default deps 조립 + 컴파일타임 정합성 단언(_accuracyAssertion)을 둔다"
  - "테스트 더블은 Deps 타입에서 Awaited<ReturnType<...>>로 SDK 타입을 유도하고, nominal enum(PermissionStatus) 캐스트는 buildPermissionsStatus 같은 단일 헬퍼 함수 안에서만 수행한다"
  - "디렉터리 스캔 기반 격리 회귀 가드(collectSourceFiles + stripComments)로 '런타임 import는 deps.ts 하나뿐'을 자동 강제"

requirements-completed: [REQ-checkin-core, REQ-checkin-confirm-pin, REQ-location-denied-flow]

# Metrics
duration: ~20min
completed: 2026-08-27
---

# Phase 3 Plan 01: 체크인 네이티브 모듈 설치 + DI 골격 Summary

**expo-location/expo-image-picker/expo-file-system/expo-crypto/react-native-maps 5종을 SDK 57 호환 버전으로 설치하고, Phase 2 알림 모듈의 config.ts/deps.ts/testing 3파일 분리 DI 패턴을 src/checkin/에 복제했다.**

## Performance

- **Duration:** ~20분 (research 문서 재확인 포함)
- **Completed:** 2026-08-27
- **Tasks:** 3 (Task 3은 TDD RED/GREEN 분리로 2개 커밋)
- **Files modified:** 9 (7 신규 + package.json/package-lock.json)

## Accomplishments

- 5개 네이티브 패키지(expo-location, expo-image-picker, expo-file-system, expo-crypto, react-native-maps) 설치, app.json 권한 문구/plugins 배열 무변경 확인
- `src/checkin/config.ts`(타입 전용 import만) + `src/checkin/deps.ts`(런타임 import 유일 지점) DI 골격 완성, `tsc --noEmit` 통과
- `fakeLocation.ts`/`fakeImagePicker.ts`/`fakePhotoStorage.ts` 3개 인메모리 더블을 TDD RED→GREEN으로 구현, 8개 behavior 테스트 green
- 디렉터리 스캔 기반 격리 회귀 가드 추가 — `src/checkin/` 하위에서 4개 네이티브 패키지를 런타임 import하는 파일이 `deps.ts` 하나뿐임을 자동 검증

## Task Commits

Each task was committed atomically:

1. **Task 1: 네이티브 모듈 5종 설치 + app.json 권한 문구 회귀 확인** - `ffbd6ff` (feat)
2. **Task 2: src/checkin/config.ts + deps.ts — DI 3파일 분리 골격** - `7d8f57c` (feat)
3. **Task 3: 테스트 더블 3종 + 런타임 import 격리 회귀 가드** - `242ff6c` (test, RED) → `8859df7` (feat, GREEN) → `8c7e238` (test, 격리 가드 추가)

_Note: Task 3은 tdd="true"라 RED/GREEN 분리 커밋 + 격리 가드 테스트 추가 커밋으로 총 3개 커밋._

## Files Created/Modified

- `package.json`, `package-lock.json` - 네이티브 패키지 5종 dependencies 추가
- `src/checkin/config.ts` - LocationDeps/ImagePickerDeps/CryptoDeps/PhotoStorageDeps 타입 + CAPTURE_TIMEOUT_MS/LAST_KNOWN_MAX_AGE_MS/DRAFT_ROW_ID/LOCATION_ACCURACY_BALANCED 상수
- `src/checkin/deps.ts` - 4개 네이티브 패키지 런타임 import 유일 지점, default deps 4종, accuracy 컴파일타임 단언
- `src/checkin/testing/fakeLocation.ts` - LocationDeps 인메모리 더블(권한/좌표/지연 제어)
- `src/checkin/testing/fakeImagePicker.ts` - ImagePickerDeps 인메모리 더블
- `src/checkin/testing/fakePhotoStorage.ts` - PhotoStorageDeps 인메모리 파일 복사 더블
- `src/checkin/testing/fakeCheckinDeps.test.ts` - 더블 3종 behavior 계약 테스트(8개)
- `src/checkin/__tests__/nativeDeps.test.ts` - package.json 설치 회귀 가드(2개) + 런타임 import 격리 가드(1개)

## Decisions Made

- `react-native-maps`는 `npx expo install`이 실제로 선택한 `1.27.2`를 채택했다. 03-RESEARCH.md는 npm 레지스트리 조회 시점(2026-08-27) 기준 `latest` dist-tag가 `1.29.0`이라고 기록했으나, `npx expo install`은 현재 프로젝트의 `react-native@0.86.2`/Expo SDK 57과의 실제 검증 조합을 계산해 `1.27.2`를 골랐다. Plan Task 1 지시("실제 설치 결과가 이 범위와 다르면 SUMMARY에 편차를 기록하되 npx expo install이 고른 값을 우선한다")를 그대로 따랐다.
- `PhotoStorageDeps.copyIntoDocumentDirectory`의 반환 타입을 plan 원문(`: string`)이 아니라 `Promise<string>`으로 구현했다. `expo-file-system`의 새 클래스 API(`File.copy()`)가 `Promise<void>`를 반환하는 비동기 메서드이므로, 이를 감싸는 `copyIntoDocumentDirectory`도 필연적으로 비동기이며 `Promise<string>`이 유일하게 타입이 맞는 시그니처다(동기 `string` 반환은 컴파일 자체가 불가능). Task 2 acceptance criteria(grep 기반 텍스트 매칭)에는 영향 없음 — Rule 1(버그 방지) 적용.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PhotoStorageDeps.copyIntoDocumentDirectory를 비동기 시그니처로 구현**
- **Found during:** Task 2 (config.ts 작성)
- **Issue:** Plan 원문이 `copyIntoDocumentDirectory(sourceUri: string, fileName: string): string`로 동기 반환 타입을 명시했으나, deps.ts 구현이 의존하는 `expo-file-system`의 `File.copy()`는 `Promise<void>`를 반환하는 비동기 API라 동기 시그니처로는 구현이 원천적으로 불가능하다.
- **Fix:** `PhotoStorageDeps.copyIntoDocumentDirectory`의 반환 타입을 `Promise<string>`으로 정의하고, `fakePhotoStorage.ts`/`deps.ts` 양쪽 모두 `async` 함수로 구현.
- **Files modified:** `src/checkin/config.ts`, `src/checkin/deps.ts`, `src/checkin/testing/fakePhotoStorage.ts`
- **Verification:** `npx tsc --noEmit` 통과, `fakeCheckinDeps.test.ts` Test 8 green
- **Committed in:** `7d8f57c`(config/deps), `8859df7`(fake 구현)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** 타입 정확성을 위한 필수 수정이며, plan이 정의한 acceptance criteria(grep 기반)에는 영향 없음. 스코프 확장 없음.

## Issues Encountered

없음 — 계획대로 순조롭게 진행됨. `react-native-maps` 버전 편차(1.29.0 → 1.27.2)는 오류가 아니라 plan이 사전에 허용한 "npx expo install 결과 우선" 케이스임(위 Decisions Made 참고).

## User Setup Required

None - 외부 서비스 설정 불필요. 단, 5개 패키지 모두 네이티브 모듈이므로 이후 EAS Dev Client 재빌드가 필요하다(03-RESEARCH.md에 이미 명시된 사항, 이 plan의 산출물 자체는 정적 코드/테스트만이라 재빌드 없이도 유닛 테스트는 통과함).

## Next Phase Readiness

- `src/checkin/config.ts` + `deps.ts` + `testing/fake*.ts` 골격이 갖춰져 있어, 이후 plan(위치 캡처 로직, 사진 캡처, drafts/checkins 리포지토리, 화면 배선)이 네이티브 모듈을 직접 import하지 않고 `LocationDeps`/`ImagePickerDeps`/`CryptoDeps`/`PhotoStorageDeps`를 주입받아 `@jest-environment node` 유닛 테스트로 검증 가능하다.
- `DRAFT_ROW_ID = 'draft'` 상수가 단일 출처(`config.ts`)에 이미 존재하므로, D-03/D-04 드래프트 계약을 구현하는 다음 plan(예: 03-03/03-04)이 이 값을 바로 재사용하면 된다.
- 블로커 없음.

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/checkin/config.ts
- FOUND: src/checkin/deps.ts
- FOUND: src/checkin/testing/fakeLocation.ts
- FOUND: src/checkin/testing/fakeImagePicker.ts
- FOUND: src/checkin/testing/fakePhotoStorage.ts
- FOUND: src/checkin/testing/fakeCheckinDeps.test.ts
- FOUND: src/checkin/__tests__/nativeDeps.test.ts
- FOUND commit: ffbd6ff (Task 1)
- FOUND commit: 7d8f57c (Task 2)
- FOUND commit: 242ff6c (Task 3 RED)
- FOUND commit: 8859df7 (Task 3 GREEN)
- FOUND commit: 8c7e238 (Task 3 격리 가드)
