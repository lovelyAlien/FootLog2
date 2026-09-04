---
phase: 7
slug: day-end-reflection
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-02
---

# Phase 7 — UI Design Contract: Day-end Reflection

> 하루 마무리 회고 전체화면 모달, 오늘 뷰의 "오늘 돌아보기" 진입 행, 과거 날짜 뷰(Phase 6
> T10)의 인라인 회고 편집 확장, 설정 화면의 회고 알림 시각 선택(신규 스코프 D-05)에 대한
> 시각/인터랙션 계약. `07-CONTEXT.md`(D-01~D-05), `docs/designs/day-end-reflection-map.md`
> (APPROVED, "NO UNRESOLVED DECISIONS"), `REQUIREMENTS.md` §Day-end reflection, `DESIGN.md`를
> 근거로 gsd-ui-researcher가 생성. gsd-ui-checker가 검증한다.

이 프로젝트는 **네이티브 iOS/Expo 앱**이며 웹이 아니다 — shadcn/Tailwind/CSS 디자인
시스템이 없다. 단일 출처는 저장소 루트의 `DESIGN.md`이며, `src/theme/tokens.ts`에 그대로
전사되어 있다. `CLAUDE.md`: "Always read DESIGN.md before making any visual or UI
decisions... Do not deviate without explicit user approval." 이 문서는 새 토큰 체계를
발명하지 않는다 — Phase 7의 신규 화면/컴포넌트에 기존 토큰이 어떻게 적용되는지 선언하고,
`DESIGN.md`가 아직 이름 붙이지 않은 소수의 신규 값(크기/문구)만 명시하며, 그 값들은 모두
이미 승인된 canonical 문서에서 도출한다.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (수제작 RN `View`/`StyleSheet` + `src/theme/tokens.ts`, shadcn 아님 — 이 Expo/React Native 프로젝트에는 shadcn gate가 적용되지 않는다) |
| Preset | not applicable |
| Component library | none (커스텀 컴포넌트만 사용) |
| Icon library | `expo-symbols` (`SymbolView`, SF Symbols) — Phase 3~6에서 이미 전역 사용 중 |
| Font | System(SF Pro, UI 크롬/라벨) + `ui-monospace`(SF Mono, 체크인 시각 — 리스트 재사용) + Newsreader(`journalEntry`, 회고 답변 텍스트 전용 — 이 phase의 핵심 타이포 소비처) |

---

## Spacing Scale

기존 프로젝트 스케일(`src/theme/tokens.ts` `spacing`, 이미 잠김 — 변경 없이 재사용):

| Token | Value | Phase 7에서의 용도 |
|-------|-------|-------------------|
| 2xs | 4px | 사진 썸네일과 텍스트 사이 미세 간격 |
| xs | 8px | 프롬프트 라벨↔입력칸 간격, 저장 실패 문구↔재시도 버튼 간격 |
| sm | 12px | 리스트 행 내부 세로 패딩(재사용) |
| md | 16px | 화면/모달 좌우 패딩, 입력칸 내부 패딩 |
| lg | 24px | 섹션 간 간격(지도→리스트, 리스트→프롬프트1), 화면 상단 패딩 |
| xl | 32px | 프롬프트1→프롬프트2 사이 간격(두 질문을 시각적으로 분리) |
| 2xl | 48px | — (이 phase에서 사용 안 함) |
| 3xl | 64px | — (이 phase에서 사용 안 함) |

**Exceptions (전부 canonical 문서에서 도출, 새로 발명한 값 아님):**

