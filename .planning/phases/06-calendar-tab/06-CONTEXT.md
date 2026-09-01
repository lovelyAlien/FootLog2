# Phase 6: Calendar Tab - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

캘린더 탭 홈(월 그리드, 탭 전용, 오늘 accent 밑줄 + 기록 유무 표시), 과거 날짜를 탭했을 때
열리는 읽기전용 지도+바텀시트 화면(체크인 버튼 미노출, 기존 상세화면 T13 재사용), 그
화면에서만 뜨는 플로팅 가로 날짜 스크러버(드래그 실시간 반영, 하드 클램프, 44×44pt
터치타겟)까지가 이 phase의 핵심(REQ-calendar-grid, REQ-past-date-view, REQ-date-scrubber).

논의 중 발견된 스코프 확장: 원본 제품문서(`footlog-product-design.md` T10)가 "과거 날짜 뷰
+ 햄버거 메뉴→설정 화면"을 한 태스크로 묶어뒀고, Phase 4 논의(D-08)가 이미 "햄버거 아이콘은
Phase 6이 담당"으로 못박아뒀는데 REQUIREMENTS.md의 Phase 6 요구사항 3개엔 설정 화면이 빠져
있던 gap을 이번 논의로 메웠다 — **햄버거 메뉴(≡) + 설정 화면(알림 빈도/하루마무리
알림토글/버전) 전체를 이번 phase에 포함**하기로 확정(D-01~D-03). 단, 햄버거 아이콘이 실제로
배치되는 파일은 캘린더 탭이 아니라 **Today 뷰(`src/app/(tabs)/index/index.tsx`)** 라는 점에
주의 — 원본 스펙이 "탭바와 별개, 오늘 뷰 상단에만"으로 명시했고 이번 논의로도 재확인됨.

**Phase 6가 만들지 않는 것:**
- 캘린더 그리드 드래그 멀티셀렉트 + 멀티셀렉트 결과 화면(`REQ-calendar-multiselect-drag`) —
  `calendar-multiselect-view.md` 자체가 명시적으로 Phase 2(제품 마일스톤)로 유예, 이번
  phase는 "탭 = 즉시 과거 단일 날짜 화면 이동"만 구현. `docs/designs/calendar-multiselect-view.md`의
  Visual Design Decisions(선택 원 색상 등)는 재사용하지 않는다 — 그 문서의 색상 스킴 중
  "기록 유무 무채색 톤" 부분만 이번 phase가 재사용(D-04).
- 과거 날짜 뷰에서의 회고 프롬프트 편집(`REQ-past-reflection-edit`, Phase 7) — 이번 phase
  시점엔 `DailyReflection` 데이터/화면 자체가 아직 없음.
- 설정 화면 안 "하루 마무리 알림 토글"이 실제로 잠그는 회고 기능 자체(Phase 7 소관) — 토글
  UI와 알림 스케줄링 배선(Phase 2가 이미 `daily_reflection` 타입 지원)만 이번 phase 몫.
- 전체 데이터 삭제(2단계로 연기, PROJECT.md Out of Scope 참고) — 설정 화면에 이 항목 없음.

</domain>

<decisions>
## Implementation Decisions

### 설정 화면(햄버거 메뉴) 스코프
- **D-01:** 햄버거 아이콘(≡) + 설정 화면을 **이번 phase에 전체 포함**한다 — 원본
  `footlog-product-design.md` T10 스펙 그대로. REQUIREMENTS.md의 현재 Phase 6 요구사항
  (REQ-calendar-grid/past-date-view/date-scrubber) 3개엔 이 스코프를 커버하는 항목이
  없다는 gap이 논의 중 발견됨 — **downstream(연구/계획) 단계는 REQUIREMENTS.md/ROADMAP.md에
  이 스코프를 커버할 새 requirement(가칭 REQ-settings-screen)를 추가하거나, 최소한 Phase 6
  Success Criteria에 명시적으로 반영해야 한다.** 이 gap을 메우지 않으면 결정 커버리지
  게이트가 이 스코프를 놓칠 위험이 있음(Phase 2/5에서 반복된 게이트 한계 패턴, STATE.md
  Blockers/Concerns 참고).
