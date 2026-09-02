# Phase 7: Day-end Reflection - Research

**Researched:** 2026-09-02
**Domain:** React Native(Expo SDK 57)/expo-router 로컬 우선 앱에서의 전체화면 모달 + 디바운스 자동저장 + 로컬 SQLite 신규 컬럼 마이그레이션 + iOS 로컬 알림 탭 딥링크
**Confidence:** HIGH (기존 검증된 저장소 관용구 재사용이 대부분) / 일부 MEDIUM (모달 라우팅, 알림 탭 딥링크, 디바운스 컨트롤러는 이 저장소에 선례가 없는 신규 영역)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (저장 실패 UI):** 폼 하단 공유 인라인 문구 1개("저장하지 못했어요"+"다시 시도"), 필드별 아님. 두 프롬프트(`newPlaceAnswer`, `freeReflection`)는 하나의 `DailyReflection` 레코드로 함께 저장되는 단일 트랜잭션이므로 실패 UI도 그 단위와 일치시킨다. 체크인/설정 화면과 동일 문구·톤, 빨간색·경고아이콘 없음. 성공 시엔 아무 표시도 하지 않는다.
- **D-02 ("오늘 돌아보기" 행 완료 상태):** 그날 이미 회고를 작성했더라도 행을 시각적으로 구분하지 않는다(체크마크/뱃지/색상 변화 일체 없음) — PROJECT.md "진행률/완료 수치 UI 노출 금지" CRITICAL 원칙을 "완료 여부" 신호에도 동일 적용. `accentSoft` 배경은 "이 행은 항상 다르다"는 고정 스타일일 뿐 완료 신호가 아니다.
- **D-03 (모달 헤더):** 닫기(✕) 버튼만, 날짜 타이틀/헤더 텍스트 없음 — 이 모달은 항상 "오늘"에 대한 것이라 날짜가 암묵적으로 명확함(DESIGN.md decoration level: minimal). 과거 날짜 회고 편집(D-04)은 이미 그 화면 자체가 날짜를 표시하므로 이 결정과 무관.
- **D-04 (과거 날짜 회고 편집 UI):** 별도 모달이 아니라 기존 과거 날짜 뷰(Phase 6 `PastDateScreen.tsx`) 화면에 회고 프롬프트 2칸을 인라인으로 추가한다. 자동저장/디바운스/실패 UI는 오늘 화면과 동일 로직 재사용. 사진 썸네일 40×40 리스트는 이 화면에는 적용하지 않는다(과거 날짜 뷰 리스트엔 썸네일 없음, `calendar-date-scrubber.md` 기존 결정 유지).
- **D-05 (회고 알림 시각 선택 기능, 신규 스코프 확장):** 원본 문서/REQUIREMENTS.md의 "시각은 21시 하드코딩, 토글만 가능"을 창업자가 명시적으로 뒤집음. 설정 화면에 회고 알림 시각을 직접 선택하는 UI를 이번 phase에 추가한다.
  - `app_settings` 테이블에 새 컬럼(`daily_reflection_hour`) 마이그레이션 추가, `settingsRepo.ts`의 `resolveNotificationSettings`/`upsertSettings` 확장 필요.
  - UI는 네이티브 휠 피커가 아니라 기존 "알림 빈도"와 동일한 `ActionSheetIOS` 패턴(새 네이티브 의존성 `@react-native-community/datetimepicker` 추가 회피 — 미설치 확인됨, EAS Dev Client 재빌드 회피).
  - `src/notifications/scheduling.ts`의 트리거 생성 로직은 이미 `settings.dailyReflectionHour`로 파라미터화되어 있어 수정 불필요 — UI/DB/settingsRepo 레이어만 확장.
  - REQUIREMENTS.md에 이 스코프 확장 반영 필요(REQ-reflection-notification 문구 갱신 또는 새 requirement 추가) — Phase 6 D-01(설정 화면 스코프 gap)과 동일 패턴.

### Claude's Discretion

- 정적 지도 렌더링 방식(react-native-maps `scrollEnabled={false}` 잠금 vs 스냅샷 API) — Phase 5 선례를 따름(잠금 방식 채택, 아래 Architecture Patterns 참고). 궤적선이 아직 없으면 핀만 표시(graceful degradation).
- 회고 알림 시각 선택 액션시트의 정확한 후보 시각 목록 — **07-UI-SPEC.md가 이미 확정**: `["19시","20시","21시","22시","23시","취소"]`. 21시가 반드시 포함되어야 함(창업자 본인의 현재 설정).
- 모달 진입/퇴장 애니메이션의 정확한 duration/easing — **07-UI-SPEC.md가 이미 확정**: 커스텀 duration을 발명하지 않고 iOS 네이티브 모달 기본 전환(`presentation: 'modal'`)에 위임한다.
- 회고 저장 함수와 체크인 저장 함수(`runWithSingleRetry`) 간 재사용 범위 — 이 문서의 권장: `runWithSingleRetry`(순수 함수, `checkins`에 종속되지 않음, 헤더 주석이 이미 범용 재사용을 의도) **그대로 import해 재사용**한다(복제하지 않음). 아래 Architecture Patterns Pattern 2 참고.

### Deferred Ideas (OUT OF SCOPE)

None — 논의가 phase 스코프 안에 머물렀다. 알림 시각 선택 UI(D-05)는 스코프를 넓히는 결정이지만 이 phase 안에서 흡수한다(별도 phase로 미루지 않음).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-reflection-base | 전체화면 회고 모달이 그날의 정적 지도를 재사용하고, 2개 프롬프트를 보여주며, `DailyReflection` 레코드로 저장. 진입점 연결 | Architecture Patterns 1(모달 라우트)/2(reflectionRepo)/3(오늘 뷰 지도·리스트 쿼리 재사용); Code Examples 전체; `daily_reflections` 테이블은 이미 Phase 1에서 생성됨(schema.ts) — 새 테이블 불필요 |
| REQ-reflection-autosave | 5초 디바운스 + `AppState` 백그라운드 flush + 모달 닫기(✕/스와이프) flush, 모두 동일 저장 함수 | Architecture Patterns Pattern 4(디바운스 컨트롤러, `pendingDelete.ts` 설계 차용); Common Pitfall "디바운스 vs unmount flush 경합" |
| REQ-reflection-save-failure-ui | 회고 저장 실패는 체크인 저장 실패와 동일 재시도 패턴 | `runWithSingleRetry`(`src/checkin/checkinRepo.ts`) 그대로 재사용 — Don't Hand-Roll 참고 |
| REQ-reflection-copy-fix | "오늘의 흔적" 섹션명 변경, 체크인 개수 미표시 | `src/today/content.ts` TODAY_COPY 갱신 지점; 07-UI-SPEC.md Copywriting Contract가 이미 확정 문구 제공 |
| REQ-reflection-notification | 매일 고정 시각 회고 알림 기본 켜짐 + 설정 토글(+ D-05 시각 선택 확장) | scheduling.ts/registry.ts는 이미 완성(Phase 2) — 이 phase는 UI/DB/settingsRepo 레이어만; Architecture Patterns Pattern 6(설정 4번째 행), Pattern 7(마이그레이션) |
| REQ-reflection-today-entry | "오늘 돌아보기" 행이 리스트 최상단 고정, 체크인 0건이어도 항상 보임 | Common Pitfall "TodayBottomSheet 타입 불일치" — `CheckinListRow`/`checkins: CheckinRow[]` 재사용이 아니라 `ListHeaderComponent`로 분리 렌더 권장 |
| REQ-past-reflection-edit | 과거 날짜 뷰에 편집 가능한 회고 프롬프트 추가(읽기전용 결정 반전) | Architecture Patterns Pattern 5(`PastDateScreen.tsx` 인라인 확장) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **DESIGN.md 우선 원칙:** 모든 시각/UI 결정 전에 반드시 DESIGN.md를 읽어야 하며, 명시적 사용자 승인 없이 벗어날 수 없다 — 07-UI-SPEC.md가 이미 이 검토를 완료했으므로 계획/실행 단계는 07-UI-SPEC.md를 1차 출처로 따르되, 새로운 시각 판단이 필요해지면 DESIGN.md로 돌아가야 한다.
- **QA 모드에서 DESIGN.md 불일치 플래그:** 리뷰 단계에서 DESIGN.md와 어긋나는 코드는 반드시 지적한다.
- **실기기 확인 필요 항목의 시뮬레이터 우선 처리:** `checkpoint:human-verify` 게이트를 만나면 먼저 iOS Simulator로 검증 가능한지 판단한다. 이 phase에서 시뮬레이터로 검증 가능한 항목: 모달 슬라이드 애니메이션, 자동저장 디바운스 타이밍, 저장 실패 UI 렌더링, "오늘 돌아보기" 행 고정 노출, 과거 날짜 뷰 인라인 편집, 설정 화면 4번째 행 액션시트. 시뮬레이터로 원천 재현 불가능한 항목: 실제 알림이 21:00(또는 선택 시각)에 실기기에서 발화해 탭했을 때의 콜드스타트 딥링크 동작(시뮬레이터도 로컬 알림 발화 자체는 가능하지만, 실제 방치 후 자연 발화 검증은 실기기 신뢰도가 더 높음) — 이 항목만 사용자 확인으로 넘기고, 나머지는 Claude가 시뮬레이터로 먼저 확인한다.
- **OS 캐시/정확도 트레이드오프 검토:** 이 phase는 위치 조회 API를 새로 쓰지 않으므로(정적 지도는 기존 체크인 좌표만 재사용) 해당 규칙의 적용 대상이 아니다.
- **버그 수정 후 `/ce-compound` 자동 문서화:** 조사가 필요했던 버그를 고치고 검증까지 끝나면 실행 단계에서 적용해야 한다(연구 단계 해당 없음, 계획서에 인지시켜야 함).
- **Git 커밋 규칙:** 한글 Conventional Commits, AI 서명 트레일러 금지 — 계획/실행 단계 커밋 시 적용.