| Value | Element | Source |
|-------|---------|--------|
| 40×40px | 회고 모달 체크인 리스트 행의 사진 썸네일(있을 때만, `radius.md` 모서리) | `day-end-reflection-map.md` Premise #9 — **이 화면에만 적용, Today 뷰/과거 날짜 뷰 리스트는 대상 아님(썸네일 없음 그대로 유지)** |
| 44×44pt | 모달 닫기(✕) 버튼 히트 영역(시각 아이콘은 작게, 터치 영역만 44pt — `SettingsScreen.tsx`의 `SMALL_ICON_HIT_SLOP` 관용구 재사용) | `REQUIREMENTS.md` REQ-accessibility-baseline 사전 적용(다른 phase들과 동일하게 나중에 리트로핏하지 않는다) |
| 44pt | "오늘 돌아보기" 행 최소 높이(`LIST_ROW_MIN_HEIGHT` 재사용, `src/today/CheckinListRow.tsx`) | 기존 리스트 행과 시각적 리듬 일치 |
| 44pt | 회고 모달/과거 날짜 뷰 프롬프트1(`newPlaceAnswer`) 입력칸 최소 높이 — 짧은 답변용, 체크인 메모 입력칸(`noteInput`, 68pt)보다 낮춤 | 이 문서 신규 지정 — 프롬프트1은 "새로 가본 곳이 있었나요?"라는 짧은 답변을 기대하므로 자유 회고보다 작은 높이가 적절하다고 판단(아래 Component Contracts 참고) |
| 120pt | 프롬프트2(`freeReflection`, "오늘에 대해") 입력칸 최소 높이 — 체크인 메모(68pt)보다 큼 | 이 문서 신규 지정 — Data Model상 길이/형식 제약이 없는 자유 회고이므로 체크인 메모보다 더 넓은 쓰기 공간을 기본 제공(원본 문서에 숫자 지정 없음, 이 phase의 재량 판단) |

---

## Typography

기존 프로젝트 롤(`src/theme/tokens.ts` `typography`, 이미 잠김) 그대로 재사용. **이
phase는 새 폰트 크기를 도입하지 않는다** — 기존 4개 크기(13/15/16/22)만 사용. 폰트 웨이트도
기존 3개(400/500/600)만 사용(06-UI-SPEC.md가 이미 이 3-weight 예외를 프로젝트 전역
사실로 문서화했으므로 이 phase에서 다시 논쟁하지 않는다 — 새 weight를 도입하지 않는 한
동일 근거가 적용된다).

| Role | Size | Weight | Line Height | 이 phase에서의 용도 |
|------|------|--------|-------------|----------------------|
| Display (`screenTitle`, 재사용) | 22px | 600 | 1.2 | 이 phase에서는 **사용하지 않음** — 모달은 타이틀이 없다(D-03) |
| Body (`placeName`, 재사용) | 16px | 500 | 1.2 | "오늘 돌아보기" 행 라벨(Today 뷰 리스트) |
| Body-muted (`placeName` 변형, 재사용) | 16px | 400 | 1.2 | 설정 화면 신규 행("회고 알림 시각")의 trailing 값 텍스트 — 기존 `rowValue` 스타일 그대로 |
| Timestamp (`timestamp`, 재사용 불변) | 15px | 500 | tabular-nums | 회고 모달 리스트 행의 시각(모노스페이스) — `CheckinListRow`와 동일 |
| Journal (`journalEntry`, 재사용 불변) | 15px | 400 | 1.5 | **회고 답변 텍스트 전용**(두 프롬프트 입력칸에 입력하는 텍스트) — "내가 직접 쓴 것" 신호. UI 라벨/문구에는 절대 쓰지 않는다(DESIGN.md 3계층 원칙) |
| Label (`helperText`, 재사용) | 13px | 400 | 1.3 | 프롬프트 라벨("새로 가본 곳이 있었나요?" / "오늘에 대해"), "오늘의 흔적" 섹션 헤더, 리스트 empty state, 저장 실패 인라인 문구, 설정 신규 행 라벨 |