- **D-02:** 설정 화면에는 **3개 항목 모두** 넣는다 — 알림 빈도(매시간/3시간마다/끔), 하루
  마무리 알림 토글(기본 켜짐), 버전 정보. 하루 마무리 알림 토글은 Phase 7의 실제 회고
  기능이 아직 없어도 먼저 노출한다 — 알림 스케줄링 인프라 자체는 Phase 2가 이미
  `checkin`/`daily_reflection` 두 타입 모두를 지원하도록 만들어뒀으므로(REQ-notification-scheduling,
  M4) 토글 자체는 지금 동작 가능하다. "전체 데이터 삭제"는 넣지 않음(2단계로 연기,
  PROJECT.md Out of Scope 참고).
- **D-03:** 햄버거 아이콘 위치는 **원본 그대로 Today 뷰 상단에만** — 캘린더 탭 홈 화면에는
  두지 않는다. "설정은 탐색 목적이 아니므로 탭으로 승격하지 않는다"는 원본 원칙을 그대로
  따름. 이 phase가 실제로 수정해야 할 파일 중 하나가 `src/app/(tabs)/index/index.tsx`(Today
  뷰)라는 점을 downstream이 인지해야 한다 — "캘린더 탭" phase 이름만 보고 Today 뷰 파일을
  안 건드려도 된다고 오판하지 말 것.

### 월 그리드 기록 표시
- **D-04:** REQ-calendar-grid 원문은 "오늘" accent 밑줄만 요구하지만, **기록 유무도 무채색
  톤으로 함께 표시**하기로 확장 — `calendar-multiselect-view.md`(Phase 2 스코프 문서)의
  Visual Design Decisions에 이미 정의된 색상 스킴을 그대로 재사용: 미선택+기록있음 =
  `#79786F`(text-muted), 미선택+기록없음 = `#A7A49A`(text-faint). 새 색상 토큰을 추가하지
  않고 이미 DESIGN.md에 존재하는 무채색 토큰만 쓴다 — accent는 여전히 "오늘 밑줄"과
  "스크러버 선택 위치 표시" 2곳으로만 한정(DESIGN.md accent 승인 용도 원칙 위반 없음).

### 월 이동 방식
- **D-05:** 월 그리드에서 이전/다음 달 이동은 **좌우 스와이프 + 헤더 화살표 버튼 둘 다**
  제공한다 — 스와이프가 기본 제스처, 화살표 버튼은 발견성/접근성 보조 경로(44×44pt 터치
  타겟 원칙 적용).

### 주 시작 요일
- **D-06:** 월 그리드의 한 주는 **일요일부터 시작**한다(iOS 기본 달력 앱의 한국 로케일
  관례와 일치).

### Claude's Discretion
- 스크러버의 시각적 스크롤 창 크기(한 번에 좌우 몇 개씩 보여줄지) —
  `calendar-date-scrubber.md` Open Questions에 이미 "낮은 스코프, 화면 폭에 맞춰 구현 중
  조정 가능"으로 명시됨, 연구/계획 단계에서 판단.
- 과거 날짜 조회 쿼리 함수(`getCheckinsByDate` 류)의 정확한 시그니처/위치 — 기술 구현
  세부사항, `getTodayCheckins` 패턴을 참고해 연구/계획 단계에서 결정.
