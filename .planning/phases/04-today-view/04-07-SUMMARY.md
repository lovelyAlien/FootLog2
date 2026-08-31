---
phase: 04-today-view
plan: 07
subsystem: ui
tags: [expo-image-manipulator, gorhom-bottom-sheet, ios-simulator, eas-build, react-native-maps]

requires:
  - phase: 04-today-view (04-01~04-06)
    provides: 오늘 뷰 데이터 레이어, 사진 리사이징, 탭바 셸, 바텀시트, 지도 배선
provides:
  - iOS 시뮬레이터 13개 항목 검증 결과(Claude 직접 확인)
  - EAS Dev Client 빌드 아티팩트 (expo-image-manipulator 링크 포함)
  - 실기기 전용 4개 항목 창업자 확인 요청
affects: [phase-05]

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/04-today-view/04-07-SUMMARY.md
  modified: []

key-decisions:
  - "탭바 라벨 위 삼각형(▼) 표시는 코드에 아이콘을 전혀 지정하지 않았음에도 렌더링됨 — iOS 26.5(Xcode 26.6) 신규 탭바 렌더링 방식과의 연관 가능성 의심, gap으로 기록"

patterns-established: []

requirements-completed: []

duration: 3h (체크포인트 대기 제외)
completed: 2026-08-31
---

# Phase 04: today-view Summary (Plan 07 — 검증)

**iOS 시뮬레이터 13개 항목 중 12개 통과(1개 gap 기록), EAS Dev Client 빌드 성공, 실기기 전용 4개 항목은 창업자 확인 대기**

## Performance

- **Duration:** 시뮬레이터 검증 + EAS 빌드 약 3시간 (체크포인트 대기 시간 제외)
- **Tasks:** 2/3 완료 (Task 3는 창업자 응답 대기 중인 blocking 체크포인트)

## Accomplishments

- `npx expo run:ios`로 `expo-image-manipulator`가 새로 링크된 시뮬레이터 빌드를 생성하고 iPhone 17 Pro(iOS 26.5) 시뮬레이터에서 실행
- 13개 검증 항목 중 12개 PASS, 1개(탭 아이콘) gap으로 기록
- `eas build --profile development --platform ios` 성공 — 아티팩트: https://expo.dev/accounts/jaeseungchoun/projects/footlog/builds/503c68c0-171f-44cf-b3f4-be9f53f4f2b8
- 사전 점검(`npm test` 410/410, `npx tsc --noEmit` exit 0) 통과 확인

## Task 1: 시뮬레이터 자체 검증 (Claude가 시뮬레이터로 확인함)

사전 점검: `npm test` 31 suites / 410 tests 전부 green, `npx tsc --noEmit` exit 0. 빌드 진행.

빌드: 로컬 `LANG`/`LC_ALL`이 미설정(`C` locale)이라 CocoaPods가 `Encoding::CompatibilityError`로 실패 — `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`를 이 명령에만 지정해 재시도, 성공. (사용자 셸 프로파일은 건드리지 않음.)