**프롬프트 라벨 vs 답변 텍스트 렌더링 방식 — 이 문서의 명시적 해결(원본 문서의 잠재적
모호함 해소, 계획/실행 단계가 재해석하지 않도록 여기서 확정):**
`day-end-reflection-map.md`는 "프롬프트 라벨은 시스템 폰트, 답변은 세리프 이탤릭"이라고
말하면서 동시에 "첫 칸 placeholder는 프롬프트 문구 자체"라고도 말한다. React Native의
`TextInput`은 `placeholder`와 실제 입력값에 서로 다른 `fontFamily`를 줄 수 없다(`style`
prop이 placeholder와 값 모두에 적용되고, `placeholderTextColor`만 별도 지정 가능) — 즉
"placeholder는 시스템 폰트, 입력값은 세리프"를 기술적으로 동시에 만족시킬 방법이 없다.
**해결:** 각 프롬프트 위에 **항상 보이는 캡션 라벨**(System, `helperText` 롤,
`colors.textMuted`)을 별도 `Text`로 렌더하고, 그 아래 `TextInput`은 `placeholder`를
비워두며(빈 문자열) 오직 `journalEntry` 스타일로만 렌더한다. 캡션 라벨은 사용자가 타이핑을
시작해도 사라지지 않는다(placeholder 방식과 달리) — 특히 길이 제약 없는 자유 회고(프롬프트2)
칸에서 "지금 뭘 답하고 있었는지" 맥락을 잃지 않도록 하는 부가 이점이 있다. 라벨 문구는 그대로
원본 프롬프트 문구를 쓴다(Copywriting Contract 참고).

---

## Color

기존 프로젝트 팔레트(`src/theme/tokens.ts` `colors`, 이미 잠김). **이 phase는 `colors.accent`를
새로 쓰지 않는다** — `DESIGN.md`의 accent 승인 용도 2개(캘린더 "오늘" 밑줄, 스크러버 선택
표시)는 전부 캘린더 탭 전용이며 이 phase의 예산에 포함되지 않는다. 새 accent 사용처를
추가하면 checker가 즉시 BLOCK해야 한다.

| Role | Value | Phase 7에서의 용도 |
|------|-------|---------------------|
| Dominant (60%) | `#F4F1EA` (`colors.background`) | 회고 모달 배경, 과거 날짜 뷰 배경(재사용, 변경 없음) |
| Secondary (30%) | `#FBFAF6` (`colors.surface`) | 회고 리스트 행 배경(재사용), 프롬프트 입력칸 배경 |
| Accent (10%) | 이 phase에서 **사용 안 함** | — (DESIGN.md의 2개 승인 용도는 캘린더 탭 전용, 이 phase는 대상 아님) |
| Accent-soft (신규 사용처, 그러나 신규 토큰 아님) | `#D8DDC9` (`colors.accentSoft`) | "오늘 돌아보기" 행의 **고정** 배경색 — Premise #5. accent 자체는 아니므로 accent 2-용도 예산과 무관하며, `DESIGN.md`가 accentSoft에는 용도 제한 목록을 두지 않았다(accent만 제한 대상) |
| Destructive | 이 phase에서 **사용 안 함** | 회고에는 삭제 액션이 없다(자동저장 + 편집만) |
| Pin (`colors.pin`/`colors.pinSoft`, 재사용 불변) | `#B85C38` / `#DDC0AC` | 회고 모달의 정적 지도에 렌더되는 체크인 핀 — Today 뷰 지도를 그대로 재사용하는 것이라 이 phase가 새로 도입하는 사용처가 아니다 |

**"오늘 돌아보기" 행의 accentSoft 배경 — 상태 신호 아님(D-02 명시):** 이 배경색은 그날
회고를 이미 작성했는지 여부와 **무관하게 항상 동일**하다. 완료 여부를 색으로 구분하지
않는다 — 체크마크/뱃지/색상 변화 일체 없음(D-02). accentSoft는 여기서 "이 행은 다른 행과
종류가 다르다"는 고정 스타일일 뿐, "완료됨"이라는 진행률 신호가 아니다.

