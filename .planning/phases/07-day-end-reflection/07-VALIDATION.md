---
phase: 07
slug: day-end-reflection
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-02
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo/ios preset, Jest 29.7.0 [VERIFIED: package.json] |
| **Config file** | `jest.config.js` |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest src/reflection` |
| **Full suite command** | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |
| **Estimated runtime** | ~30 seconds |

이 저장소는 두 가지 테스트 스타일을 병행한다: (1) **repo/순수로직 단위 테스트** — 실제 `node:sqlite` 엔진(`createTestDb`) 또는 순수 함수(`@jest-environment node`)로 검증(`checkinRepo.test.ts`, `pendingDelete.ts`류), (2) **"wiring" 정적 소스 분석 테스트** — `fs.readFileSync` + `stripComments` + 정규식으로 화면 소스가 특정 함수를 참조하는지/특정 문구가 등장하지 않는지 검증(`settings-wiring.test.ts`, `checkin-detail-wiring.test.ts`). 계획 단계는 이 두 기존 스타일을 따르는 것을 기본값으로 삼는다.

---

## Sampling Rate

- **After every task commit:** Run 해당 태스크가 건드린 파일의 테스트만 (`npx jest <path>`)
- **After every plan wave:** Run `npm test` (전체 스위트)
- **Before `/gsd:verify-work`:** Full suite must be green + `checkpoint:human-verify`(시뮬레이터로 Claude가 먼저 확인 후, 실기기 알림 자연 발화만 사용자에게 위임) 통과
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-02 Task 1 | 07-02 | 1 | REQ-reflection-base | V5 | `?` 파라미터 바인딩만 사용 | unit(node:sqlite) | `npx jest src/reflection/reflectionRepo.test.ts` | ✅ | ✅ green (6/6) |
| 07-08 Task 3 | 07-08 | 4 | REQ-reflection-base | — | 모달 라우트 `presentation:'modal'` 등록, 정적 지도 재사용 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ✅ | ✅ green (37/37) |
| 07-02 Task 2 | 07-02 | 1 | REQ-reflection-autosave | — | 5초 후 `onSave` 호출, `flush()` 즉시 호출, 재입력 시 타이머 리셋 | unit(jest fake timers) | `npx jest src/reflection/autosaveController.test.ts` | ✅ | ✅ green (9/9) |
| 07-04 Task 3 | 07-04 | 2 | REQ-reflection-autosave | — | AppState 리스너가 `flush()` 호출 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ✅ | ✅ green (37/37, 공유 파일) |
| 07-04 Task 3 | 07-04 | 2 | REQ-reflection-save-failure-ui | — | 저장 실패 시 `runWithSingleRetry` 참조, 실패 문구 상수 일치 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ✅ | ✅ green (37/37, 공유 파일) |
| 07-09 Task 3 | 07-09 | 5 | REQ-reflection-copy-fix | T-07-14 | 오늘 뷰에 체크인 개수/진행률 보간 없음, `TODAY_COPY` 키 집합 불변 | wiring(기존 확장) | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ | ✅ green (51/51) |
| 07-05 Task 3 | 07-05 | 3 | REQ-reflection-copy-fix | T-07-14 | 회고 모달 "오늘의 흔적" 섹션 헤더에 개수 보간 없음 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ✅ | ✅ green (37/37, 공유 파일) |
| 07-01 Task 1·2 | 07-01 | 1 | REQ-reflection-notification | V5 | `daily_reflection_hour` 컬럼 존재/기본값 21/`resolveNotificationSettings` 반영 | unit(node:sqlite)+wiring | `npx jest src/db/migrations.test.ts src/settings/settingsRepo.test.ts` | ✅ | ✅ green (39/39) |
| 07-03 Task 3 | 07-03 | 2 | REQ-reflection-notification | — | 설정 화면 4번째 행/액션시트 상수 | wiring(기존 확장) | `npx jest src/app/__tests__/settings-wiring.test.ts` | ✅ | ✅ green (35/35) |
| 07-06 Task 2 + 07-09 Task 3 | 07-06, 07-09 | 1, 5 | REQ-reflection-today-entry | — | "오늘 돌아보기" 헤더 행이 0건이어도 렌더됨 | wiring | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ | ✅ green (51/51, 공유 파일) |
| 07-07 Task 2 | 07-07 | 3 | REQ-past-reflection-edit | — | `PastDateScreen.tsx`가 회고 프롬프트/저장 함수 참조 | wiring(기존 확장) | `npx jest src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ green (33/33) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task ID/Plan/Wave columns filled by gsd-planner on 2026-09-02. Status columns updated 2026-09-03 by 07-10 Task 1 (orchestrator) — every listed command re-run individually and confirmed green, in addition to the full `npm test` (41 suites / 721 tests), `npx tsc --noEmit` (0 errors), and `npm run lint` (0 errors — see below) sweeps.*

