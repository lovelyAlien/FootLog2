---
phase: 03-check-in-core-loop
plan: 06
subsystem: checkin
tags: [expo-image-picker, expo-file-system, expo-crypto, tdd, photo-storage]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (03-01)
    provides: "src/checkin/config.ts (ImagePickerDeps/CryptoDeps/PhotoStorageDeps 타입), src/checkin/deps.ts (defaultImagePickerDeps/defaultCryptoDeps/defaultPhotoStorageDeps), src/checkin/testing/fakeImagePicker.ts, fakePhotoStorage.ts"
provides:
  - "src/checkin/photos.ts — 사진 액션시트 옵션/인덱스 매핑, UUID 기반 파일명 규약, 출처별 권한 요청, pickAndCopyPhoto(선택+documentDirectory 복사+출처 보존)"
affects: [03-08 (액션 카드 화면이 이 모듈을 소비), Phase 4 REQ-photo-resize, Phase 4 REQ-exif-geotag]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "photos.ts는 expo-image-picker/expo-file-system/expo-crypto를 직접 import하지 않고 deps.ts가 조립한 기본 구현을 함수 인자 기본값으로만 받는다(config.ts 헤더 규약, 03-01 격리 회귀 가드 준수)"
    - "목적지 파일명은 항상 buildPhotoFileName(source, crypto.randomUUID())이며 picker가 반환한 원본 uri/fileName을 목적지 경로에 절대 쓰지 않는다(경로 조작 방어, threat T-3-04)"
    - "취소/권한거부/복사실패 3가지 분기를 예외가 아닌 명시적 결과값(null | {error: ...})으로 구분해 반환한다"

key-files:
  created: [src/checkin/photos.ts, src/checkin/photos.test.ts]
  modified: []

key-decisions:
  - "deps.ts의 defaultCryptoDeps(실제 expo-crypto.randomUUID)는 네이티브 바인딩이 없는 @jest-environment node에서 결정적이지 않아(undefined 반환) 테스트에서 항상 사용하지 않는다 — 별도 testing/fakeCrypto.ts 파일을 새로 만들지 않고(plan의 files_modified가 photos.ts/photos.test.ts로 고정) photos.test.ts 안에 카운터 기반 인라인 fake crypto를 정의해 주입했다(src/notifications/permissions.test.ts의 AppStateLike 인라인 페이크와 동일 규율)"
  - "worktree의 node_modules가 비어 있었다(package.json/package-lock.json에는 expo-crypto/expo-image-picker/expo-file-system이 선언돼 있었지만 실제 설치가 안 된 상태) — 메인 저장소와 lockfile이 동일함을 확인한 뒤 worktree에서 npm install을 실행해 해결했다. 이 워크트리 한정 로컬 환경 이슈이며 코드/plan 변경 아님"

requirements-completed: [REQ-checkin-core]

# Metrics
duration: ~15min
completed: 2026-08-27
---

# Phase 3 Plan 06: 사진 첨부 데이터/서비스 계층 Summary

**액션시트 옵션/파일명 규약/권한 요청 + pickAndCopyPhoto(선택 → UUID 파일명 → documentDirectory 복사, 출처 보존)를 TDD로 구현**

## Performance

- **Duration:** ~15 min (worktree node_modules 재설치 포함)
- **Started:** 2026-08-27T09:32:00Z (추정)
- **Completed:** 2026-08-27T09:47:32Z
- **Tasks:** 2
- **Files modified:** 2 (신규 생성)

## Accomplishments
- `PHOTO_ACTION_SHEET_OPTIONS`/`PHOTO_ACTION_SHEET_CANCEL_INDEX`/`PHOTO_SOURCE_BY_ACTION_SHEET_INDEX` — 03-UI-SPEC.md 확정 문구를 그대로 전사한 액션시트 옵션/인덱스 매핑 상수
- `buildPhotoFileName(source, uuid)` — `${source}-${uuid}.jpg` 파일명 규약(Phase 4 EXIF 지오태깅을 위한 출처 정보 보존)
- `ensurePhotoPermission(source, deps)` — 카메라/라이브러리 출처별 권한 요청 분기
- `pickAndCopyPhoto(source, deps)` — 권한 확인 → `mediaTypes: ['images']` 명시한 선택 → UUID 파일명 생성 → `documentDirectory` 복사까지 이어지는 전체 플로우. 취소/권한거부/복사실패를 예외 없이 구분되는 결과값으로 반환

## Task Commits

Each task followed RED → GREEN TDD cycle:

1. **Task 1: photos.ts — 액션시트 옵션/파일명 규약/권한 요청**
   - `7cdf421` test(03-06): 사진 액션시트/파일명/권한 요청 실패 테스트 작성 (RED)
   - `5610525` feat(03-06): 사진 액션시트 옵션/파일명 규약/권한 요청 구현 (GREEN)