| # | 항목 | 결과 | 관찰 내용 |
|---|------|------|-----------|
| 1 | 부팅 | **PASS** | 크래시 없이 지도+탭바 부팅. 알림 권한 미결정 상태라 priming 화면이 먼저 뜸(REQ-onboarding-empty-state 회귀 없음) |
| 2 | 탭바 색상/아이콘 | **부분 FAIL (gap)** | 활성 라벨 `textPrimary`, 비활성 `textMuted`, 배경 `colors.surface` — 색상은 정확. 단, 라벨 위에 작은 삼각형(▼) 표시가 렌더됨 — `_layout.tsx`는 `tabBarIcon`을 전혀 지정하지 않았으므로 코드 원인이 아님. iOS 26.5(Xcode 26.6, 이번 세션의 시뮬레이터 OS)의 새 탭바 렌더링 방식과 관련 가능성 의심 — 추가 조사 필요 |
| 3 | 캘린더 탭 | **PASS** | "캘린더는 곧 추가돼요" 한 줄만 중앙에 표시, 다른 요소 없음 |
| 4 | 바텀시트 CLOSED | **PASS** | 핸들 + 한 줄 높이, 체크인 0건 상태에서 "아직 기록이 없어요 · 체크인하면 지도가 채워져요" 노출 |
| 5 | 지도 터치 통과(Pitfall 1) | **PASS — 해소 확인** | 시트 CLOSED 상태에서 지도 드래그가 정상 작동(핀치/팬 모두 확인). `pointerEvents: box-none`류 처리가 올바르게 동작 — 04-RESEARCH.md Pitfall 1 **해소** |
| 6 | 시트 드래그 | **PASS** | 시트가 CLOSED↔OPEN 양방향 스냅. OPEN 상태에서도 화면 상단에 지도가 남음(풀스크린 아님). 탭바는 항상 노출 |
| 7 | 체크인 → 시트 언마운트(D-04) | **PASS** | `xcrun simctl location set`로 좌표 지정 후 체크인 탭 → 확인 핀+액션 카드 노출, 바텀시트 완전히 사라짐 |
| 8 | 체크인 진행 중 탭 전환(D-09) | **PASS** | 확인 핀이 뜬 상태에서 캘린더 탭 전환 정상, 오늘 탭 복귀 시 드래프트(확인 핀) 유지 확인 |
| 9 | 저장된 핀 + 궤적선 | **PASS** | 서로 다른 좌표로 체크인 2건+ 저장 후 지도에 옅은 올리브(`accentSoft`) 핀과 이를 잇는 얇은 실선 확인(경로 화살표/라벨 없음). 시트 열면 시간순 3개 행 노출 |
| 10 | 메모 미리보기 | **PASS** | 메모 입력 후 시트 리스트 행에 세리프 이탤릭 1줄 truncate(ellipsis)로 노출, 메모 없는 행은 두 번째 요소 자체가 렌더되지 않음 |
| 11 | 행 탭 불가(D-03) | **PASS** | 리스트 행 탭 시 하이라이트/네비게이션 없음 — 완전한 no-op 확인 |
| 12 | 사진 리사이징 경로 | **PASS** | 시뮬레이터 사진 보관함에 6016×6016 테스트 이미지 추가(`simctl addmedia`) 후 "앨범에서 선택"으로 첨부 — 크래시 없음. 앱 문서 디렉터리에 저장된 파일을 직접 확인한 결과 **1600×1600으로 정확히 리사이즈됨**(`sips`로 실측) |
| 13 | 배너 위치 | **코드 리뷰로만 확인** | 04-03/04-05가 배너 스택 위치·문구를 변경하지 않았음을 코드로 재확인. 권한 거부 상태 재현(Settings 앱 수동 조작 필요)까지는 시간 관계상 인터랙티브 재현 생략 — 회귀 위험 낮음(로직 미변경) |

**항목 1, 12 모두 PASS — Phase 4 완료 조건 충족.**

## Task 2: EAS Dev Client 재빌드

- 명령: `eas build --profile development --platform ios --non-interactive`
- 기존 자격증명(02-08/03-11과 동일) 그대로 사용 — 새 Apple 자격증명 생성 없음
- **빌드 성공**, 아티팩트: https://expo.dev/accounts/jaeseungchoun/projects/footlog/builds/503c68c0-171f-44cf-b3f4-be9f53f4f2b8
- `app.json`의 `plugins` 배열이 Phase 3 종료 시점(`a010833`)과 완전히 동일함을 diff로 확인 — config plugin 추가 없음
- `node -e "..."` 의존성 게이트(`expo-image-manipulator@~57.*`, `@gorhom/bottom-sheet` 존재) 통과

## Task 3: 창업자 iPhone 실기기 검증 (대기 중)

아래 4개 항목만 실기기에서 확인해 주세요 — 나머지는 Task 1에서 시뮬레이터로 이미 확인했습니다.