</phase_requirements>

## Summary

Phase 7은 새 아키텍처를 만드는 phase가 아니라 **이미 존재하는 3개의 완성된 하위 시스템(① `daily_reflections` SQLite 테이블, ② 반복 캘린더 트리거 알림 스케줄링+자가진단 레지스트리, ③ 체크인 저장 실패 재시도 패턴)을 하나의 새 화면(회고 모달)과 두 개의 기존 화면 확장(오늘 뷰 진입 행, 과거 날짜 뷰 인라인 편집)으로 배선하는 phase**다. 새로 설치해야 할 npm 패키지는 없다 — `expo-router`의 `presentation: 'modal'`, `expo-notifications`의 `useLastNotificationResponse`, 순수 TS 타이머 컨트롤러(기존 `pendingDelete.ts` 설계 재사용)만으로 전체 요구사항을 만족한다.

가장 중요한 세 가지 신규 영역(이 저장소에 선례가 없어 이 문서가 처음 설계함)은 다음과 같다:

1. **5초 디바운스 자동저장 컨트롤러** — 기존 체크인 상세화면(`CheckinDetailScreen.tsx`)의 "자동저장 아님, 명시적 flush만" 모델과 **의도적으로 다른** 모델이다(05-CONTEXT.md D-01/D-02가 이미 이 구분을 문서화함). 디바운스 타이머 자체는 `src/today/pendingDelete.ts`의 "단일 타이머 + dispose 시 즉시 확정(취소 아님)" 설계를 거의 그대로 차용할 수 있다.
2. **탭바를 덮는 전체화면 모달 라우트** — 이 저장소의 모든 기존 "화면 전환"은 같은 탭의 nested Stack 안에서의 push(탭바 유지, 예: 체크인 상세, 설정) 또는 nested Stack 안에서 명시적으로 탭바를 `display: 'none'`으로 숨기는 방식(과거 날짜 뷰)이었다. `presentation: 'modal'`은 이 두 패턴 모두와 다른 세 번째 방식으로, 루트 `Stack`(탭 그룹의 부모)에 새 스크린을 등록해야 한다.
3. **알림 탭 → 화면 딥링크** — 이 저장소는 지금까지 알림을 "예약"하는 코드만 있었고 "탭했을 때 반응"하는 코드가 전혀 없었다(Phase 2는 스케줄링/자가진단까지만 스코프). `expo-notifications`의 `useLastNotificationResponse()` 훅(콜드스타트 포함 최신 권장 API)을 루트 레이아웃에 추가해야 한다.

**Primary recommendation:** 새 `src/reflection/` 도메인 디렉토리를 만들어 `reflectionRepo.ts`(checkinRepo.ts와 동일한 SQL-단일-출처 규약), `autosaveController.ts`(pendingDelete.ts 설계 차용), `content.ts`, `ReflectionModal.tsx`(화면 본체, CheckinDetailScreen.tsx처럼 라우트 파일 밖에 둠)를 배치하고, `src/app/reflection.tsx`를 루트 Stack에 `presentation: 'modal'`로 등록한다. `PastDateScreen.tsx`와 `SettingsScreen.tsx`는 기존 파일을 확장한다(신규 파일 아님).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 회고 모달 UI(지도/프롬프트/닫기) | Client (RN 화면 컴포넌트) | — | 순수 프레젠테이션, 기존 CheckinDetailScreen.tsx와 동일 계층 |
| 회고 자동저장 디바운스 로직 | Client (순수 TS 컨트롤러) | Local Persistence | 타이머/트리거 판정은 RN 비의존 순수 로직(pendingDelete.ts와 동일 계층), 실제 쓰기는 SQLite |
| `DailyReflection` CRUD | Local Persistence (SQLite, `reflectionRepo.ts`) | — | 기존 `checkinRepo.ts`/`settingsRepo.ts`와 동일한 "SQL은 repo 파일에만" 규약 |
| 회고 알림 예약/자가진단 | OS Integration (`expo-notifications`) | Local Persistence(설정값 읽기) | 이미 Phase 2가 완성 — 이 phase는 파라미터(시각)만 확장 |
| 알림 탭 → 모달 딥링크 | Client (루트 레이아웃, `useLastNotificationResponse`) | OS Integration | expo-router의 라우팅은 클라이언트 계층, 알림 응답 수신 자체는 OS 이벤트 |
| 회고 알림 시각 선택 UI | Client (SettingsScreen.tsx) | Local Persistence(`app_settings.daily_reflection_hour`) | 기존 "알림 빈도" 행과 동일 계층 |
| "오늘 돌아보기" 진입 행 | Client (Today 뷰) | — | 리스트 렌더링/네비게이션 트리거만, 데이터 소유 없음 |
| 과거 날짜 회고 인라인 편집 | Client (PastDateScreen.tsx) | Local Persistence | 기존 화면 확장, 저장 경로는 reflectionRepo.ts 공유 |
| DB 스키마 마이그레이션(신규 컬럼) | Local Persistence (`migrations.ts`) | — | 앱 전체에서 이 파일만 DDL 실행 권한을 가짐(기존 규약) |

## Standard Stack

### Core

이 phase는 **새 npm 패키지를 설치하지 않는다.** 필요한 모든 기능이 이미 `package.json`에 설치된 의존성 안에 있다.

| Library | Version(설치됨) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~57.0.16 [VERIFIED: package.json] | `presentation: 'modal'` 라우트로 탭바를 덮는 전체화면 모달 | 이미 프로젝트 전역 네비게이션 표준. 새 네비게이션 라이브러리 도입 불필요 |
| expo-notifications | ~57.0.14 [VERIFIED: package.json] | `useLastNotificationResponse()` 훅으로 알림 탭 감지 | Phase 2가 이미 스케줄링에 이 패키지를 쓰고 있음 — 같은 패키지의 다른 API를 추가로 쓰는 것뿐 |
| expo-sqlite | ~57.0.1 [VERIFIED: package.json] | `daily_reflections` CRUD, `app_settings` 컬럼 추가 | 기존 `MigratableDb` 패턴 그대로 |
| expo-crypto | ~57.0.2 [VERIFIED: package.json] | `Crypto.randomUUID()`로 새 `DailyReflectionRow.id` 생성 | `src/checkin/deps.ts`의 `defaultCryptoDeps`가 이미 노출 — reflectionRepo도 같은 방식으로 주입받으면 됨 |
| react-native-maps | 1.27.2 [VERIFIED: package.json] | 회고 모달의 정적 지도(체크인 핀+궤적선) | Today 뷰/CheckinDetailScreen.tsx가 이미 쓰는 동일 컴포넌트, `scrollEnabled={false}` 잠금 패턴 재사용 |
| @gorhom/bottom-sheet | ^5.2.14 [VERIFIED: package.json] | (참고용) `BottomSheetFlatList`는 오늘 뷰에서만 쓰이고 회고 모달 자체는 일반 `ScrollView`로 충분 | 모달은 시트가 아니라 전체화면 고정 레이아웃(07-UI-SPEC.md "스크롤 가능한 단일 컬럼") |

### Supporting