---

## Wave 0 Requirements

- [x] `src/reflection/reflectionRepo.test.ts` — REQ-reflection-base 커버 (신규 디렉토리/프레임워크 설정 불필요, 기존 jest 설정이 `src/**/*.test.ts` 매칭)
- [x] `src/reflection/autosaveController.test.ts` — REQ-reflection-autosave 커버 (jest fake timers, Jest 29 표준 기능이라 추가 설정 불필요)
- [x] `src/app/__tests__/reflection-wiring.test.ts` — 신규 wiring 테스트 파일 (기존 `settings-wiring.test.ts` 패턴 복제). 07-04 Task 3이 파일을 생성하고, 07-05/07-08/07-09 Task가 각각 describe 블록을 append했다(최종 37개 테스트).
- [x] `src/db/migrations.test.ts`에 `daily_reflection_hour` 컬럼 테스트 추가 (기존 파일 확장)
- [x] `src/settings/settingsRepo.test.ts`에 `dailyReflectionHour` 읽기/쓰기 테스트 추가 (기존 파일 확장)

---

## Task 1 — 전체 자동 게이트 결과 (2026-09-03, orchestrator)

| Gate | Command | Result |
|------|---------|--------|
| 전체 테스트 스위트 | `npm test` | ✅ 41 suites / 721 tests, 0 failed |
| 타입체크 | `npx tsc --noEmit` | ✅ 0 errors |
| 린트 | `npm run lint` | ✅ 0 errors (20 pre-existing warnings out of scope) |
| 신규 패키지 0건 | `git diff --exit-code package.json package-lock.json` | ✅ (eslint 부트스트랩 제외 — 아래 편차 참고) |
| 알림 모듈 불변 | `git diff --exit-code src/notifications/` | ✅ exit 0 |
| SQL 템플릿 보간 1건 한도 | `grep -n '\${' src/db/migrations.ts \| grep -v '^\s*//' \| wc -l` | ✅ 1 |
| reflection/today에 accent 미사용 | `grep -rn 'colors\.accent\b' src/reflection src/today/ReflectionEntryRow.tsx \| wc -l` | ✅ 0 |

**편차 1 — eslint 최초 부트스트랩(사용자 승인, 2026-09-03):** 이 저장소는 `package.json`에 `lint` 스크립트만 있고 eslint 자체가 한 번도 설치된 적이 없었다(pre-existing gap, phase 7 스코프 밖). `npm run lint`를 처음 실행하자 `expo lint`가 eslint+eslint-config-expo를 자동 설치하며 package.json/package-lock.json을 변경했고(07-10 자체 "신규 패키지 0건" 게이트와 충돌하는 것처럼 보였음), 이어서 최신 `eslint-plugin-react-hooks`(React Compiler용 엄격 규칙 — `app.json`의 `reactCompiler: true`가 실제로 활성화돼 있어 이 규칙들이 실제 빌드 동작과 관련 있음)가 Phase 5 파일(`UndoSnackbar.tsx`)과 Phase 7 파일(`useReflectionDraft.ts`, `PastDateScreen.tsx`, `(tabs)/index/index.tsx`)에서 총 11개 에러를 새로 발견했다. 사용자에게 "이번 phase에서는 생략" / "phase 7 파일만 수정" / "발견된 모두 수정" 3가지 옵션을 제시했고, **"발견된 모두 수정"**을 선택받아 진행했다. 결과: eslint 부트스트랩은 별도 커밋(`chore(07-10): eslint 최초 부트스트랩`)으로 분리, 11개 에러는 `fix(07-10): 최초 lint 게이트에서 발견된 11개 에러 수정`에서 실제 코드 수정(2건 — TDZ 순서 재배치, useState 지연 초기화로 전환)과 근거 있는 `eslint-disable-next-line`(3건 — ref-mirroring 지연 초기화 관용구, 초기화 함수 실행 시점이 아니라 실제 이벤트 콜백 시점에만 ref를 읽음을 확인)으로 해소. 이후 `git diff --exit-code package.json package-lock.json`은 eslint 부트스트랩 커밋을 포함한 최종 상태 기준으로 통과 처리한다(신규 런타임 의존성이 아니라 devDependency 개발 도구이므로 T-07-SC의 취지인 "런타임에 영향을 주는 미검증 패키지 도입"에는 해당하지 않는다고 판단).

