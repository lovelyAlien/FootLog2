# Phase 7: Day-end Reflection - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

전체화면 하루 마무리 회고 모달(오늘 뷰 지도+궤적선 정적 재사용, 프롬프트 2칸, `daily_reflections`
레코드로 조용한 자동저장) 조립 + 오늘 뷰 바텀시트 리스트 최상단 "오늘 돌아보기" 상시 진입점 배선 +
과거 날짜 뷰(Phase 6의 읽기전용 화면)에 편집 가능한 회고 프롬프트 2칸 추가. 이 phase가 시작하는
시점에 이미 상당한 인프라가 선행 구현되어 있다는 점이 중요한 특징이다:

- `daily_reflections` SQLite 테이블은 Phase 1(01-03)에서 이미 생성됨(`src/db/schema.ts`
  `CREATE_DAILY_REFLECTIONS_TABLE_SQL`, `DailyReflectionRow` 타입 포함).
- 알림 스케줄링(반복 캘린더 트리거, `DAILY_REFLECTION_ID`, hour=21 파라미터화)과 자가진단
  레지스트리 커버리지는 Phase 2에서 이미 구현됨(`src/notifications/scheduling.ts`,
  `src/notifications/registry.ts`).
- 설정 화면의 "하루 마무리 알림" 켜기/끄기 토글은 Phase 6에서 이미 배선·저장까지 완료됨
  (`src/settings/SettingsScreen.tsx`, `settingsRepo.ts`).

즉 이 phase의 실질 작업은 **①회고 모달 UI 자체(지도/프롬프트/자동저장/실패UI), ②오늘 뷰 진입점
행, ③과거 날짜 뷰 확장, ④알림 시각 선택 UI(이번 논의로 신규 추가된 범위, 아래 D-05 참고)**로
좁혀진다 — 새 DB 테이블이나 새 알림 스케줄링 아키텍처를 만드는 phase가 아니다.

**Phase 7이 만들지 않는 것:**
- 하루 마무리 알림 자체의 스케줄링 로직(반복 트리거 등록/취소/자가진단) — Phase 2가 이미
  완성. 이 phase는 알림이 열어야 할 화면(모달)과 토글 UI를 잠그는 실제 기능을 연결할 뿐이다.
- 캘린더 탭 자체(월 그리드/스크러버) — Phase 6에서 완료. 과거 날짜 뷰 화면(read-only 지도+시트)
  자체도 Phase 6이 이미 만들었고, 이 phase는 그 화면에 회고 입력칸 2개를 추가하는 증분 작업이다.
- AI 요약, 프롬프트 로테이션, 체크인별 개별 회고, 여러 날 지도 겹침, 패턴 감지 — 원본 문서
  (`day-end-reflection-map.md`)가 명시적으로 배제, 이번 논의도 재확인만 함.
- "전체 데이터 삭제" 등 2단계 설정 항목 — PROJECT.md Out of Scope 참고, 무관.

</domain>

<decisions>
## Implementation Decisions