새 라이브러리 없음 — 아래는 기존 코드 내 재사용 대상 모듈.

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/checkin/checkinRepo.ts`의 `runWithSingleRetry` | 저장 1회 자동 재시도 + 실패 판정 | 회고 저장 함수를 이 함수로 감싼다(D-01/REQ-reflection-save-failure-ui) |
| `src/today/pendingDelete.ts` (설계 패턴만 차용, import 아님) | 단일 타이머 + "dispose 시 즉시 확정(취소 아님)" 컨트롤러 골격 | 디바운스 자동저장 컨트롤러(`autosaveController.ts`) 설계 원형 |
| `src/checkin/deps.ts`의 `defaultCryptoDeps` | UUID 생성 | 새 `DailyReflectionRow.id` |
| `src/checkin/localDate.ts`의 `resolveLocalDateKey`/`toIsoTimestamp` | 로컬 날짜 키/타임스탬프 계산 | 회고 레코드의 `date`/`created_at`/`updated_at` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 순수 TS 타이머 컨트롤러(자체 제작) | `lodash.debounce` 또는 `use-debounce` npm 패키지 | 새 의존성 추가 비용 대비, 요구되는 동작(5초 고정 디바운스 + 명시적 flush 3종 + "dispose 시 최신 값 강제 flush")이 5~10줄 이내로 구현 가능하고 기존 `pendingDelete.ts`가 이미 거의 동일한 패턴을 검증해뒀음 — 과설계(Don't Hand-Roll 원칙의 반대 방향: 여기서는 "라이브러리를 안 쓰는 것"이 오히려 이 저장소 규약과 일치) |
| `useLastNotificationResponse()` 훅 | `addNotificationResponseReceivedListener` 리스너 직접 구독 | 훅은 콜드스타트로 앱이 알림 탭에 의해 막 실행된 경우까지 커버하지만(공식 문서 예시), 리스너 단독 구독은 앱이 이미 실행 중일 때만 반응한다 — 회고 알림은 리마인더 성격상 사용자가 앱을 완전히 종료한 상태에서 탭할 가능성이 낮지 않으므로 훅을 권장 |
| `presentation: 'modal'`(expo-router 내장) | 커스텀 `Modal`(react-native 내장 컴포넌트)을 직접 렌더 | 커스텀 Modal은 expo-router의 뒤로가기/딥링크/스와이프-닫기 제스처와 별도로 상태를 관리해야 하고, 탭 내비게이터와의 z-order를 수동으로 맞춰야 한다 — expo-router가 이미 라우트 스택 레벨에서 이를 해결 |

**Installation:** 해당 없음 — 새 패키지 설치 불필요.

## Package Legitimacy Audit

**해당 없음 — 이 phase는 외부 패키지를 설치하지 않는다.** 위 Standard Stack 표의 모든 항목은 `package.json`에 이미 설치되어 있음을 직접 확인했다(Bash로 `package.json` 조회). slopcheck/registry 검증 절차는 신규 패키지가 없으므로 생략한다.

## Architecture Patterns

### System Architecture Diagram

```
[알림 탭 (OS)]                         [Today 뷰 "오늘 돌아보기" 행 탭]
        │                                          │
        ▼                                          ▼
useLastNotificationResponse()           router.push('/reflection')  (절대 경로 — 탭 그룹 밖으로 나가는 라우트)
   (src/app/_layout.tsx)                           │
        │                                          │
        └───────────────► router.push('/reflection') ◄───────┘
                                   │
                                   ▼
                    [src/app/reflection.tsx]  (루트 Stack, presentation: 'modal')
                                   │
                                   ▼
                    [ReflectionModal.tsx 화면 본체]
                     ├─ getTodayCheckins(db, todayKey)  ── 기존 checkinRepo 쿼리 재사용
                     ├─ getReflectionByDate(db, todayKey) ── 신규 reflectionRepo
                     │        │
                     │        ▼
                     │   [정적 지도 (MapView, scrollEnabled=false)]
                     │   [체크인 리스트 (신규 read-only 행, 썸네일 포함)]
                     │   [프롬프트1 TextInput] ─┐
                     │   [프롬프트2 TextInput] ─┤
                     │                          ▼
                     │              createAutosaveController()
                     │              (5초 타이머 | AppState background | unmount)
                     │                          │
                     │                          ▼
                     │              runWithSingleRetry(() => upsertReflection(db, ...))
                     │                          │
                     │                 ┌────────┴────────┐
                     │              성공(조용)         실패 1회 재시도도 실패
                     │                                    │
                     │                                    ▼
                     │                        [폼 하단 공유 실패 문구 + 다시 시도]
                     ▼
                    [✕ 닫기 / 스와이프 다운] → autosaveController.flush() → router.back()

[과거 날짜 뷰 (PastDateScreen.tsx)]
        │
        ▼
   리스트 아래 동일 프롬프트 2칸 인라인 추가 (같은 reflectionRepo/autosaveController 재사용)

[설정 화면 (SettingsScreen.tsx)]
        │
        ▼
   4번째 행 "회고 알림 시각" → ActionSheetIOS → persist({...settings, dailyReflectionHour})
                                                        │
                                                        ▼
                                     applyNotificationSettings (기존, 수정 불필요)
                                                        │
                                                        ▼
                                     settingsRepo.upsertSettings (daily_reflection_hour 컬럼 확장)
```

### Recommended Project Structure

```
src/
├── reflection/                      # 신규 도메인 디렉토리
│   ├── reflectionRepo.ts            # SQL 단일 출처 — getReflectionByDate/upsertReflection
│   ├── reflectionRepo.test.ts       # node:sqlite 엔진 기반 (checkinRepo.test.ts와 동일 패턴)
│   ├── autosaveController.ts        # 순수 TS 디바운스 컨트롤러 (pendingDelete.ts 설계 차용)
│   ├── autosaveController.test.ts   # jest fake timers
│   ├── content.ts                   # 프롬프트 라벨/실패 문구 단일 출처
│   └── ReflectionModal.tsx          # 화면 본체 (라우트 파일 밖 — CheckinDetailScreen.tsx와 동일 관용구)
├── app/
│   ├── _layout.tsx                  # 수정: <Stack.Screen name="reflection" options={{presentation:'modal'}}/> 추가 + useLastNotificationResponse 배선
│   ├── reflection.tsx               # 신규 — ReflectionModal을 감싸는 라우트 파일 (db 주입만)
│   └── __tests__/
│       └── reflection-wiring.test.ts # 신규 — 정적 소스 분석 회귀 가드
├── today/
│   ├── content.ts                   # 수정: "오늘의 흔적" 문구, 개수 표기 제거
│   └── TodayBottomSheet.tsx         # 수정: ListHeaderComponent로 "오늘 돌아보기" 행 분리 렌더 (아래 Pitfall 참고)
├── calendar/
│   └── PastDateScreen.tsx           # 수정: 리스트 아래 프롬프트 2칸 인라인 추가
├── settings/
│   ├── content.ts                   # 수정: REFLECTION_HOUR_* 액션시트 상수 추가
│   └── SettingsScreen.tsx           # 수정: 4번째 행 추가
├── notifications/
│   └── config.ts                    # 수정 없음(설명용) — dailyReflectionHour 필드는 이미 존재
├── settings/settingsRepo.ts          # 수정: daily_reflection_hour 읽기/쓰기
└── db/
    ├── schema.ts                     # 수정: AppSettingsRow에 daily_reflection_hour: number 추가
    └── migrations.ts                 # 수정: DATABASE_VERSION 3→4, ALTER TABLE 블록 추가(기존 블록 수정 금지)
```

### Pattern 1: 탭바를 덮는 전체화면 모달 라우트

**What:** expo-router의 `presentation: 'modal'`을 루트 Stack(탭 그룹의 형제)에 등록.
**When to use:** REQ-reflection-base — "push가 아니라 모달로 탭바까지 덮는다"는 DESIGN.md 확정 요구사항.
**Example:**
```tsx
// Source: https://docs.expo.dev/router/advanced/modals/ (공식 문서, WebFetch로 확인 2026-09-02)
// src/app/_layout.tsx — 기존 <Stack screenOptions={{ headerShown: false }} /> 를 아래처럼 확장
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen
    name="reflection"
    options={{ presentation: 'modal', headerShown: false }}
  />
</Stack>
```
```tsx
// src/app/reflection.tsx (신규 파일)
import { useSQLiteContext } from 'expo-sqlite';
import { ReflectionModal } from '../reflection/ReflectionModal';