2. **Task 2: pickAndCopyPhoto — 선택 + documentDirectory 복사 + 출처 보존**
   - `aa077b7` test(03-06): pickAndCopyPhoto 선택/복사/출처 보존 실패 테스트 추가 (RED)
   - `781b42d` feat(03-06): pickAndCopyPhoto 선택+documentDirectory 복사 구현 (GREEN)

_TDD gate compliance: 각 task마다 test(RED) 커밋이 feat(GREEN) 커밋보다 먼저 존재함을 git log로 확인._

## Files Created/Modified
- `src/checkin/photos.ts` — 사진 출처별 권한 요청 + 선택 + `documentDirectory` 복사 서비스 계층
- `src/checkin/photos.test.ts` — 14개 유닛 테스트(`@jest-environment node`)

## Decisions Made
- 카메라/라이브러리 권한 요청은 `ensurePhotoPermission`이 단일 소유하고, `pickAndCopyPhoto`가 이를 재사용해 "권한 거부 시 picker launch 자체를 호출하지 않는다"는 계약을 강제
- 테스트에서 `defaultCryptoDeps`(실제 `expo-crypto`) 대신 인라인 카운터 fake crypto를 주입 — node 테스트 환경에서 네이티브 바인딩 없이 결정적 UUID 검증이 필요했기 때문(위 key-decisions 참고)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] worktree에 node_modules가 설치되어 있지 않아 npm install 실행**
- **Found during:** Task 1 실행 전 테스트 러너 준비 단계
- **Issue:** 이 워크트리(`git worktree`)에 `node_modules`가 아예 없었음. `package.json`/`package-lock.json`에는 `expo-crypto`/`expo-image-picker`/`expo-file-system`이 이미 선언·resolve돼 있었지만 실제 설치본이 없어 `npm test`가 즉시 모듈 로드 단계에서 실패할 상황이었음
- **Fix:** 메인 저장소와 worktree의 `package.json`/`package-lock.json`이 완전히 동일함을 `diff`로 확인한 뒤, worktree 안에서 `npm install --no-audit --no-fund` 실행(888 packages 설치, lockfile 변경 없음). 코드/의존성 버전 변경이 전혀 아니라 워크트리 로컬 환경 초기화였음(패키지 설치 자체는 03-01이 이미 담당·완료한 항목이며, 이번 조치는 신규 패키지 도입이 아니라 이미 확정된 lockfile을 이 worktree에도 반영한 것)
- **Files modified:** 없음(node_modules는 `.gitignore` 대상이라 커밋 대상 아님, `package-lock.json` 변경 없음)
- **Verification:** `npm test`, `npx tsc --noEmit` 정상 실행 확인
- **Committed in:** 해당 없음(git 추적 대상 아님)

---

**Total deviations:** 1 auto-fixed (1 blocking, 환경 초기화)
**Impact on plan:** 코드/스코프 변경 없음. 순수 워크트리 로컬 환경 이슈.

## Issues Encountered
- `pickAndCopyPhoto`의 crypto 기본값 경로(`defaultCryptoDeps` → 실제 `expo-crypto.randomUUID`)가 `@jest-environment node`에서 `undefined`를 반환함을 발견 — 네이티브 바인딩이 없는 테스트 환경에서는 결정적이지 않기 때문. 프로덕션 코드는 그대로 두고(`pickAndCopyPhoto`가 실기기에서는 `deps.ts`의 실제 구현을 쓰므로 정상 동작), 테스트에서만 카운터 기반 fake crypto를 주입해 해결(위 Decisions Made 참고)
- 초기 주석 문구가 acceptance criteria의 literal grep 패턴(`mediaTypes: ['images']` 정확히 2회, `MediaTypeOptions` 정확히 0회)과 충돌해 카운트가 어긋남 — 주석 표현을 의역해 정확한 카운트를 맞춤(동작 변경 없음)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `pickAndCopyPhoto`/`ensurePhotoPermission`/`PHOTO_ACTION_SHEET_OPTIONS` 등이 03-08(액션 카드 화면)이 그대로 소비할 수 있는 안정된 계약으로 완성됨
- `cacheDirectory` 문자열 미사용, legacy file-system API 미사용을 그레이트로 확인 — D-02(PROJECT.md 사진 저장 원칙) 준수
- Phase 4의 리사이징 파이프라인(REQ-photo-resize)과 EXIF 지오태깅(REQ-exif-geotag)이 이 모듈이 보존하는 `source`/파일명 접두사 정보를 그대로 소비 가능

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/checkin/photos.ts
- FOUND: src/checkin/photos.test.ts
- FOUND: 7cdf421 (test RED, Task 1)
- FOUND: 5610525 (feat GREEN, Task 1)
- FOUND: aa077b7 (test RED, Task 2)
- FOUND: 781b42d (feat GREEN, Task 2)