- 설정 화면의 정확한 라우트 경로/네비게이션 스택 위치 — expo-router 관례에 따라
  연구/계획 단계에서 결정. 단, 탭바 노출 여부는 이미 결정됨(D-07 참고 아래 canonical_refs
  — 체크인 상세화면과 동급으로 탭바 유지, "기록에 집중" 화면군에 속하지 않음).

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md`(약한 매칭,
  점수 0.3) — "재센터 버튼을 애플 지도 방식(위치+나침반 배지 분리)으로 개선". Today 뷰의
  재센터 버튼에 관한 항목으로 캘린더 탭 스코프와 무관하다고 판단해 이번 phase엔 폴드하지
  않음. 별도 파악·처리 필요.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/footlog-product-design.md` — T10(344번째 줄, "캘린더 과거 날짜 뷰 + 햄버거
  메뉴 → 설정 화면" 원본 태스크 정의), "네비게이션 — 하단 탭바 / 햄버거 메뉴 / 삭제"
  절(228~248번째 줄, 캘린더 탭 홈=월 그리드/탭=과거단일날짜화면 push/드래그=멀티셀렉트
  Phase 2 유예/과거 단일 날짜 화면은 탭바 숨김/햄버거는 오늘 뷰 상단 전용/설정 화면 항목
  3개), "체크인 상세 화면(push, 탭바 노출 유지 — 설정과 동급)"(239번째 줄, D-07 근거 —
  설정 화면도 탭바를 숨기는 "기록에 집중" 화면군이 아니라 탭바를 유지하는 화면임을
  암시), 브랜드 노출(267번째 줄, "FootLog" 이름은 priming과 설정 화면 버전 정보에만)
- `docs/designs/calendar-date-scrubber.md` — 승인된 스크러버 전체 스펙(위치 132pt 계산,
  스크럽 시작 시 바텀시트 강제 CLOSED, 모멘텀 없음, 경계 하드 클램프, 44×44pt 터치타겟,
  헤더 44pt, 스크롤 가능 범위=첫 체크인~오늘, 기록 0~1일이면 스크러버 자체 숨김) — T1~T4
  Implementation Tasks까지 이미 CLEARED 상태.
- `docs/designs/calendar-multiselect-view.md` — **T1a만 이번 phase 스코프**(캘린더 탭 홈 =
  월 그리드 + 단순 탭만, 미래 날짜도 특별 처리 없이 그대로 탭 가능해 T10의 기존
  "아직 기록이 없어요" 빈 상태로 감), T1b(드래그 승격 + 멀티셀렉트 결과 화면 전체)는
  Phase 2 유예. Visual Design Decisions의 무채색 톤 색상 스킴(D-04 근거)만 재사용, 선택
  원/궤적선 연속성 등 나머지는 미적용.

### 요구사항
- `.planning/REQUIREMENTS.md` §Calendar tab — REQ-calendar-grid, REQ-past-date-view,
  REQ-date-scrubber (M20~M22, CM-T1a/PD-T10/CS-T1..T4 대응). **주의:** 이 3개 REQ는 설정
  화면 스코프(D-01)를 커버하지 않음 — 연구/계획 단계에서 REQUIREMENTS.md 갱신 또는 Phase 6
  Success Criteria 보강 필요.
- `.planning/REQUIREMENTS.md` §Notification infrastructure — REQ-notification-scheduling
  (M4, Phase 2 완료)가 `checkin`/`daily_reflection` 두 알림 타입 모두의 반복 캘린더 트리거
  스케줄링을 이미 지원 — D-02(하루마무리 토글을 지금 넣어도 되는 근거).
- `.planning/REQUIREMENTS.md` §Day-end reflection — REQ-reflection-notification(M27, Phase
  7)가 "설정에서 끌 수 있는 토글"을 요구 — Phase 6이 이 토글의 UI 자리를 먼저 만들어두는
  근거이자, 늦어도 Phase 7 착수 전엔 설정 화면이 존재해야 한다는 의존관계.

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Context §진행률/완료 수치 UI 노출 금지(CRITICAL), Out of
  Scope §캘린더 드래그 멀티셀렉트 제외 근거, Key Decisions(캘린더 탭 제스처 라우팅: 탭 →
  과거 날짜 뷰, 드래그 → 멀티셀렉트는 2단계 전용)
- `.planning/ROADMAP.md` §Phase 6 — Goal / Success Criteria 3개
- `.planning/phases/04-today-view/04-CONTEXT.md` — D-06(하단 탭바 셸 도입은 Phase 4가 이미
  완료), D-07(캘린더 탭 플레이스홀더는 이번 phase가 교체 대상), D-08(햄버거 아이콘은
  Phase 6이 담당하기로 이미 넘겨받음 — 이번 phase의 D-01~D-03이 그 약속을 이행)
- `.planning/phases/05-check-in-detail-edit/05-CONTEXT.md` — D-01(상세화면은 자동저장이
  아니라 명시적 미저장 경고 방식) — 과거 날짜 뷰에서 진입하는 상세화면도 동일 화면/동일
  저장 모델을 그대로 재사용하므로 별도 논의 불필요.

### 디자인 시스템
- `DESIGN.md` — §Color accent 원칙(승인 용도 정확히 2곳: 오늘 표시 밑줄, 스크러버 선택
  위치 표시 — 새 accent 사용처 추가 금지), §네비게이션 셸(탭바는 두 홈 화면에서만 노출,
  "기록에 집중"하는 push 화면에서 숨김 — 설정 화면은 이 목록에 없으므로 탭바 유지로 해석),
  진행률 수치 절대 노출 금지(CRITICAL, 전 화면 공통)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/checkin/checkinRepo.ts`의 `getTodayCheckins` — 과거 특정 날짜 체크인 목록 조회 함수
  (예: `getCheckinsByDate`)를 이 phase가 신규로 추가할 때 동일한 트랜잭션/쿼리 패턴을 그대로
  참고 가능. 아직 "특정 날짜" 파라미터를 받는 조회 함수는 없음.
- `src/checkin/CheckinDetailScreen.tsx` — 과거 날짜 뷰에서 체크인 행을 탭했을 때 그대로
  재사용(Phase 5가 이미 완성한 상세화면, 별도 화면 신규 제작 불필요).
- `src/app/(tabs)/calendar.tsx` — 현재 Phase 4가 남긴 플레이스홀더 한 줄 텍스트. 이 phase가
  실제 월 그리드로 교체하는 대상.
- `src/app/(tabs)/_layout.tsx` — 하단 탭바 셸은 이미 완성(오늘/캘린더 2탭, accent 미사용
  틴트 오버라이드 포함) — 이 phase는 이 파일을 수정할 필요 없음.
- `src/theme/tokens.ts` — `colors.textMuted`/`colors.textFaint`/`colors.accent` 등 D-04/D-06이
  참조하는 무채색·accent 토큰이 이미 존재.

### Established Patterns
- `04-CONTEXT.md` D-10/D-11 — 오늘 체크인 조회 쿼리를 리스트(바텀시트)와 지도 핀 렌더링이
  공유하는 패턴. 과거 날짜 뷰도 동일하게 "하나의 쿼리, 두 군데 소비"로 설계하는 게 자연스러움.
- `05-CONTEXT.md` — 상세화면의 명시적 저장/미저장 경고 모델. 과거 날짜 뷰에서 진입해도
  화면 자체는 동일 컴포넌트라 이 모델이 그대로 적용됨.

### Integration Points
- `expo-router` — 과거 날짜 화면은 새 라우트로 push되며 탭바 숨김(예:
  `src/app/calendar/[date].tsx` 유사 패턴), 설정 화면도 새 라우트로 push되지만 탭바는
  노출 유지. 정확한 라우트 경로/폴더 구조는 연구/계획 단계 결정 사항.
- `src/app/(tabs)/index/index.tsx`(Today 뷰) — 햄버거 아이콘(≡)이 실제로 추가되는 화면.
  탭바와 별개로 이 화면 상단에 상시 노출.

</code_context>

<specifics>
## Specific Ideas

- 설정 화면은 iOS 그룹 리스트 스타일, 항목 3개(알림 빈도/하루마무리 토글/버전) — 목업
  `~/.gstack/projects/FootLog2/designs/settings-and-delete-20260822/settings-screen.png`
  최종 승인 상태(단, "전체 데이터 삭제" 행은 채택하지 않음, D-02 참고).
- 월 그리드 기록 표시는 새 색상이 아니라 이미 정의된 text-muted/text-faint 2단 톤 재사용(D-04).
- 월 이동은 스와이프+화살표 버튼 병행(D-05), 주 시작은 일요일(D-06) — 둘 다 기존 문서에
  명시되지 않았던 순수 신규 결정.

</specifics>

<deferred>
## Deferred Ideas

- **캘린더 그리드 드래그 멀티셀렉트 + 멀티셀렉트 결과 화면** — `calendar-multiselect-view.md`
  자체가 이미 Phase 2(제품 마일스톤)로 명시 유예한 항목, 이번 논의는 그 경계를 재확인했을
  뿐 새로 옮긴 게 아님.
- **재센터 버튼 애플 지도 방식 개선**(pending todo,
  `.planning/todos/pending/2026-09-01-recenter-button-apple-maps-parity.md`) — 약하게
  매칭됐으나(0.3점) Today 뷰 UI 항목이라 이번 phase 스코프와 무관 판단, 폴드하지 않음.

</deferred>

---

*Phase: 6-Calendar Tab*
*Context gathered: 2026-09-01*