export default function ReflectionRoute() {
  const db = useSQLiteContext();
  return <ReflectionModal db={db} />;
}
```
진입 트리거(오늘 뷰, `src/app/(tabs)/index/index.tsx`)에서는 **절대 경로**를 써야 한다 — 현재 탭 nested Stack 밖(루트 Stack)으로 나가는 라우트이기 때문:
```tsx
router.push('/reflection'); // './reflection' 같은 상대 경로는 현재 탭의 nested Stack 안에서만 풀린다 — 잘못된 경로로 조용히 실패하거나 404
```
[CITED: docs.expo.dev/router/advanced/modals/] — "on Android, the modal slides on top of the current screen... on iOS, the modal slides from the bottom" / "when tabs are nested at the root level, the modal route in the Stack will overlay all tab content."

### Pattern 2: 회고 저장 함수 — `runWithSingleRetry` 재사용 + 단일 트랜잭션 upsert

**What:** `commitCheckin`과 동일한 셰이프(재시도 래핑 + BEGIN/COMMIT/ROLLBACK)로 `date` 기준 upsert.
**When to use:** REQ-reflection-base/autosave/save-failure-ui.
**Example:**
```typescript
// src/reflection/reflectionRepo.ts (신규)
// Source: src/checkin/checkinRepo.ts의 commitCheckin 트랜잭션 패턴을 그대로 복제
import type { MigratableDb } from '../db/migrations';
import type { DailyReflectionRow } from '../db/schema';

export type ReflectionSaveParams = {
  id: string; // 신규 행일 때만 쓰임 — 호출자가 defaultCryptoDeps.randomUUID()로 미리 생성
  date: string; // resolveLocalDateKey(new Date())
  newPlaceAnswer: string;
  freeReflection: string;
  now: string; // toIsoTimestamp()
};

export async function getReflectionByDate(
  db: MigratableDb,
  date: string
): Promise<DailyReflectionRow | null> {
  const row = await db.getFirstAsync<DailyReflectionRow>(
    'SELECT * FROM daily_reflections WHERE date = ?',
    date
  );
  return row ?? null;
}

