---
phase: 04-today-view
plan: 02
subsystem: checkin
tags: [expo-image-manipulator, image-resize, documentDirectory, tdd, checkin-photos]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: "src/checkin/photos.ts의 pickAndCopyPhoto(픽커→UUID 파일명→documentDirectory 복사) 파이프라인, config.ts/deps.ts 포트-어댑터 격리 규약"
provides:
  - "resolveResizeTarget(순수 함수) — 방향 인식 리사이즈 타깃 계산"
  - "defaultResizeDeps — expo-image-manipulator 새 컨텍스트 API 기반 리사이즈 어댑터"
  - "pickAndCopyPhoto의 resize → documentDirectory 복사 배선, 'resize_failed' 에러 타입"
affects: [04-today-view, 08-export-polish]

# Tech tracking
tech-stack:
  added: ["expo-image-manipulator ~57.0.14"]
  patterns:
    - "네이티브 SDK가 체이닝 컨텍스트 객체를 노출할 때, 함수 포트(ResizeDeps)로 좁혀 테스트 더블을 단순하게 유지"
    - "방향/분기 판단 로직을 네이티브 경계 밖 순수 함수(photoResize.ts)로 분리해 Node 환경에서 단위 테스트"

key-files:
  created:
    - src/checkin/photoResize.ts
    - src/checkin/photoResize.test.ts
    - src/checkin/testing/fakeImageResizer.ts
  modified:
    - package.json
    - package-lock.json
    - src/checkin/config.ts
    - src/checkin/deps.ts
    - src/checkin/photos.ts
    - src/checkin/photos.test.ts
    - src/checkin/__tests__/nativeDeps.test.ts

key-decisions:
  - "resolveResizeTarget는 동률(정사각형)일 때 width 기준으로 통일 — 04-02-PLAN.md behavior 명세 그대로 구현"
  - "defaultResizeDeps는 원본 치수를 얻기 위해 액션 없이 한 번 렌더한 뒤, resolveResizeTarget 결과가 null이면 재렌더/재저장 없이 원본 uri를 그대로 반환 — 불필요한 재인코딩 방지"
  - "deprecated된 manipulateAsync 대신 새 컨텍스트 기반 API(manipulate().resize().renderAsync().saveAsync())만 사용 — 이 문자열 자체를 주석에도 남기지 않아 acceptance criteria의 리터럴 grep 게이트를 통과시킴"

patterns-established:
  - "네이티브 SDK 어댑터(deps.ts)가 순수 판단 로직(photoResize.ts)을 import해 방향 분기 — 판단과 I/O를 분리"

requirements-completed: [REQ-photo-resize]

duration: 25min
completed: 2026-08-31
---

# Phase 04 Plan 02: 체크인 사진 리사이징 파이프라인 Summary

**체크인 사진이 pick → resize(방향 인식, 최대 1600px) → documentDirectory 복사 순서로 저장되도록 배선하고, 리사이즈 방향 판단을 네이티브 의존 없는 순수 함수로 분리해 단위 테스트로 검증했다.**

## Performance

- **Duration:** 약 25분(파일 읽기/API 조사 포함)
- **Tasks:** 2/2 완료
- **Files modified:** 7개 수정, 3개 신규 생성

## Accomplishments
- `expo-image-manipulator@~57.0.14`를 `npx expo install`로 설치하고, 기존 네이티브 패키지 격리 회귀 가드(`nativeDeps.test.ts`)의 감시 대상에 편입시켰다.
- 가로/세로/정사각형/충분히 작은 이미지 4가지 방향 케이스(+ 경계값/비정상 입력 케이스 포함 8개 테스트)를 `resolveResizeTarget` 순수 함수로 검증했다.
- `pickAndCopyPhoto`에 리사이즈 단계를 `documentDirectory` 복사 앞에 배선하고, 리사이즈 결과 uri가 복사 단계로 전달됨을 테스트로 게이트했다(threat T-4-05 완화).
- 리사이즈 실패가 예외 전파 없이 `{ error: 'resize_failed' }`로 흡수되어 기존 "사진을 추가하지 못했어요" 인라인 문구 경로로 자동 수렴함을 확인했다.

## Task Commits

Each task was committed atomically:

1. **Task 1: expo-image-manipulator 설치 + 리사이즈 타깃 계산(순수 함수) + 격리 회귀 가드 확장** - `9d61ac8` (feat)
2. **Task 2: defaultResizeDeps + 테스트 더블 + pickAndCopyPhoto 리사이즈 단계 배선** - `772558b` (feat)