**편차 2 — tabBarStyle 기준 재해석:** acceptance criteria는 `grep -rl 'tabBarStyle' src | wc -l`가 1이고 그 파일이 `PastDateScreen.tsx`라고 명시했으나, 실제로는 baseline(phase 7 시작 이전, 커밋 `dbf6ffa`)에서부터 이미 `src/app/(tabs)/_layout.tsx`(탭 네비게이터의 정적 기본 스타일 1회 선언)와 여러 `*-wiring.test.ts` 파일(자기 자신의 정규식 리터럴 안에서 `'tabBarStyle'` 문자열을 언급)이 함께 매칭되어 총 5~7개 파일이 나온다 — phase 7 이전부터 그랬으므로 phase 7의 회귀가 아니다. 기준의 실제 의도(PastDateScreen.tsx만이 `navigation.getParent()?.setOptions({ tabBarStyle: ... })`로 탭바를 **동적으로 토글**하는 유일한 곳)로 재확인: `grep -rn "setOptions({ tabBarStyle" src`는 `PastDateScreen.tsx` 2건(`display:'none'`/`'flex'`)만 반환 — 의도된 불변식은 유지됨.

---

## Task 2 — 시뮬레이터 자체 검증 결과 (2026-09-03, Claude 직접 수행)

절차: iOS Simulator 패널 attach → 최근 DerivedData 빌드(`FootLog-egavmkuofntpqmdojqtfyhrsxmyu`) launch → `npx expo start --dev-client`(포트 8090, 로컬 포트 8081이 이 머신의 다른 프로젝트에 점유돼 있어 회피) → `exp+footlog://` 커스텀 스킴으로 라우트 딥링크 → 탭/텍스트입력/터치패스로 조작. `xcrun simctl location set`으로 GPS 좌표 고정(37.5665,126.9780) 후 실제 체크인 1건을 만들어 지도 핀/시간표시가 있는 상태로 검증했다.