// date에 UNIQUE 제약이 이미 있다(schema.ts) — 이 함수는 그 제약을 SELECT 없이
// 활용하지 않고 명시적으로 select-then-branch를 쓴다. 이유: (1) 이 저장소가
// 지금까지 어디서도 SQLite UPSERT(`ON CONFLICT ... DO UPDATE`) 문법을 쓴 적이
// 없어 스타일 일관성이 깨진다, (2) commitCheckin과 동일한 트랜잭션 형태를
// 유지하면 리뷰어가 "이 파일도 같은 패턴"이라고 즉시 인지할 수 있다.
export async function upsertReflection(
  db: MigratableDb,
  params: ReflectionSaveParams
): Promise<{ ok: true } | { ok: false }> {
  const result = await runWithSingleRetryImportedFromCheckinRepo(async () => {
    try {
      await db.execAsync('BEGIN');
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM daily_reflections WHERE date = ?',
        params.date
      );
      if (existing) {
        await db.runAsync(
          'UPDATE daily_reflections SET new_place_answer = ?, free_reflection = ?, updated_at = ? WHERE id = ?',
          params.newPlaceAnswer || null,
          params.freeReflection || null,
          params.now,
          existing.id
        );
      } else {
        await db.runAsync(
          `INSERT INTO daily_reflections (id, date, new_place_answer, free_reflection, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          params.id,
          params.date,
          params.newPlaceAnswer || null,
          params.freeReflection || null,
          params.now,
          params.now
        );
      }
      await db.execAsync('COMMIT');
    } catch (err) {
      try {
        await db.execAsync('ROLLBACK');
      } catch (rollbackErr) {
        console.error('upsertReflection: ROLLBACK failed', rollbackErr);
      }
      throw err;
    }
  });
  return result.ok ? { ok: true } : { ok: false };
}
```
실제 구현에서는 `runWithSingleRetryImportedFromCheckinRepo`를 `import { runWithSingleRetry } from '../checkin/checkinRepo'`로 바꾼다(위 코드는 지면상 이름을 풀어씀). **계획 단계 결정 필요:** `runWithSingleRetry`를 `checkin/` 밖에서 import하는 것이 도메인 경계를 넘는지, 아니면 이 함수를 `src/db/` 같은 공용 위치로 옮길지 — 이 문서는 "그대로 import"를 권장하지만(헤더 주석이 이미 범용 재사용 의도를 명시), 계획자가 파일 이동 여부를 확정해야 한다.

### Pattern 3: 오늘 뷰 지도·리스트 데이터 재사용

**What:** 회고 모달은 새 쿼리를 만들지 않고 `getTodayCheckins(db, resolveLocalDateKey(new Date()))`를 그대로 호출.
**When to use:** REQ-reflection-base "정적 지도 재사용".
**Example:**
```tsx
// Source: src/checkin/checkinRepo.ts 헤더 주석 — "04-CONTEXT.md D-11: 오늘 뷰가 공유하는 단일 조회 함수, Phase 6/7이 동일 시그니처 재사용"
const todayKey = resolveLocalDateKey(new Date());
const checkins = await getTodayCheckins(db, todayKey);
const trajectoryCoordinates = buildTrajectoryCoordinates(checkins); // src/today/trajectory.ts 재사용
```
지도는 `CheckinDetailScreen.tsx`의 잠긴 정적 지도 패턴(`scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} pointerEvents="none"`)을 그대로 복제한다.

### Pattern 4: 디바운스 자동저장 컨트롤러 (신규 설계, `pendingDelete.ts` 원형 차용)

**What:** 순수 TS 모듈, RN/네이티브 의존성 없음(`@jest-environment node`에서 테스트 가능).
**When to use:** REQ-reflection-autosave — "5초 디바운스, AppState 백그라운드 flush, 모달 닫기 flush, 모두 동일 저장 함수".
**Example:**
```typescript
// src/reflection/autosaveController.ts (신규)
// Source: src/today/pendingDelete.ts의 "단일 타이머 + dispose 시 즉시 확정" 설계를
// 차용하되, 목적이 다르다 — pendingDelete는 "취소 가능한 지연 확정"이고 이 컨트롤러는
// "취소 불가능한 지연 저장"이다(undo 개념 없음). 그래서 undo()에 해당하는 메서드가 없다.
export const REFLECTION_AUTOSAVE_DEBOUNCE_MS = 5000;

export type ReflectionDraft = { newPlaceAnswer: string; freeReflection: string };

export type AutosaveController = {
  // 매 키 입력마다 호출 — 이전 타이머를 취소하고 새로 5초를 건다.
  notify(draft: ReflectionDraft): void;
  // AppState background 전환 / 모달 닫기(✕, 스와이프) 시 호출 — 타이머를 기다리지
  // 않고 즉시 마지막 draft로 저장 함수를 실행한다(pendingDelete.dispose()와 동일 정신).
  flush(): void;
  // 언마운트 시 반드시 호출 — 살아있는 타이머를 정리한다. flush()를 대신 호출하지
  // 않는다: 언마운트 직전에 별도로 flush()를 명시적으로 부르는 것은 호출자 책임
  // (모달의 handleClose가 flush() 후 router.back()을 호출하는 순서).
  dispose(): void;
};

export function createAutosaveController(args: {
  onSave: (draft: ReflectionDraft) => void;
  debounceMs?: number;
}): AutosaveController {
  const debounceMs = args.debounceMs ?? REFLECTION_AUTOSAVE_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestDraft: ReflectionDraft | null = null;

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    notify(draft) {
      latestDraft = draft;
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (latestDraft) args.onSave(latestDraft);
      }, debounceMs);
    },
    flush() {
      clear();
      if (latestDraft) args.onSave(latestDraft);
    },
    dispose() {
      clear();
    },
  };
}
```
화면 쪽 배선(요약, 전체 코드는 계획 단계):
```tsx
const autosave = useRef(
  createAutosaveController({
    onSave: (draft) => {
      runWithSingleRetry(() =>
        upsertReflection(db, { id: reflectionIdRef.current, date: todayKey, ...draft, now: toIsoTimestamp() })
      ).then((result) => setSaveFailed(!result.ok));
    },
  })
).current;

useEffect(() => {
  const subscription = AppState.addEventListener('change', (next) => {
    if (next === 'active') return; // CheckinDetailScreen.tsx와 동일 가드 — active 복귀 시 오발화 방지
    autosave.flush();
  });
  return () => subscription.remove();
}, [autosave]);

useEffect(() => () => autosave.dispose(), [autosave]); // 언마운트 시 타이머 정리(flush는 handleClose가 별도로)

const handleClose = useCallback(() => {
  autosave.flush();
  router.back();
}, [autosave]);
```

### Pattern 5: 과거 날짜 뷰 인라인 확장

**What:** `PastDateScreen.tsx`의 `<TodayBottomSheet .../>` 아래에 프롬프트 2칸을 추가.
**When to use:** REQ-past-reflection-edit(D-04).
**Example:** `activeDateKey`(이미 존재하는 state — 스크러버로 바뀜)를 그대로 `getReflectionByDate(db, activeDateKey)`에 전달. 스크러버로 날짜를 바꾸면 회고 입력칸도 그 날짜의 값으로 다시 로드해야 한다(기존 `reloadCheckins`가 `activeDateKey` 변경 시 재실행되는 것과 동일한 `useEffect` 의존성 패턴 재사용). 같은 `autosaveController`/`upsertReflection`을 재사용하되 `date` 인자만 `activeDateKey`로 바뀐다.

### Pattern 6: 설정 화면 4번째 행 (알림 시각 ActionSheet)

**What:** 기존 "알림 빈도" 행과 동일한 `ActionSheetIOS.showActionSheetWithOptions` 패턴.
**Example:**
```typescript
// src/settings/content.ts에 추가 — FREQUENCY_* 트리오와 동일 구조
export const REFLECTION_HOUR_OPTIONS = ['19시', '20시', '21시', '22시', '23시', '취소'] as const;
export const REFLECTION_HOUR_CANCEL_INDEX = 5;
export const REFLECTION_HOUR_BY_ACTION_SHEET_INDEX: readonly (number | null)[] = [19, 20, 21, 22, 23, null];
export const REFLECTION_HOUR_LABEL_BY_VALUE: Readonly<Record<number, string>> = {
  19: '19시', 20: '20시', 21: '21시', 22: '22시', 23: '23시',
};
```
```tsx
// SettingsScreen.tsx — handleFrequencyPress와 동일 셰이프
const handleReflectionHourPress = useCallback(() => {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: [...REFLECTION_HOUR_OPTIONS], cancelButtonIndex: REFLECTION_HOUR_CANCEL_INDEX },
    (buttonIndex) => {
      const nextHour = REFLECTION_HOUR_BY_ACTION_SHEET_INDEX[buttonIndex];
      if (nextHour === null || nextHour === undefined) return;
      persist({ ...settings, dailyReflectionHour: nextHour }); // 기존 persist() 시그니처 변경 불필요
    }
  );
}, [persist, settings]);
```
`persist()` 함수는 이미 전체 `NotificationSettings` 객체를 받으므로 **시그니처 변경이 전혀 필요 없다** — `dailyReflectionHour` 필드는 `NotificationSettings` 타입에 이미 존재한다(`src/notifications/config.ts`).

### Pattern 7: DB 마이그레이션 — 컬럼 추가(기존 블록 수정 금지)

**What:** `DATABASE_VERSION`을 3→4로 올리고 새 순차 블록만 append.
**Example:**
```typescript
// src/db/migrations.ts — 기존 currentDbVersion===2 블록은 절대 수정하지 않는다
// (migration_discipline #2 — 이미 그 버전을 통과한 기기는 변경분을 못 받음).
export const DATABASE_VERSION = 4; // 3 → 4

// ... 기존 if (currentDbVersion === 0/1/2) 블록 그대로 ...

if (currentDbVersion === 3) {
  // ALTER TABLE ADD COLUMN ... DEFAULT 21 — 기존 row(1개, id='settings')가 있어도
  // SQLite가 자동으로 새 컬럼에 기본값 21을 채운다. 이게 D-05 Discretion의
  // "21시가 후보 목록에 반드시 포함돼야 창업자 본인의 현재 설정이 깨지지 않는다"를
  // 코드 레벨에서 보장한다 — 별도 백필 스크립트 불필요.
  await db.execAsync(
    'ALTER TABLE app_settings ADD COLUMN daily_reflection_hour INTEGER NOT NULL DEFAULT 21'
  );
  currentDbVersion = 4;
}
```
[VERIFIED: 코드베이스 관찰 — `migrations.test.ts` Test D/15/16이 정확히 이 "구버전 DDL을 직접 실행 후 migrateDbIfNeeded 호출"로 순차 캐스케이드를 검증하는 패턴을 이미 확립해뒀다. 신규 컬럼도 동일 형태의 테스트(`user_version=3 기기 업그레이드 시 daily_reflection_hour가 21로 채워진다`)로 검증 가능.]

`src/db/schema.ts`의 `AppSettingsRow` 타입에는 `daily_reflection_hour: number`를 추가한다(이 인터페이스는 "이미 배포된 SQL 문자열"이 아니라 타입 정의이므로 수정 가능 — CREATE_APP_SETTINGS_TABLE_SQL 상수 자체는 손대지 않는다).

### Anti-Patterns to Avoid

- **`presentation: 'modal'` 안에서 탭바를 다시 `display: 'none'`으로 숨기려는 시도:** 불필요 — 모달은 루트 Stack 레벨에서 탭 네비게이터 전체를 덮으므로 `PastDateScreen.tsx`가 쓰는 `navigation.getParent()?.setOptions({ tabBarStyle: ... })` 패턴을 회고 모달에 복제하면 안 된다(이미 화면 전체를 덮고 있어 탭바 자체가 아예 보이지 않음 — 불필요한 코드 추가이자 혼란의 원인).
- **회고 모달의 저장 로직을 `CheckinDetailScreen.tsx`의 "명시적 flush만" 모델로 복제:** 05-CONTEXT.md D-01/D-02가 이미 "상세화면은 자동저장이 아니라 명시적 미저장 경고 방식 — 이 phase의 자동저장 모델과 의도적으로 다른 모델"이라고 명시. 두 모델을 섞지 않는다(체크인 상세화면에는 5초 디바운스를 추가하지 않고, 회고 모달에는 미저장 경고 Alert를 추가하지 않는다).
- **알림 콘텐츠에 동적 `date` 페이로드를 넣으려는 시도:** `scheduleById`가 등록하는 `DAILY_REFLECTION_ID` 트리거는 `repeats: true` 반복 캘린더 트리거로, 콘텐츠(`content`)는 등록 시점에 고정되며 발화마다 새로 생성되지 않는다 — "몇 월 며칠 회고입니다" 같은 동적 문구/데이터를 넣을 수 없다. 탭 시점에 열어야 할 날짜는 알림 페이로드가 아니라 **탭 시점의 `resolveLocalDateKey(new Date())`**로 판정한다(아래 Assumptions Log A1 참고).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| 저장 실패 시 자동 재시도 | 새 재시도 로직/카운터 | `runWithSingleRetry`(`src/checkin/checkinRepo.ts`, import) | 이미 검증됐고 헤더 주석이 범용 재사용을 명시. 새로 만들면 재시도 횟수/실패 판정 기준이 미묘하게 갈릴 위험 |
| 디바운스 타이머 | `lodash.debounce`/`use-debounce` npm 설치 | 자체 제작 순수 TS 컨트롤러(Pattern 4) | 요구 동작이 단순(5초 고정 + flush 3종)하고, 새 의존성 없이 `pendingDelete.ts`가 이미 거의 동일한 설계를 검증해둠 |
| 알림 탭 감지 폴링/커스텀 리스너 관리 | 자체 `AppState` 폴링으로 "알림에서 왔는지" 추론 | `expo-notifications`의 `useLastNotificationResponse()` | 공식 훅이 콜드스타트/백그라운드 복귀 두 경로를 모두 커버 |
| 회고 알림 시각 선택 UI | 네이티브 휠 피커(`@react-native-community/datetimepicker`) 설치 | 기존 `ActionSheetIOS` 패턴 재사용 | D-05가 명시적으로 신규 네이티브 의존성/EAS 재빌드를 회피하기로 결정 |
| DailyReflection upsert 판정 | SQLite `ON CONFLICT ... DO UPDATE` 신규 도입 | SELECT-then-branch + 트랜잭션(Pattern 2) | 이 저장소가 지금까지 UPSERT 문법을 쓴 적이 없어 버전 지원 여부가 미검증(Assumptions Log 참고) — `commitCheckin`과 동일한 이미 검증된 트랜잭션 형태 유지가 더 안전 |

**Key insight:** 이 phase의 "hand-roll 하지 말아야 할 것"은 전부 **이미 이 저장소 안에 있다.** 새 외부 라이브러리가 필요한 지점이 단 하나도 없다는 것 자체가 이 phase의 스코프가 "배선"이라는 CONTEXT.md의 판단을 뒷받침한다.

## Common Pitfalls

### Pitfall 1: `TodayBottomSheet`/`CheckinListRow`는 `CheckinRow[]`에 강결합 — "오늘 돌아보기" 행을 단순 배열 prepend로 넣을 수 없다

**What goes wrong:** 07-UI-SPEC.md는 "단순 배열 prepend — 기존 리스트 렌더링 로직에 항목 하나 추가"라고 표현하지만, 실제 `TodayBottomSheet`의 `checkins` prop 타입은 `CheckinRow[]`이고 `CheckinListRow`는 `checkin.timestamp_utc`/`checkin.note`/스와이프 삭제(`onDeleteRequest`)/탭 시 상세화면 이동(`onPress`)을 전제한다. "오늘 돌아보기"는 `CheckinRow`가 아니므로 같은 배열에 억지로 합치면 타입이 깨지거나, 합성 객체를 만들어 `CheckinListRow`가 오작동한다(스와이프하면 삭제가 시도되는 등).
**Why it happens:** UI-SPEC은 시각/문구 계약을 정의하는 문서이지 타입 설계 문서가 아니다 — "리스트 최상단에 상시 노출"이라는 요구를 컴포넌트 재사용 범위로 오독하기 쉽다.
**How to avoid:** `TodayBottomSheet`에 `ListHeaderComponent`(RN `FlatList`/`BottomSheetFlatList` 표준 prop, `@gorhom/bottom-sheet`가 `FlatListProps`를 상속함 [CITED: gorhom.dev/react-native-bottom-sheet/components/bottomsheetflatlist — "Inherits FlatListProps from react-native", 명시적으로 무시된다고 문서화된 prop은 `scrollEventThrottle`/`decelerationRate`/`onScrollBeginDrag` 뿐])를 새 선택적 prop으로 추가해 "오늘 돌아보기" 행을 헤더로 분리 렌더한다. 이때 현재 `checkins.length === 0`이면 `<Text>`만 렌더하고 `BottomSheetFlatList`를 아예 마운트하지 않는 조건 분기(`TodayBottomSheet.tsx` 101~115줄)를 **항상 `BottomSheetFlatList`를 마운트하고 빈 상태는 `ListEmptyComponent`로 옮기는 방식**으로 바꿔야 한다 — 그래야 체크인이 0건이어도 "오늘 돌아보기" 헤더 행이 리스트 최상단에 항상 보인다(REQ-reflection-today-entry).
**Warning signs:** 계획서에 "checkins 배열에 합성 항목을 unshift한다"는 문구가 있으면 이 함정에 빠진 것 — 타입 체크(`tsc`)가 통과하더라도 스와이프 삭제 핸들러가 잘못된 대상을 받게 된다.

### Pitfall 2: 반복 캘린더 트리거는 콘텐츠가 고정 — 알림 페이로드로 "어느 날짜"인지 알 수 없다

**What goes wrong:** "알림 탭 시에도 동일 모달이 열리며 알림 페이로드의 날짜가 어느 DailyReflection을 여는지 결정한다"(CONTEXT.md)를 문자 그대로 구현하려고 `data: { date: ... }`를 알림 콘텐츠에 넣으려 시도하면, `repeats: true` 트리거는 등록 시점에 콘텐츠가 고정되므로 매 발화마다 그 날짜가 갱신되지 않는다(항상 등록 당시의 고정값).
**Why it happens:** iOS `UNCalendarNotificationTrigger`(방법 A)의 근본 제약 — Phase 2 RESEARCH.md가 이미 "N시간마다 개념 없음" 등 이 트리거 종류의 제약을 여러 번 문서화했으나, "콘텐츠 고정" 제약은 이번에 처음 문제가 된다.
**How to avoid:** 알림 페이로드에 날짜를 넣지 않는다. 탭 시점에 `resolveLocalDateKey(new Date())`로 "지금이 속한 로컬 날짜"를 계산해 그 날짜의 회고를 연다(모달은 항상 "오늘"에 대한 것이라는 D-03 전제와도 일치). 자정 근처(23:5x에 발화, 다음날 00:0x에 탭)의 극히 드문 엣지케이스는 체크인 흐름의 날짜 경계 처리만큼 엄격할 필요가 없다고 판단(Assumptions Log A1).
**Warning signs:** `NOTIFICATION_CONTENT.dailyReflection`에 `data` 필드를 추가하려는 계획이 있으면 이 함정 — 그 필드는 등록 시점 값으로 영원히 고정된다는 점을 계획서에 명시해야 한다.

### Pitfall 3: 라우트 상대경로 — 탭 그룹 밖으로 나가는 `router.push`는 절대경로가 필요

**What goes wrong:** `src/app/(tabs)/index/index.tsx`의 기존 코드는 같은 nested Stack 안의 이동에 상대경로(`'./settings'`, `'./[id]'`)를 쓴다. 회고 모달은 nested Stack 밖(루트 Stack)의 새 라우트이므로 같은 관용구(`'./reflection'`)를 그대로 복사하면 잘못된 경로로 풀린다.
**Why it happens:** STATE.md Blockers/Concerns가 이미 기록한 패턴 — "`(tabs)/<name>/` 폴더와 그 안의 `<name>.tsx`처럼 세그먼트 이름이 중첩되면 expo-router 절대 경로가 타입체크만 통과하고 런타임엔 실패할 수 있다"(Phase 6에서 실제 발견된 버그 3건). 이번엔 반대 방향(상대경로를 잘못 쓰는 방향)의 같은 계열 실수다.
**How to avoid:** 절대경로 `'/reflection'`을 쓴다. 계획 단계에서 실제 파일 경로(`src/app/reflection.tsx`)와 expo-router가 매칭하는 URL(`/reflection`)이 일치하는지 시뮬레이터로 직접 탭해 확인한다(타입체크 통과만으로 신뢰하지 않는다 — STATE.md가 이미 이 함정을 경고).
**Warning signs:** 계획서/코드에 `router.push('./reflection')`이 등장하면 즉시 수정 대상.

### Pitfall 4: AppState 리스너의 `'active'` 가드 누락

**What goes wrong:** `AppState.addEventListener('change', ...)`는 포그라운드 **복귀** 시에도 콜백을 호출한다. 이 가드가 없으면 앱을 열 때마다(회고 모달이 열려 있는 상태로 포그라운드 복귀) 불필요한 flush가 실행된다 — 기능적으로 치명적이지는 않지만 불필요한 쓰기와 로그 노이즈를 만든다.
**Why it happens:** `CheckinDetailScreen.tsx`가 이미 이 가드(`if (nextAppState === 'active') return;`)를 갖고 있고 주석으로 이유를 명시한 선례가 있다.
**How to avoid:** 회고 모달의 AppState 리스너도 동일 가드를 그대로 복제한다.
**Warning signs:** 리스너 콜백이 `nextAppState`를 검사하지 않고 곧장 `flush()`를 호출하면 이 함정.

### Pitfall 5: 이미 배포된 마이그레이션 블록을 사후 수정

**What goes wrong:** `daily_reflection_hour` 컬럼을 추가하면서 실수로 `if (currentDbVersion === 2) { ... }` 블록(app_settings 테이블을 처음 만드는 블록) 안의 `CREATE_APP_SETTINGS_TABLE_SQL`을 새 컬럼 포함 버전으로 바꾸고 싶은 유혹이 생길 수 있다.
**Why it happens:** "어차피 새 컬럼이 필요하니 CREATE문 자체에 넣는 게 깔끔해 보인다"는 직관.
**How to avoid:** `migrations.ts` 헤더 주석이 명시: "이전 버전 블록들은 절대 사후 수정하지 않는다 — 이미 그 버전을 통과한 기기는 변경분을 받지 못한다." 반드시 새 `if (currentDbVersion === 3) { ALTER TABLE ... }` 블록을 **추가**한다(Pattern 7).
**Warning signs:** git diff에서 기존 `if (currentDbVersion === 2)` 블록 내부 줄이 변경되어 있으면 즉시 되돌린다.

## Code Examples

### 회고 리스트 행(신규, `CheckinListRow` 재사용 아님)

```tsx
// Source: 07-UI-SPEC.md Component Contracts §2.4 — "신규 read-only 행 컴포넌트
// (CheckinListRow 재사용 아님)". 탭/스와이프 삭제 없음, 사진 있으면 40×40 썸네일.
function ReflectionCheckinRow({ checkin }: { checkin: CheckinRow }) {
  const time = formatLocalTime(checkin.timestamp_utc);
  return (
    <View style={styles.row}>
      <Text style={[timestampStyle, styles.time]}>{time}</Text>
      {checkin.note ? (
        <Text style={[typography.journalEntry, styles.notePreview]} numberOfLines={1}>
          {checkin.note}
        </Text>
      ) : null}
      {checkin.photo_path ? (
        <Image source={{ uri: checkin.photo_path }} style={styles.thumbnail} contentFit="cover" />
      ) : null}
    </View>
  );
}
```

### 프롬프트 라벨 + placeholder 없는 TextInput (07-UI-SPEC.md 확정 해법)

```tsx
// Source: 07-UI-SPEC.md Typography 절 — "캡션 라벨(System) + placeholder 없는
// journalEntry TextInput"으로 라벨/답변 폰트 분리 문제를 해결.
<Text style={[typography.helperText, { color: colors.textMuted }]}>
  {REFLECTION_COPY.promptNewPlace}
</Text>
<TextInput
  multiline
  value={newPlaceAnswer}
  onChangeText={handleChangeNewPlace}
  placeholder="" // 항상 빈 문자열 — 캡션 라벨이 그 역할을 대신한다
  style={[typography.journalEntry, { minHeight: 44, backgroundColor: colors.surface }]}
/>
```

### `useLastNotificationResponse` 배선 (루트 레이아웃)

```tsx
// Source: docs.expo.dev/versions/latest/sdk/notifications/ (WebFetch로 확인, 2026-09-02)
// src/app/_layout.tsx 안, NotificationSelfHealGate와 유사하게 SQLiteProvider 자식
// 트리에 별도 컴포넌트로 분리 권장(router.push는 SQLiteProvider 밖에서도 가능하지만,
// 이 프로젝트의 "관심사 분리" 관용구를 따르는 것이 리뷰 일관성에 유리).
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { DAILY_REFLECTION_ID } from '../notifications/scheduling';

function ReflectionNotificationDeepLinkGate() {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null); // 같은 response를 중복 처리하지 않는 가드

  useEffect(() => {
    if (!response) return;
    if (response.notification.request.identifier !== DAILY_REFLECTION_ID) return;
    const responseKey = response.notification.date + response.actionIdentifier;
    if (handledRef.current === responseKey) return;
    handledRef.current = responseKey;
    router.push('/reflection'); // 절대 경로 — Pitfall 3 참고
  }, [response]);

  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `addNotificationResponseReceivedListener`만으로 알림 탭 처리 | `useLastNotificationResponse()` 훅 병행/대체 | expo-notifications가 SDK 50대에서 훅 API를 도입(정확한 버전은 미확인 — [ASSUMED]) | 콜드스타트(앱이 완전 종료된 상태에서 알림 탭으로 실행)까지 커버 — 리스너 단독으로는 이 경로를 놓칠 수 있음 |

**Deprecated/outdated:** 이 phase와 직접 관련된 deprecated API 없음 — 관련 있는 것은 이미 04/05 RESEARCH.md가 문서화한 `expo-image-manipulator`/`expo-file-system` legacy API 회피(이 phase는 두 패키지를 직접 쓰지 않으므로 재확인만).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | 알림 탭 시점에 열어야 할 회고 날짜는 "그 순간의 `resolveLocalDateKey(new Date())`"로 판정하면 충분하다(알림 콘텐츠에 날짜를 임베드할 필요 없음) | Pitfall 2, Pattern 1 | 자정 직전 발화 후 자정 직후 탭하는 극히 드문 경우, 사용자가 기대한 "어제" 회고 대신 "오늘"(빈) 회고가 열릴 수 있음. 영향은 낮음(회고 모달은 재진입 시 항상 편집 가능하므로 데이터 유실은 아님) — 그러나 계획 단계에서 이 해석을 명시적으로 승인받아야 함(CONTEXT.md 원문이 "알림 페이로드의 날짜가 결정한다"고 표현해 다른 설계를 암시했을 수 있음) |
| A2 | `BottomSheetFlatList`(`@gorhom/bottom-sheet` v5)가 표준 `FlatList`의 `ListHeaderComponent`/`ListEmptyComponent` prop을 정상 지원한다(공식 문서가 "무시됨"으로 명시한 prop은 `scrollEventThrottle`/`decelerationRate`/`onScrollBeginDrag` 3개뿐) | Pitfall 1 | 만약 실제로 이 두 prop이 내부적으로 무시된다면, "오늘 돌아보기" 행을 헤더로 분리하는 접근이 동작하지 않아 대안(예: 시트 바깥 별도 View로 렌더 후 시트와 시각적으로만 인접시키는 방식)이 필요 — 계획/실행 단계에서 시뮬레이터로 최우선 검증 필요 |
| A3 | SQLite `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT 21`이 expo-sqlite(iOS 번들 SQLite)에서 기존 row에 기본값을 자동 백필한다 | Pattern 7 | SQLite 표준 동작이라 위험도 낮음(3.x 전반 지원, ALTER TABLE ADD COLUMN + DEFAULT는 SQLite의 매우 오래된 기능) — 그러나 이 저장소에서 처음 쓰는 조합이므로 `migrations.test.ts`에 회귀 테스트로 명시적 검증 필요 |
| A4 | expo-notifications의 `useLastNotificationResponse` 훅이 이 프로젝트의 SDK 57 버전에 존재한다 | Code Examples, Standard Stack | 공식 문서(docs.expo.dev/versions/latest)에서 확인했으나 "latest" 문서가 정확히 57.0.14와 일치하는지는 버전 고정 문서가 아니라서 완전히 동일하다고 단언 못함 — 계획 단계에서 `node_modules/expo-notifications`의 실제 타입 선언 파일에서 `useLastNotificationResponse` export를 확인 필요 |

## Open Questions

1. **`runWithSingleRetry`를 `src/checkin/checkinRepo.ts`에서 그대로 import할 것인가, 공용 위치로 옮길 것인가?**
   - What we know: 헤더 주석이 "checkins에 종속되지 않는다... Phase 5가 그대로 재사용할 수 있도록 설계됐다"고 명시했고, 실제로 Phase 5(`CheckinDetailScreen.tsx`)가 이미 도메인 경계를 넘어 import했다(같은 `checkin/` 디렉토리 안이긴 함). Phase 7은 `reflection/`이라는 **다른** 도메인에서 이 함수가 필요하다.
   - What's unclear: 이 저장소의 "도메인별 디렉토리" 관례상 `reflection/`이 `checkin/`의 내부 함수를 import하는 것이 허용되는 패턴인지, 아니면 이 시점에 `runWithSingleRetry`를 `src/db/` 또는 `src/lib/` 같은 공용 위치로 옮기는 리팩터링이 필요한지.
   - Recommendation: 이 phase 스코프에서는 **그대로 import**(가장 낮은 리스크, 기존 코드 이동 없음)를 권장하되, 계획 단계에서 사용자/설계자가 "지금 옮길지, 다음에 세 번째 소비처가 생기면 옮길지"를 명시적으로 결정하도록 플래그한다(Rule of Three 관점에서는 아직 이동 시점이 아닐 수 있음).

2. **`daily_reflections.date`에 이미 있는 `UNIQUE` 인덱스로 충분한가, 아니면 명시적 인덱스가 필요한가?**
   - What we know: `schema.ts` 주석이 "UNIQUE 제약이 이미 인덱스를 만들므로 별도 인덱스는 만들지 않는다"고 명시 — Phase 1이 이미 이 판단을 내렸다.
   - What's unclear: 없음 — 이 phase가 새로 걱정할 필요가 없는 이미 해결된 문제.
   - Recommendation: 그대로 둔다(재검토 불필요, 정보 제공 차원에서만 기록).

## Environment Availability

이 phase는 순수 코드/로컬 SQLite/기존 설치된 패키지만 사용하며 외부 서비스·CLI 도구에 의존하지 않는다.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-router | 모달 라우트 | ✓ | ~57.0.16 | — |
| expo-notifications | 알림 탭 딥링크 | ✓ | ~57.0.14 | — |
| expo-sqlite | 신규 컬럼/repo | ✓ | ~57.0.1 | — |
| iOS Simulator | 시뮬레이터 검증(모달 애니메이션/자동저장/설정 액션시트) | 프로젝트 CLAUDE.md 규칙상 사용 가능 전제 | — | — |

**Missing dependencies with no fallback:** 없음.
**Missing dependencies with fallback:** 없음.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo/ios preset, Jest 29.7.0 [VERIFIED: package.json] |
| Config file | `jest.config.js` |
| Quick run command | `NODE_OPTIONS=--experimental-sqlite npx jest src/reflection` |
| Full suite command | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |

이 저장소는 두 가지 테스트 스타일을 병행한다: (1) **repo/순수로직 단위 테스트** — 실제 `node:sqlite` 엔진(`createTestDb`) 또는 순수 함수(`@jest-environment node`)로 검증(`checkinRepo.test.ts`, `pendingDelete.ts`류), (2) **"wiring" 정적 소스 분석 테스트** — `fs.readFileSync` + `stripComments` + 정규식으로 화면 소스가 특정 함수를 참조하는지/특정 문구가 등장하지 않는지 검증(`settings-wiring.test.ts`, `checkin-detail-wiring.test.ts`). RN 컴포넌트 자체의 렌더 테스트(`@testing-library/react-native`)는 설치돼 있으나 이 저장소의 화면 파일들에는 거의 쓰이지 않는다 — 계획 단계는 이 두 기존 스타일을 따르는 것을 기본값으로 삼는다.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| REQ-reflection-base | `getReflectionByDate`/`upsertReflection` CRUD 정확성 | unit(node:sqlite) | `npx jest src/reflection/reflectionRepo.test.ts` | ❌ Wave 0 |
| REQ-reflection-base | 모달 라우트가 `presentation:'modal'`로 등록됨, 정적 지도 재사용 | wiring(정적 소스) | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ❌ Wave 0 |
| REQ-reflection-autosave | 5초 후 `onSave` 호출, `flush()` 즉시 호출, 재입력 시 타이머 리셋 | unit(jest fake timers) | `npx jest src/reflection/autosaveController.test.ts` | ❌ Wave 0 |
| REQ-reflection-autosave | AppState 리스너가 `flush()`를 호출하는 코드 참조 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ❌ Wave 0 |
| REQ-reflection-save-failure-ui | 저장 실패 시 `runWithSingleRetry` 참조, 실패 문구 상수 일치 | wiring | 위와 동일 파일 | ❌ Wave 0 |
| REQ-reflection-copy-fix | `TODAY_COPY`에 체크인 개수 보간 문구가 없음, "오늘의 흔적" 문구 정확 | wiring(기존 파일 확장) | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ (확장 필요) |
| REQ-reflection-notification | `daily_reflection_hour` 컬럼 존재/기본값 21/`resolveNotificationSettings` 반영 | unit(node:sqlite) + wiring | `npx jest src/db/migrations.test.ts src/settings/settingsRepo.test.ts` | ✅ (확장 필요) |
| REQ-reflection-notification | 설정 화면 4번째 행/액션시트 상수 | wiring(기존 파일 확장) | `npx jest src/app/__tests__/settings-wiring.test.ts` | ✅ (확장 필요) |
| REQ-reflection-today-entry | "오늘 돌아보기" 헤더 행이 0건이어도 렌더됨 | wiring | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ (확장 필요) |
| REQ-past-reflection-edit | `PastDateScreen.tsx`가 회고 프롬프트/저장 함수를 참조 | wiring(기존 파일 확장) | `npx jest src/app/__tests__/calendar-wiring.test.ts` | ✅ (확장 필요) |

### Sampling Rate

- **Per task commit:** 해당 태스크가 건드린 파일의 테스트만(`npx jest <path>`)
- **Per wave merge:** `npm test`(전체 스위트)
- **Phase gate:** 전체 스위트 green + `checkpoint:human-verify`(시뮬레이터로 Claude가 먼저 확인 후, 실기기 알림 자연 발화만 사용자에게 위임) 통과 후 `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/reflection/reflectionRepo.test.ts` — REQ-reflection-base 커버 (신규 디렉토리/테스트 프레임워크 설정 불필요, 기존 jest 설정이 `src/**/*.test.ts`를 이미 매칭)
- [ ] `src/reflection/autosaveController.test.ts` — REQ-reflection-autosave 커버(jest fake timers 사용, 이 저장소에 fake timers 사용 선례는 없으나 Jest 29 표준 기능이라 추가 설정 불필요)
- [ ] `src/app/__tests__/reflection-wiring.test.ts` — 신규 wiring 테스트 파일(기존 `settings-wiring.test.ts` 패턴 복제)
- [ ] `src/db/migrations.test.ts`에 daily_reflection_hour 컬럼 테스트 추가(신규 파일 아님, 기존 파일 확장)
- [ ] `src/settings/settingsRepo.test.ts`에 dailyReflectionHour 읽기/쓰기 테스트 추가(기존 파일 확장)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | 1단계는 단일 사용자, 인증 없음(PROJECT.md Out of Scope) |
| V3 Session Management | no | 해당 없음 |
| V4 Access Control | no | 해당 없음 |
| V5 Input Validation | yes | 모든 SQLite 쓰기는 `?` 파라미터 바인딩만 사용(문자열 보간 금지) — 이 저장소 전역 규약, `reflectionRepo.ts`도 동일하게 따름. 자유 텍스트(회고 답변)는 렌더링 시 `<Text>`/`<TextInput>`으로만 표시되어 HTML/스크립트 인젝션 표면이 없음 |
| V6 Cryptography | no | 새 암호화 요구 없음. `expo-crypto`는 UUID 생성 목적만 |

### Known Threat Patterns for React Native/Expo 로컬 우선 앱

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| SQL 인젝션(회고 자유 텍스트를 쿼리에 직접 삽입) | Tampering | `db.runAsync(sql, ...params)` 파라미터 바인딩만 사용, `migrations.ts`의 `PRAGMA user_version` 한 줄만 예외적으로 보간이 허용됨(이미 격리된 내부 정수 변수) — reflectionRepo.ts는 이 예외에 해당하지 않으므로 보간 전면 금지 |
| 알림 페이로드를 통한 딥링크 조작(악성 URL 삽입) | Tampering/Elevation | 이 phase는 알림 콘텐츠에 사용자 제어 가능한 URL/데이터를 넣지 않는다(Pitfall 2) — 탭 시 이동할 라우트는 하드코딩된 `/reflection` 문자열 하나뿐이라 인젝션 표면 자체가 없음 |
| 알림 잠금화면 노출로 인한 정보 유출 | Information Disclosure | 기존 `NOTIFICATION_CONTENT.dailyReflection`이 이미 "오늘 돌아보기"라는 고정 제목만 사용(회고 내용 미노출) — Phase 2가 이미 이 원칙을 확립했고 이 phase는 변경하지 않는다 |

## Sources

### Primary (HIGH confidence)

- 저장소 코드베이스 직접 조회(Read/Bash/Grep) — `src/db/schema.ts`, `src/db/migrations.ts`, `src/db/migrations.test.ts`, `src/checkin/checkinRepo.ts`, `src/checkin/checkinRepo.test.ts`, `src/checkin/CheckinDetailScreen.tsx`, `src/today/TodayBottomSheet.tsx`, `src/today/CheckinListRow.tsx`, `src/today/pendingDelete.ts`, `src/today/content.ts`, `src/calendar/PastDateScreen.tsx`, `src/settings/SettingsScreen.tsx`, `src/settings/settingsRepo.ts`, `src/settings/config.ts`, `src/settings/content.ts`, `src/notifications/scheduling.ts`, `src/notifications/registry.ts`, `src/notifications/config.ts`, `src/notifications/content.ts`, `src/notifications/deps.ts`, `src/notifications/testing/fakeNotifications.ts`, `src/checkin/deps.ts`, `src/theme/tokens.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index/_layout.tsx`, `src/app/(tabs)/calendar/_layout.tsx`, `src/app/(tabs)/index/index.tsx`, `src/app/__tests__/settings-wiring.test.ts`, `package.json`, `jest.config.js`, `DESIGN.md`
- [Modals - Expo Documentation](https://docs.expo.dev/router/advanced/modals/) — `presentation: 'modal'` 루트 Stack 등록 패턴, iOS/Android 동작 차이(WebFetch로 원문 확인)
- [Notifications - Expo Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) — `useLastNotificationResponse()`/`addNotificationResponseReceivedListener()` 시그니처와 예제 코드(WebFetch로 원문 확인)

### Secondary (MEDIUM confidence)

- [BottomSheetFlatList | React Native Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/components/bottomsheetflatlist) — `FlatListProps` 상속 및 무시되는 prop 목록(WebFetch, "ListHeaderComponent 지원 여부"는 명시적 언급 없이 상속 관계로 추론 — Assumptions Log A2)
- [Modal on top of Tab Navigator · expo/router · Discussion #388](https://github.com/expo/router/discussions/388) — 커뮤니티 확인(WebSearch 결과 요약, 공식 문서로 교차 검증됨)

### Tertiary (LOW confidence)

- [Deep Linking With Expo Push Notifications](https://pushbase.dev/blog/deep-linking-with-expo-push-notifications) — 비공식 블로그, 공식 문서(`docs.expo.dev`)로 교차 검증된 부분만 채택하고 그 외 세부사항은 인용하지 않음

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 패키지 없음, 전부 `package.json`에 이미 설치된 버전을 직접 확인
- Architecture: HIGH(기존 재사용 패턴) / MEDIUM(모달 라우팅, 알림 딥링크, 디바운스 컨트롤러 — 이 저장소에 선례 없는 신규 설계, 공식 문서로는 검증했으나 이 프로젝트 코드베이스 안에서 실제 동작 검증은 계획/실행 단계 몫)
- Pitfalls: HIGH — 대부분 이 저장소의 기존 STATE.md/코드 주석이 이미 문서화한 실제 발견 사례에서 도출

**Research date:** 2026-09-02
**Valid until:** 2026-10-02(안정적 스택, 30일 — 단, expo-notifications `useLastNotificationResponse` 관련 부분은 SDK 마이너 업데이트 시 재확인 권장)