**저장 실패 문구 — semantic 색상 금지 원칙 그대로 적용:** "저장하지 못했어요" 인라인
문구와 "다시 시도" 링크는 `colors.textMuted`만 사용한다. 빨간색·경고 아이콘 없음(D-01,
`DESIGN.md` "Semantic 색상 없음").

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| "오늘 돌아보기" 행(Today 뷰 리스트 최상단, 진입점) | `"오늘 돌아보기"` — 완료 여부와 무관하게 항상 동일한 라벨(체크마크/숫자 접미사 없음, D-02) |
| 모달 닫기 버튼 | 텍스트 없음, 아이콘만(SF Symbol `xmark`, 좌상단, 44×44pt 히트 영역). accessibility label: `"닫기"` |
| 모달 헤더 타이틀 | 없음(D-03) — 이 모달은 항상 "오늘"에 대한 것이라 날짜 타이틀이 불필요 |
| "오늘의 흔적" 섹션 헤더(모달 내부, 체크인 리스트 위) | `"오늘의 흔적"` (REQ-reflection-copy-fix) — 개수 표기 없음 |
| 리스트 empty state(체크인 0건일 때) | `"아직 기록이 없어요"` — Today 뷰의 `TODAY_COPY.emptyState`(`"아직 기록이 없어요 · 체크인하면 지도가 채워져요"`)와 의도적으로 다르다. 이 화면은 체크인 유도 CTA가 목적이 아니라 회고이므로 "체크인하면 채워져요" 꼬리를 재사용하지 않는다(06-UI-SPEC.md의 과거 날짜 뷰 empty state 차별화와 동일 원칙) |
| 프롬프트1 라벨(캡션, 항상 노출) | `"새로 가본 곳이 있었나요?"` (고정 프롬프트, 로테이션 없음) |
| 프롬프트2 라벨(캡션, 항상 노출) | `"오늘에 대해"` — 질문형이 아닌 짧은 초대 문구 |
| 저장 실패 인라인 문구 | `"저장하지 못했어요"` — 체크인/설정 화면과 동일 문구·톤 재사용(D-01, `CHECKIN_COPY.saveFailedHeadline`/`SETTINGS_COPY.saveFailed`와 어휘 통일) |
| 저장 실패 재시도 CTA | `"다시 시도"` (`SETTINGS_COPY.retryCta`와 동일 문구 재사용) |
| 저장 성공 시 | 아무 문구도 표시하지 않음(조용한 자동저장, Premise #7) |
| Primary CTA | 이 phase에 전통적 의미의 "주요 버튼"은 없다 — 진입은 "오늘 돌아보기" 행 탭(위), 종료는 ✕ 또는 스와이프이며 명시적 "저장" 버튼은 존재하지 않는다(자동저장 원칙, Premise #7) |
| 설정 — 신규 행: 회고 알림 시각(D-05) | 라벨: `"회고 알림 시각"`. Trailing 값: 아래 후보 중 선택된 하나(`"19시"` / `"20시"` / `"21시"` / `"22시"` / `"23시"`). 탭 → `ActionSheetIOS` 5-옵션 피커(+취소) — 기존 "알림 빈도" 행과 동일한 인터랙션 패턴(신규 네이티브 의존성 없음, D-05) |
| 설정 — 회고 알림 시각 액션시트 후보 목록 | `["19시", "20시", "21시", "22시", "23시", "취소"]` — 저녁 시간대 중심 5개(CONTEXT.md D-05 재량 범위 내 이 문서의 확정). **21시가 반드시 포함**되어야 한다(기존 하드코딩 기본값이자 창업자 본인의 현재 설정, `PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour`) |
| destructive confirmation | 해당 없음 — 이 phase에 삭제 액션이 없다 |

---

## Registry Safety

해당 없음 — React Native/Expo 프로젝트, shadcn/컴포넌트 레지스트리 도구 없음. `components.json`
없음(이번 세션 확인). 모든 컴포넌트는 `src/theme/tokens.ts` 기반 수제작.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| n/a | n/a | not applicable (no shadcn) |

---

## Component Contracts

### 1. "오늘 돌아보기" 행 (`src/today/`, `TodayBottomSheet.tsx`의 리스트 데이터에 추가)

**배치:** 오늘 뷰 바텀시트 체크인 리스트의 **첫 번째 항목**으로 항상 렌더(단순 배열 prepend
— `stickyHeaderIndices` 등 스크롤 중 고정 로직은 도입하지 않는다. Premise #5의 "새로 만드는
코드 없음, 기존 리스트 렌더링 로직에 항목 하나 추가"를 문자 그대로 따른 해석). 체크인이
0건이어도 항상 보임(REQ-reflection-today-entry).

**시각:** `LIST_ROW_MIN_HEIGHT`(44pt) 이상, `colors.accentSoft` 고정 배경(완료 여부 무관,
D-02), 라벨 `"오늘 돌아보기"` (`placeName` 롤, `colors.textPrimary`), 좌우 패딩
`spacing.lg`. **chevron/화살표 등 탭 가능함을 암시하는 시각 요소 없음** —
`CheckinListRow`가 이미 세운 선례(탭 가능함은 iOS 리스트 관례로 암묵적)와 동일 원칙.

**인터랙션:** 탭 → 오늘 회고 모달 오픈. 스와이프 삭제 없음(이 행은 체크인이 아니다).

### 2. 회고 모달 (신규 화면, 정확한 라우트 구조는 연구/계획 단계 결정)

**프레젠테이션:** `expo-router` 모달 프레젠테이션(`presentation: 'modal'`) — 아래→위
슬라이드로 탭바까지 통째로 덮음(`DESIGN.md` §Layout 네비게이션 셸 명시 확정 문구, push
아님). 진입/퇴장 duration은 네이티브 iOS 모달 기본 전환을 그대로 사용 — 이 프로젝트의
`motion` 토큰(`bottomSheetSnapMs` 220 / `confirmPinDropMs` 160 / `saveStateCrossfadeMs`
180)은 모달 전환용이 아니므로 새 커스텀 duration을 발명하지 않고 시스템 기본값에 위임한다
(minimal-functional 모션 원칙과 일치 — 장식적 커스텀 트랜지션 없음). 알림 탭 시에도 동일
모달이 열리며 알림 페이로드의 날짜가 어느 `DailyReflection`을 여는지 결정한다.

**레이아웃(위→아래, 스크롤 가능한 단일 컬럼):**
1. 헤더: ✕ 닫기 버튼만(좌상단, 44×44pt 히트 영역, `SymbolView name="xmark"`,
   `tintColor={colors.textPrimary}`). 타이틀 없음(D-03).
2. 정적 지도(Today 뷰 지도+궤적선 재사용, **비인터랙티브** — `scrollEnabled={false}`,
   플로팅 체크인 버튼/3단 바텀시트 없음, Premise #2). 궤적선(T14)이 아직 없으면 핀만
   표시(graceful degradation, 이미 원본 문서에서 확정).
3. `"오늘의 흔적"` 섹션 헤더(`helperText` 롤, `colors.textMuted`).
4. 체크인 리스트 — **신규 read-only 행 컴포넌트**(`CheckinListRow` 재사용 아님: 이 리스트는
   탭 진입도 스와이프 삭제도 없어야 하고(Premise #2), 사진 썸네일이 추가로 필요하다
   (Premise #9) — 기존 컴포넌트의 계약과 정면으로 다르므로 새 컴포넌트가 필요하다). 각 행:
   시각(`timestamp` 롤, 모노스페이스) + 메모 미리보기(`journalEntry` 롤, 1줄 말줄임, 있을
   때만) + 사진 있으면 우측 40×40 정사각 썸네일(`radius.md` 모서리, 없으면 텍스트만 —
   Premise #9, **이 리스트 전용, Today/과거 날짜 뷰 리스트에는 적용 금지**). 0건이면
   `"아직 기록이 없어요"`.
5. 프롬프트1: 캡션 라벨 `"새로 가본 곳이 있었나요?"`(`helperText` 롤) + 아래 `TextInput`
   (멀티라인, `journalEntry` 롤, placeholder 없음, `minHeight: 44`).
6. 프롬프트2: 캡션 라벨 `"오늘에 대해"`(`helperText` 롤) + 아래 `TextInput`(멀티라인,
   `journalEntry` 롤, placeholder 없음, `minHeight: 120`).
7. (조건부) 저장 실패 시에만: 폼 최하단에 인라인 문구 `"저장하지 못했어요"` +
   `"다시 시도"` 텍스트 링크(둘 다 `helperText` 롤 + `colors.textMuted`,
   `SettingsScreen.tsx`의 `errorContainer`/`errorText`/`retryText` 패턴을 그대로 재사용 —
   `CheckinActionCard`의 SAVE_FAILED 상태처럼 화면 전체를 차지하는 굵은 pill 버튼이
   아니라 "작고 담담한" 처리를 명시한 Premise #7의 표현에 맞춘 선택). 성공 시엔 아무
   표시도 없음.

**자동저장 배선(D-01/REQ-reflection-autosave, 시각 요소 아님이지만 실패 UI 트리거 조건이라
명시):** 5초 디바운스 + `AppState` 백그라운드 전환 강제 flush + 모달 unmount(✕/스와이프)
강제 flush, 전부 동일한 단일 저장 함수 호출 → 그 함수가 실패하면 자동 재시도 1회 → 그래도
실패하면 위 7번 문구 노출. 두 프롬프트는 하나의 `DailyReflection` 레코드로 함께
저장되므로 실패 UI도 필드별이 아니라 폼 전체 하단에 1세트만(D-01).

### 3. 과거 날짜 뷰 인라인 회고 확장 (Phase 6 `PastDateScreen.tsx`, D-04)

**배치:** 기존 화면(지도+시트, 체크인 리스트 — 06-UI-SPEC.md Component 2 그대로 유지)의
**리스트 아래**에 프롬프트 2칸을 인라인 추가. 별도 모달 아님(D-04) — 같은 화면 안에
스크롤로 이어진다.

**시각/문구:** 위 회고 모달의 프롬프트1/2와 완전히 동일한 라벨·타이포·입력칸 스펙(캡션
라벨 + `journalEntry` TextInput, minHeight 44/120)을 그대로 재사용 — 새 스타일을
발명하지 않는다. **차이점:** "오늘의 흔적" 섹션 헤더나 사진 썸네일 40×40은 이 화면에
적용하지 않는다(D-04 — 기존 06-UI-SPEC.md의 "과거 날짜 뷰 리스트엔 썸네일 없음" 결정이
이 phase로도 그대로 유지되며, 이 화면의 리스트는 이미 Phase 6이 만든 것을 그대로 쓴다).
저장 실패 UI(7번 항목)도 동일 패턴 재사용.

**탭바:** 이 화면은 이미 06-UI-SPEC.md에서 탭바를 숨기는 화면으로 확정되어 있다(변경
없음) — 이 phase가 그 결정을 건드리지 않는다.

### 4. 설정 화면 — 신규 4번째 행 (`src/settings/SettingsScreen.tsx`, D-05)

**06-UI-SPEC.md는 "정확히 3개 행"을 확정했었다(D-02) — 이 phase가 그 예산을 4개로
명시적으로 확장한다(D-05, downstream 필수 반영).** 새 행은 `"알림"` 섹션 안, 기존
"하루 마무리 알림" 토글 행 **바로 아래**에 추가한다(같은 섹션, 같은 배경/구분선 스타일
`06-UI-SPEC.md`의 `section`/`row`/`divider` 스타일 재사용):

- 라벨: `"회고 알림 시각"` (`placeName` 롤, `colors.textPrimary`)
- Trailing: 현재 선택된 시각 문자열(`"21시"` 등, `placeName` 롤 400 weight +
  `colors.textMuted` — 기존 `rowValue` 스타일 그대로) + `chevron.right`
  (`colors.textMuted`) — 탭 가능함을 나타내는 기존 "알림 빈도" 행과 동일한 시각 관례
- 인터랙션: 탭 → `ActionSheetIOS` 5-옵션 피커(위 Copywriting Contract 후보 목록) → 선택
  시 기존 `persist()` 함수와 동일한 순서(네이티브 알림 재구성 성공 확인 → SQLite 업서트
  → 화면 state 반영)를 그대로 따른다 — 이 문서가 새 쓰기 경로를 만들지 않는다
- **활성화 상태:** 토글("하루 마무리 알림")이 꺼져 있어도 이 행은 항상 동일하게
  인터랙티브하다 — 별도 disabled/dimmed 시각 상태를 도입하지 않는다(이 앱에 아직
  "비활성 행" 토큰이 없고, 시각을 미리 정해두면 토글을 다시 켰을 때 그 값이 그대로
  적용되는 게 자연스러운 동작이므로 굳이 흐리게 표시할 이유가 없다고 판단 — 새 시각
  상태를 발명하지 않는 것이 이 문서의 원칙과 일치)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