_Note: 두 태스크 모두 `tdd="true"`였다 — 각 태스크마다 테스트를 먼저 작성해 RED(실패)를 직접 확인한 뒤 구현해 GREEN으로 전환했다(아래 TDD Gate Compliance 참고). 다만 최종 커밋은 RED와 GREEN을 분리하지 않고 태스크 단위로 한 번에 묶었다 — 플랜의 태스크 단위 커밋 규약(task_commit_protocol)을 따른 결과이며, RED 확인 자체는 커밋 전에 별도로 수행했다._

## Files Created/Modified
- `src/checkin/photoResize.ts` - 방향 인식 리사이즈 타깃 계산 순수 함수(`resolveResizeTarget`), 네이티브 미의존
- `src/checkin/photoResize.test.ts` - 6개 behavior + 경계값/비정상 입력 케이스 총 8개 테스트
- `src/checkin/config.ts` - `MAX_PHOTO_DIMENSION_PX`(1600) 상수, `ResizeDeps` 포트 타입 추가
- `src/checkin/deps.ts` - `defaultResizeDeps` 추가(expo-image-manipulator 새 컨텍스트 API 유일한 런타임 import 지점)
- `src/checkin/photos.ts` - `pickAndCopyPhoto`에 resize 단계 배선, `PickPhotoResult`에 `'resize_failed'` 추가
- `src/checkin/photos.test.ts` - 리사이즈 관련 behavior 테스트 4건 추가(copy가 리사이즈 결과 uri를 받음, MAX_PHOTO_DIMENSION_PX 전달, 실패 시 copy 미호출, 권한 거부 시 resize 미호출)
- `src/checkin/testing/fakeImageResizer.ts` - 리사이즈 테스트 더블(고정 uri 반환, 호출 기록, 실패 시뮬레이션)
- `src/checkin/__tests__/nativeDeps.test.ts` - `EXPO_STAR_PACKAGES`에 `expo-image-manipulator` 추가, "5종"→"6종" 갱신
- `package.json`/`package-lock.json` - `expo-image-manipulator ~57.0.14` 의존성 추가

## Decisions Made
- `resolveResizeTarget`는 정사각형(동률)일 때 `{ width }` 기준으로 통일(plan behavior 명세 그대로).
- `defaultResizeDeps`는 리사이징이 불필요한 경우(`resolveResizeTarget` → `null`) 원본 uri를 그대로 반환해 불필요한 재인코딩/재저장을 피한다.
- acceptance criteria의 리터럴 grep 게이트(`manipulateAsync`, `expo-image-manipulator` 문자열이 각각 deps.ts/photos.ts에 존재하면 안 됨)를 통과시키기 위해, 이 두 문자열을 해당 파일의 주석에서도 완전히 배제하고 우회 표현으로 대체했다.

## Deviations from Plan

None - plan executed exactly as written. (구현 중 acceptance criteria의 리터럴 grep 게이트에 맞춰 주석 표현을 조정한 것은 계획 이탈이 아니라 계획이 명시한 검증 기준을 그대로 만족시키기 위한 조정이다.)

## TDD Gate Compliance

두 태스크 모두 `tdd="true"`였다. 각 태스크에서 RED(테스트 작성 → 실패 확인) → GREEN(구현 → 통과 확인) 순서를 실제로 수행했다:
- Task 1: `photoResize.test.ts` 작성 후 모듈 부재로 실패(RED) 확인 → `photoResize.ts`/`config.ts` 구현 후 8/8 통과(GREEN) 확인.
- Task 2: `photos.test.ts`에 리사이즈 behavior 테스트 3건 추가 후 실패(RED) 확인(`toHaveLength` 불일치, `resize_failed` 미반환) → `deps.ts`/`photos.ts` 구현 후 38/38 통과(GREEN) 확인.

다만 git 커밋 히스토리 자체에는 `test(...)`/`feat(...)` 분리 커밋이 아니라 태스크당 단일 `feat(...)` 커밋만 존재한다(테스트+구현 동시 포함). RED 검증은 커밋 이전 단계에서 `npx jest`로 직접 수행했으며 본 SUMMARY에 그 결과를 기록한다.

## Self-Check

(아래 Self-Check 섹션에서 검증)

## Issues Encountered
- 없음. `npx expo install expo-image-manipulator`가 즉시 `~57.0.14`(다른 `expo-*` 패키지와 동일한 SDK 57 라인)를 설치해 버전 불일치 문제가 없었다.

## Next Phase Readiness
- REQ-photo-resize 완료. 사용자에게 노출되는 UI 변경은 없다(04-UI-SPEC.md §사진 리사이징 계약대로).
- `src/app/index.tsx`는 이 plan에서 변경되지 않았다 — 기존 `'error' in result` 분기가 새 `'resize_failed'` 값을 자동으로 흡수한다.

---
*Phase: 04-today-view*
*Plan: 02*
*Completed: 2026-08-31*