| 항목 | 결과 | 비고 |
|------|------|------|
| A. 오늘 돌아보기 진입 행 — 체크인 0건 상태 | ✅ PASS | 앱 최초 실행 직후(체크인 0건) 스크린샷에서 바텀시트 peek에 "오늘 돌아보기" 행이 이미 렌더됨을 직접 확인. 07-RESEARCH.md Assumptions Log A2(`ListHeaderComponent` 지원 여부) 해소됨. |
| B. 모달 프레젠테이션 | ✅ PASS | `/reflection` 딥링크로 연 모달이 탭바를 포함해 화면 전체를 덮음(탭바 미노출 직접 관찰). 헤더에 ✕만 있고 날짜 타이틀 없음(D-03) 확인. ✕ 탭으로 정상적으로 닫힘. |
| C. 정적 지도 | ✅ PASS | 체크인 1건 상태에서 지도에 핀 1개만 표시(궤적선 없음 — graceful degradation). 핀 색상은 Pin(terracotta) 계열, accent 아님. |
| D. 자동저장 | ✅ PASS | 두 경로 직접 확인: (1) 프롬프트 입력 직후 ✕로 즉시 닫고 재진입 → 값 유지(닫기 flush), (2) 추가 입력 후 HOME 버튼으로 백그라운드 전환 → 재진입 → 값 유지(AppState flush). 두 경우 모두 "저장 중" 등 문구 없이 조용히 저장됨. 5초 디바운스 자체의 정밀 타이밍은 07-02 autosaveController.test.ts(9/9 green, jest fake timers)가 커버. |
| E. 진입 행 D-02(완료 후에도 모습 불변) | ⚠️ 코드 리뷰로 대체 | 시뮬레이터에서 회고 작성 전/후 진입 행을 나란히 스크린샷 비교하지는 못했음(세션 내 시간 제약) — `ReflectionEntryRow.tsx` 소스에 완료 상태를 나타내는 prop/조건부 렌더링이 전혀 없음을 코드로 확인(07-09-SUMMARY.md D-02 계약과 일치), `today-wiring.test.ts` 회귀 가드가 이를 정적으로 고정. |
| F. 과거 날짜 인라인 편집 | ✅ PASS (일부는 코드 리뷰로 대체) | 2026-09-02 과거 날짜 뷰 진입 → 시트를 끝까지 드래그해 체크인(11:00) 아래 회고 프롬프트 2칸 확인, "오늘의 흔적" 헤더/40×40 썸네일 없음(D-04) 확인, 프롬프트에 입력 가능함을 확인. **날짜 전환 시 값 귀속(T-07-05)**은 시뮬레이터에서 스크러버를 정밀 드래그하지 못해(작은 터치 타겟) 직접 재현하지 못했음 — `calendar-wiring.test.ts`의 정적 계약 테스트와 `PastDateScreen.tsx`의 `activeDateKeyRef` 가드 코드 리뷰로 대체. |
| G. 설정 4번째 행 | ⚠️ 부분 확인 | "회고 알림 시각" 행이 토글 바로 아래 정확한 위치에 기본값 "21시"로 렌더됨을 직접 확인. 행을 탭해 액션시트(19~23시)를 여는 상호작용은 여러 차례 시도했으나 시뮬레이터에서 네이티브 `ActionSheetIOS`가 스크린샷에 캡처되지 않아(또는 탭 좌표가 정확히 맞지 않아) 직접 확인하지 못함 — `settings-wiring.test.ts`의 신규 10개 테스트(Test 26–35, 전부 green)가 상수/핸들러 배선을 정적으로 검증. |
| H. 알림 탭 딥링크(부분 검증) | ⚠️ 시뮬레이터로 확인 불가한 부분 발견 | `xcrun simctl push`로 알림을 보냈으나 (1) 앱이 포그라운드 상태라 배너가 표시되지 않았고, (2) 더 근본적으로 `simctl push`는 **원격(remote) 푸시**를 시뮬레이션하므로 시스템이 `UNNotificationRequest.identifier`를 자동 생성한다 — `_layout.tsx`의 딥링크 게이트는 **로컬 스케줄 알림**에만 앱이 직접 부여하는 `DAILY_REFLECTION_ID`('daily_reflection') 식별자를 정확히 매칭하는 방식이라, `simctl push` 경로로는 이 특정 조건을 재현할 수 없음(원천적 도구 한계, 07-10 계획 자체가 이미 "자연 발화 여부는 확인 불가"로 예견한 범주에 포함됨). 실제 로컬 알림 발화 경로는 `reflection-wiring.test.ts`의 정적 배선 테스트로만 커버되며, 실제 탭 동작은 Task 3(실기기)에서 확인한다. |
| I. DESIGN.md 정합성 | ⚠️ 부분 확인 | 회고 화면 전체에서 accent 색상 미사용 확인(핀 포함). 한글 텍스트는 Newsreader가 한글 글리프를 지원하지 않아 시스템 폰트로 폴백되는 것이 이미 알려진/의도된 동작이라(01-02 Newsreader 번들 결정 참고) 세리프/시스템 폰트 시각적 구분이 한글 프롬프트에서는 무의미함 — 코드 리뷰로 typography 토큰 적용을 확인. 저장 실패 문구의 muted 스타일은 재현하지 못해(의도적 오류 주입 없음) `ReflectionPrompts.tsx`의 `errorText`/`retryText` 스타일이 `SettingsScreen.tsx`와 동일함을 코드로 확인. |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 매일 고정 시각 알림의 실제 발화(잠금화면 노출, 탭 시 딥링크 동작) | REQ-reflection-notification | OS 알림 스케줄러의 실기기 타이밍/잠금화면 렌더링은 시뮬레이터로 원천 재현 불가. **추가로 확인됨(2026-09-03):** `simctl push`는 원격 푸시라 로컬 알림 전용 식별자(`DAILY_REFLECTION_ID`)를 재현하지 못해, 딥링크 게이트 자체도 시뮬레이터에서 검증 불가 — 위 Task 2 표 H행 참고 | 실기기에서 알림 시각 도래 대기 → 알림 확인(제목만, 사적 정보 없음) → 탭 → `/reflection` 모달이 콜드스타트로도 곧장 열리는지 확인 |
| ~~앱 백그라운드 전환 시 자동저장 플러시~~ (해소됨) | REQ-reflection-autosave | ~~시뮬레이터로 AppState 전환 자체는 재현 가능~~ — **2026-09-03 Claude가 시뮬레이터에서 직접 확인 완료**(위 Task 2 표 D행). 더 이상 수동 확인 대상 아님 | (해소) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Task 1(자동 게이트)/Task 2(시뮬레이터 검증) — Claude 완료, 2026-09-03. Task 3(실기기 알림 자연 발화 + 콜드스타트 딥링크) — 창업자 "모두 승인", 2026-09-03. Phase 7 게이트 전체 통과.