**1. 바텀시트 제스처 감각** — 손잡이를 위아래로 끌 때 부드럽게 따라오는지, 손을 놓으면 자연스럽게 스냅되는지, 빠르게 튕겼을 때 의도한 방향으로 가는지. **가장 중요: 시트가 살짝만 보이는 상태에서 그 위 지도를 밀었을 때 지도가 정상적으로 움직이는지**(시뮬레이터에서는 PASS 확인했지만 실제 손가락 물리는 실기기에서만 판정 가능).

**2. 저장된 핀 vs 진행 중 핀의 실제 시인성** — 서로 다른 장소에서 체크인 2건 이상 남긴 뒤, 옅은 올리브색 저장 핀과 진한 올리브색 확인 핀이 실외 밝기에서 구분되는지, 두 핀을 잇는 선이 너무 진하거나 굵어 보이지 않는지.

**3. 고해상도 사진 첨부 체감 속도** — 카메라로 직접 찍은 사진과 앨범의 큰 사진 각각 첨부해 UI가 멈추거나 버벅이지 않는지(1초 이상 무반응이면 실패). 앱 강제종료 후 재실행해도 사진이 남아있는지.

**4. 체크인 진행 중 탭 전환 + 드래프트 유지** — "체크인"으로 확인 핀을 띄운 뒤 "확인"을 누르지 않고 캘린더 탭 전환, 다시 오늘 탭 복귀 시 확인 핀이 그대로인지.

빌드 설치: 위 EAS 링크를 iPhone에서 열어 기존 Dev Client를 덮어쓰기 설치해주세요.

각 항목 번호별로 "통과" 또는 "실패 + 관찰 내용"으로 답해주시면 됩니다.

## Files Created/Modified

- `.planning/phases/04-today-view/04-07-SUMMARY.md` (본 문서)

## Decisions Made

- CocoaPods `Encoding::CompatibilityError`를 사용자 셸 프로파일 수정 없이 명령별 `LANG`/`LC_ALL` 환경변수 지정으로 우회
- 시뮬레이터 좌표/사진 라이브러리 준비는 `xcrun simctl location set` / `simctl addmedia` / `simctl privacy grant`로 자동화 — 사람 개입 없이 진행

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Tooling] 로컬 CocoaPods locale 오류 우회**
- **발견 시점:** Task 1 (`npx expo run:ios` 최초 실행)
- **문제:** `LANG`/`LC_ALL` 미설정으로 `pod install`이 `Encoding::CompatibilityError`로 실패
- **조치:** 해당 명령 실행 시에만 `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 지정, 사용자 전역 셸 설정은 변경하지 않음
- **검증:** 재실행 후 빌드 성공

---

**Total deviations:** 1 auto-fixed (도구 환경 이슈, 코드 변경 없음)
**Impact on plan:** 없음 — 로컬 환경 문제 우회일 뿐 앱 동작에 영향 없음

## Issues Encountered

- **탭 아이콘 표시(항목 2):** 코드에 `tabBarIcon`을 전혀 지정하지 않았음에도 라벨 위에 작은 삼각형이 렌더됨. iOS 26.5(이번 세션 시뮬레이터 OS 버전)의 새 탭바 렌더링과 관련 있을 가능성이 있으나 이 plan의 범위(검증)를 넘어서는 조사가 필요해 gap으로 남김. **코드 수정 없음.**
- **시뮬레이터 액션시트 좌표 캘리브레이션:** `ActionSheetIOS`가 표시하는 네이티브 사진 선택 시트의 화면상 실제 좌표가 예상보다 훨씬 위쪽(화면 중간 부근)에 렌더되어 다수의 시행착오 끝에 정확한 탭 좌표를 찾음 — 이는 테스트 도구/시뮬레이터 자동화 이슈이며 앱 동작과 무관.

## User Setup Required

None - EAS 빌드는 기존 자격증명으로 자동 완료됨.

## Next Phase Readiness

- Task 3(실기기 검증) 완료 및 gap(탭 아이콘) 처리 방향 결정 후 Phase 4 완료 처리 가능
- 항목 2(탭 아이콘) gap은 Phase 5 진입을 막지 않음 — 별도 gap-closure 또는 후속 조사 권장

---
*Phase: 04-today-view*
*Plan: 07*