### 회고 모달 저장 실패 UI
- **D-01:** 저장 실패 안내는 **폼 하단에 공유 인라인 문구 1개**로 처리한다(필드별 각각 아님).
  두 프롬프트(`newPlaceAnswer`, `freeReflection`)가 하나의 `DailyReflection` 레코드로 함께
  저장되므로, 저장도 하나의 함수가 두 필드를 한 번에 쓰는 단일 트랜잭션이다 — 실패 UI도 그
  단위와 일치시켜 폼 전체 아래에 "저장하지 못했어요" + "다시 시도" 버튼 1세트만 둔다(체크인/
  상세화면과 동일한 문구·톤, 빨간색·경고아이콘 없음). 성공 시엔 여전히 아무 표시도 하지 않는다
  (원본 문서 Premise #7).

### "오늘 돌아보기" 행의 완료 상태 표시
- **D-02:** 그날 이미 회고를 작성했더라도 "오늘 돌아보기" 행을 **시각적으로 구분하지 않는다**
  (체크마크, 뱃지, 색상 변화 등 일체 없음). PROJECT.md의 "진행률/완료 수치 UI 노출 금지"
  CRITICAL 원칙이 숫자뿐 아니라 "완료 여부"를 신호하는 모든 시각적 장치에도 같은 정신으로
  적용된다고 판단 — 재진입해서 이미 쓴 답변을 확인하는 것만으로 충분하고 별도 완료 신호는
  불필요한 게이미피케이션 신호가 될 위험이 있다. 원본 문서의 accent-soft 배경 구분(다른 리스트
  행과의 구분)은 유지하되, 그 배경은 "이 행은 항상 다르다"는 고정 스타일이지 "오늘 완료했다"는
  상태 신호가 아니다.

### 회고 모달 헤더
- **D-03:** 모달 상단은 **닫기(✕) 버튼만** 두고 날짜 타이틀이나 별도 헤더 텍스트를 넣지 않는다
  — 이 모달은 항상 "오늘"에 대한 것이라 날짜가 암묵적으로 명확하고, 추가 chrome 없이 미니멀을
  유지한다(DESIGN.md decoration level: minimal). 과거 날짜 회고 편집(D-04, T10 화면 내부)은
  이미 그 화면 자체가 날짜를 표시하고 있으므로 이 결정과 무관하다.

### 과거 날짜 회고 편집 UI (REQ-past-reflection-edit)
- **D-04 (원본 문서 확정 사항, 재확인):** 별도 모달이 아니라 **기존 과거 날짜 뷰(T10) 화면에
  회고 프롬프트 2칸을 인라인으로 추가**한다 — 오늘의 전체화면 모달과 다른 프레젠테이션.
  자동저장/디바운스/실패 UI(D-01)는 오늘 화면과 동일 로직을 그대로 재사용한다. 사진 썸네일
  40×40 리스트(원본 문서 Premise #9)는 **이 화면에는 적용하지 않는다** — `calendar-date-scrubber.md`
  기존 결정(과거 날짜 뷰 리스트엔 썸네일 없음)이 이 phase로도 그대로 유지됨.

### 회고 알림 시각 선택 기능 (신규 스코프 — REQUIREMENTS.md 갱신 필요)
- **D-05 (스코프 확장, downstream 필수 반영):** 원본 문서(`day-end-reflection-map.md` Premise
  #4)와 현재 REQUIREMENTS.md의 REQ-reflection-notification은 "시각 자체는 하드코딩(21시),
  사용자가 조정 가능한 건 켜기/끄기 토글뿐 — 시각 변경 UI는 스코프 밖"으로 명시했었다. 이번
  논의에서 창업자가 이 결정을 뒤집기로 확정 — **설정 화면에 회고 알림 시각을 직접 선택하는 UI를
  이번 phase에 추가한다.** 아래는 이 확장의 구체 결정:
  - 현재 설정 화면(`SettingsScreen.tsx`)은 정확히 3항목(알림 빈도/하루마무리 토글/버전)뿐이며
    `dailyReflectionHour`는 DB 컬럼이 없고 항상 `PHASE2_NOTIFICATION_SETTINGS.dailyReflectionHour`
    (21) 상수를 쓴다는 것을 이번 논의에서 코드로 직접 확인했다 — **downstream(연구/계획)
    단계는 `app_settings` 테이블에 새 컬럼(예: `daily_reflection_hour`) 마이그레이션 추가,
    `settingsRepo.ts`의 `resolveNotificationSettings`/`upsertSettings` 확장이 필요하다.**
  - **UI 구현 방식은 네이티브 휠 피커가 아니라 기존 "알림 빈도"와 동일한 `ActionSheetIOS`
    패턴**이다 — 새 네이티브 의존성(`@react-native-community/datetimepicker`, 현재
    미설치 확인됨) 추가와 그에 따른 EAS Dev Client 재빌드를 피하기 위한 명시적 선택. 미리
    정의된 시간대 목록(예: 저녁 시간대 중심) 중 하나를 액션시트로 선택하는 방식 — 정확한
    후보 시각 목록은 연구/계획 단계 재량.
  - `src/notifications/scheduling.ts`의 트리거 생성 로직은 **이미
    `settings.dailyReflectionHour`로 파라미터화되어 있어 수정이 불필요**함을 코드로 확인함
    — UI/DB/settingsRepo 레이어만 확장하면 스케줄링 자체는 그대로 동작한다.
  - **REQUIREMENTS.md 반영 필요:** REQ-reflection-notification의 "시각 변경 UI는 스코프 밖"
    문구를 이번 결정에 맞게 갱신하거나, 새 requirement(가칭 `REQ-reflection-notification-time`)를
    추가해야 한다 — Phase 6의 D-01(설정 화면 스코프 gap)과 동일한 패턴. 이 gap을 메우지
    않으면 결정 커버리지 게이트가 이 스코프를 놓칠 위험이 있다(STATE.md Blockers/Concerns
    참고, Phase 2/5/6에서 반복된 도구 한계).

### Claude's Discretion
- 정적 지도 렌더링의 정확한 방식(react-native-maps MapView scrollEnabled=false 잠금 vs
  스냅샷 API) — Phase 5 05-CONTEXT.md에서 이미 동일 판단을 Claude 재량으로 위임한 선례를
  그대로 따른다. 궤적선(T14)이 아직 없을 경우 핀만 표시하는 graceful degradation도 이미
  원본 문서에서 확정(Dependencies 절).
- 회고 알림 시각 선택 액션시트의 정확한 후보 시각 목록(몇 개, 몇 시부터 몇 시까지) — D-05
  참고, 연구/계획 단계 재량. 단, 21시가 그 목록에 포함되어야 기존 사용자(창업자 본인)의
  현재 설정이 깨지지 않는다.
- 모달 진입/퇴장 애니메이션의 정확한 구현(아래→위 슬라이드)의 정확한 duration/easing —
  DESIGN.md Motion 원칙(minimal-functional, bounce/spring 금지, easing 표에 정의된 값
  중 선택) 안에서 연구/계획 단계 판단.
- 회고 저장 함수와 체크인 저장 함수(`runWithSingleRetry`) 간 재사용 범위(완전 재사용 vs
  동일 패턴 복제) — 05-CONTEXT.md에서 이미 동일 유형의 판단을 기술 결정으로 위임한 선례.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md`(약한 매칭,
  점수 0.3) — "재센터 버튼을 애플 지도 방식으로 개선". Today 뷰의 재센터 버튼에 관한 항목으로
  회고 phase 스코프와 무관 판단, 폴드하지 않음(Phase 6과 동일 사유로 반복 매칭됨 — 별도 파악
  필요).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/day-end-reflection-map.md` — 이 phase의 1차 스펙 문서(APPROVED, "NO
  UNRESOLVED DECISIONS"). Premises 1~9(회고=핵심 루프, 정적 지도 재사용 범위, 프롬프트 2칸
  문구, 알림 기본 켜짐+토글, 진입점 위치+모달 프레젠테이션+알림-날짜 귀속, 0건 처리, 자동저장
  디바운스5초+background flush+unmount flush+실패UI, 재진입 편집 가능, 사진 썸네일), Visual
  Design Decisions(레이아웃 순서, 타이포, 색상), Data Model(`DailyReflection` 필드 정의),
  NOT in scope 절("과거 회고 열람/수정" 번복 경위 — REQ-past-reflection-edit의 근거),
  Implementation Tasks T1~T5(각 task의 verify 기준).
- `docs/designs/footlog-product-design.md` — 부모 문서. T13/T26(Phase 5가 이미 구현한
  상세화면 패턴, 회고 모달과 대조군), 네비게이션 셸 절(모달이 왜 탭바를 숨기는 결정 자체를
  안 만드는지의 배경).

### 요구사항
- `.planning/REQUIREMENTS.md` §Day-end reflection — REQ-reflection-base, REQ-reflection-autosave,
  REQ-reflection-save-failure-ui, REQ-reflection-copy-fix, REQ-reflection-notification,
  REQ-reflection-today-entry, REQ-past-reflection-edit (M23~M29). **주의:** REQ-reflection-notification은
  이번 phase의 D-05 확장(시각 선택 UI)을 아직 반영하지 않음 — 연구/계획 단계에서 갱신 필요.

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Context §진행률/완료 수치 UI 노출 금지(CRITICAL, D-02 근거),
  Constraints §알림 스케줄링(반복 캘린더 트리거, 64개 한도), §사진 저장(documentDirectory)
- `.planning/ROADMAP.md` §Phase 7 — Goal / Success Criteria 5개
- `.planning/STATE.md` — Blockers/Concerns 절: "REQ-reflection-base는 번호 있는 원본 태스크
  ID가 없음, 원본 문서가 산문으로만 존재 — 과소 명세 가능성 최고로 플래그됨"(이번 논의로
  `day-end-reflection-map.md`를 직접 정독해 상당 부분 해소했다고 판단하나, 계획 단계에서
  재확인 권장)
- `.planning/phases/05-check-in-detail-edit/05-CONTEXT.md` — D-01/D-02(상세화면은 자동저장이
  아니라 명시적 미저장 경고 방식 — 이 phase의 자동저장 모델과 **의도적으로 다른 모델**임을
  downstream이 인지해야 함, 혼동 금지)
- `.planning/phases/06-calendar-tab/06-CONTEXT.md` — D-01~D-03(설정 화면 스코프 gap을
  REQUIREMENTS.md에 반영해야 했던 선례, D-05와 동일 패턴), 과거 날짜 뷰 화면 구조
- `.planning/phases/02-notification-infrastructure/02-CONTEXT.md` — D-01/D-02(Phase 2가
  빈도 UI를 만들지 않고 하드코딩 기본값만 쓴 것과 동일하게, dailyReflectionHour도 지금까지
  하드코딩 상수였다는 배경)

### 디자인 시스템
- `DESIGN.md` — §Layout 네비게이션 셸("하루 마무리 화면은 이 목록에 해당 없음 — 모달로 탭바까지
  덮음" 명시적 확정 문구), §Typography 3계층(프롬프트 라벨=시스템 폰트, 답변=Newsreader 이탤릭
  세리프), §Color(accent 승인 용도 6곳 — 회고 모달에 새 accent 사용처 추가 금지), §Motion
  (minimal-functional, bounce/spring 금지), 진행률 수치 노출 금지(CRITICAL, D-02 직접 근거)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/schema.ts`의 `CREATE_DAILY_REFLECTIONS_TABLE_SQL`, `DailyReflectionRow` —
  `daily_reflections` 테이블이 이미 Phase 1에서 마이그레이션에 포함되어 존재함. 이번 phase는
  새 테이블을 만들 필요 없이 이 스키마에 대한 repo/CRUD 함수만 추가하면 된다.
- `src/notifications/scheduling.ts`의 `DAILY_REFLECTION_ID`, `triggerFor()`의
  `settings.dailyReflectionHour` 분기 — 회고 알림 트리거 등록 로직이 이미 완성되어 있고 hour
  파라미터화도 이미 되어 있음(D-05 시각 선택 UI를 추가해도 이 파일은 수정 불필요, settings
  객체의 `dailyReflectionHour` 값만 정확히 채워지면 됨).
- `src/notifications/registry.ts`의 `reflectionEntry`(자가진단 레지스트리 항목) — 회고 토글이
  꺼지면 자가진단이 이 트리거를 재생성하지 않는 로직이 이미 존재.
- `src/settings/SettingsScreen.tsx`의 `persist()` 함수(네이티브 알림 재구성 → SQLite 업서트 →
  화면 state 반영 순서, 실패 시 롤백 없이 saveFailed만 세팅) — 시각 선택 UI 추가 시 이 함수의
  기존 순서 원칙(먼저 네이티브 성공 확인 후 DB 커밋)을 그대로 따라야 한다.
- `src/checkin/checkinRepo.ts`의 `runWithSingleRetry` — 회고 저장 실패 시 동일한 "자동 재시도
  1회 → 실패 UI" 패턴에 재사용 후보(파일 주석에 범용 재사용 의도가 이미 명시되어 있음).
- `src/components/CheckinActionCard.tsx` — 저장 실패 인라인 문구 + 재시도 버튼 UI 패턴,
  D-01의 공유 실패 UI 구현 시 참고/재사용 후보.

### Established Patterns
- `src/settings/content.ts` — 문구 상수를 SQL/로직과 분리해 단일 출처로 관리하는 관용구.
  회고 모달의 프롬프트 문구("새로 가본 곳이 있었나요?", "오늘에 대해")도 동일 패턴(예:
  `src/reflection/content.ts`)으로 관리하는 것이 기존 관례와 일치.
- `src/db` 마이그레이션 패턴(`PRAGMA user_version` + 개별 `execAsync` 호출, 템플릿 보간
  1회 제한 게이트) — D-05의 `daily_reflection_hour` 컬럼 추가 시 이 패턴 그대로 따라야 함.
- 04-CONTEXT.md/05-CONTEXT.md의 "하나의 쿼리, 두 군데 소비"(리스트+지도) 패턴 — 회고 모달의
  지도+궤적선도 오늘 뷰가 이미 쓰는 조회 쿼리를 재사용하는 것이 자연스러움.

### Integration Points
- `src/app/(tabs)/index/index.tsx`(오늘 뷰) — "오늘 돌아보기" 행을 바텀시트 리스트 최상단에
  추가하는 지점, 탭 시 회고 모달을 여는 진입점.
- `expo-router` — 회고 모달은 새 모달 라우트로 추가될 가능성이 높음(예: `presentation: 'modal'`
  옵션의 새 라우트). 알림 탭 시에도 동일 라우트로 딥링크. 정확한 라우트 구조는 연구/계획
  단계 결정.
- 과거 날짜 뷰 화면(Phase 6이 만든 T10 재사용 화면, 정확한 파일 경로는 06-CONTEXT.md/06 관련
  PLAN.md 참고) — 이 phase가 회고 입력칸 2개를 추가로 삽입할 지점.
- `src/settings/SettingsScreen.tsx` — 회고 알림 시각 선택 ActionSheet 행을 기존 "알림 빈도"
  행 아래(또는 "하루 마무리 알림" 토글 근처)에 추가할 지점, `settingsRepo.ts`/
  `src/notifications/config.ts`(`PHASE2_NOTIFICATION_SETTINGS`) 확장 지점.

</code_context>

<specifics>
## Specific Ideas

- 저장 실패 문구는 폼 하단 공유 1개, 체크인/상세화면과 동일 톤("저장하지 못했어요"+"다시 시도")
  — D-01.
- "오늘 돌아보기" 행은 완료 여부와 무관하게 항상 같은 모습(accent-soft 배경 구분 외 추가 신호
  없음) — D-02.
- 회고 모달은 닫기(✕)만, 타이틀 없음 — D-03.
- 회고 알림 시각을 창업자가 설정에서 직접 고를 수 있어야 한다는 것이 이번 논의에서 새로 나온
  가장 큰 방향 전환 — 원본 문서/REQUIREMENTS.md의 "스코프 밖" 결정을 창업자가 명시적으로
  뒤집음(D-05). 구현은 새 의존성 없이 기존 ActionSheet 패턴 재사용.

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀다. 알림 시각 선택 UI(D-05)는 스코프를 넓히는 결정이지만
"새로운 capability"가 아니라 이미 REQUIREMENTS.md에 존재하는 REQ-reflection-notification의
경계를 확장하는 것이라 이 phase 안에서 흡수한다(별도 phase로 미루지 않음, 창업자가 명시적으로
선택).

</deferred>

---

*Phase: 7-Day-end Reflection*
*Context gathered: 2026-09-02*
