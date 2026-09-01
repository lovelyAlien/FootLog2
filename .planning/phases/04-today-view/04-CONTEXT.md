# Phase 4: Today View - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 오늘의 체크인들을 지도 위에서 보여주는 홈 화면(지도 + 3단 스냅 바텀시트)을 갖고, 새 체크인을 위한 마찰 낮은 진입점(플로팅 체크인 버튼)이 시트 상태와 무관하게 항상 접근 가능하다. 사진 리사이징(최대 1600px, `documentDirectory` 저장), 첫 실행 온보딩(알림 priming만, 위치 권한은 첫 체크인 탭 시점에 맥락적 요청), 오늘의 이동 궤적선(옅은 연결선)도 이 phase 스코프. 논의 중 확인된 바, 오늘 저장된 체크인들을 조회해 지도 위에 핀으로 다시 그리는 로직 자체가 아직 코드에 없으므로 이것도 이 phase의 핵심 신규 작업이다.

**Phase 4가 만들지 않는 것:**
- 체크인 상세화면(REQ-checkin-detail-base, Phase 5) — 리스트 행은 이번 phase에서 탭 불가능.
- 캘린더 탭의 실제 콘텐츠(월 그리드/과거 날짜 뷰/스크러버, Phase 6) — 이번 phase는 캘린더 탭에 플레이스홀더 화면만 놓는다.
- 설정 화면 콘텐츠(알림 빈도 토글 등, Phase 6 소관) — 햄버거 메뉴 아이콘 자체도 이번 phase에서 놓지 않는다.
- "오늘 돌아보기" 회고 진입 행(REQ-reflection-today-entry, Phase 7) — 바텀시트 리스트 최상단 고정 행은 아직 없음.
- 장소명(지오코딩) 기능 — 오프라인 원칙과 충돌해 이번 phase에서 아예 만들지 않기로 결정(아래 D-01 참고).

</domain>

<decisions>
## Implementation Decisions

### 바텀시트 리스트 행 구성 (장소명 필드 처리)
- **D-01:** DESIGN.md는 "장소명(리스트 행): 16px/500/시스템폰트" 타이포 토큰을 이미 정의하고 있지만, 좌표→장소명 변환(리버스 지오코딩)은 iOS `CLGeocoder` 기반이라 네트워크 호출이 필요하고 PROJECT.md의 "1단계는 네트워크 의존성 전무" 원칙과 정면 충돌한다. **장소명 필드 자체를 이번 phase에서 만들지 않는다** — 온디바이스 지오코딩도 채택하지 않는다(신뢰성 낮고 원칙 예외를 새로 만들어야 함). DESIGN.md의 장소명 타이포 토큰은 정의만 남고 실제 렌더링에는 쓰이지 않는다(향후 재검토 대상 — TODOS.md형 항목으로 취급하되 이번 phase 산출물은 아님).
- **D-02:** 장소명이 빠진 리스트 행은 **시간(모노스페이스) + 메모 미리보기(세리프 이탤릭, 있을 때만 1줄)** 로 구성한다. 사진 유무를 나타내는 별도 아이콘은 만들지 않는다 — 기존 목업에서 이미 거부된 "아이콘-in-컬러드-서클" 활동 배지 패턴과 같은 방향의 스코프 크리프이기 때문.
- **D-03:** 완료된 체크인 행을 탭하면 상세화면이 열린다는 제품 문서의 전제는 Phase 5(REQ-checkin-detail-base)가 채운다. **이번 phase는 리스트 행을 탭 불가능하게 둔다** — 화살표 등 탭 가능함을 암시하는 어떤 시각 요소도 넣지 않는다(있지도 않은 기능을 미리 약속하지 않는 보수적 선택).

### 체크인 진행 중(확인 핀/액션카드) vs 상시 바텀시트 공존
- **D-04:** 확인 핀이 떠 있거나 저장 액션카드가 화면 최하단을 차지하는 동안, **오늘 뷰의 상시 바텀시트는 완전히 숨긴다**(언마운트). Phase 3의 "화면 최하단 절대위치" 패턴과 같은 공간을 그대로 쓰므로 충돌이 없고, 사용자도 체크인하는 동안은 리스트를 볼 필요가 없다는 판단.
- **D-05:** 체크인 버튼과 재센터 버튼(현재 `insets.bottom` 기준 절대위치, `src/app/index.tsx`)은 바텀시트가 DRAGGING/OPEN으로 올라와 화면을 덮을 때 **바텀시트 현재 상단(높이)에 따라 함께 위로 뜬다** — 시트 핸들에 버튼이 가려지지 않도록 시트 높이를 구독해 두 버튼의 `bottom` 오프셋을 동적으로 계산한다.

### 하단 탭바(오늘/캘린더) 도입 시점 및 셸 구성
- **D-06:** 제품 문서(`docs/designs/footlog-product-design.md`)는 `RootTabNavigator`(오늘/캘린더 2탭)를 이미 확정했고, 오늘 뷰 레이아웃 자체("하단은 상시 탭바")가 탭바 존재를 전제로 설계돼 있다. **Phase 4가 탭바 셸까지 만든다** — 캘린더 탭은 실제 콘텐츠 없이 플레이스홀더 화면 하나만 연결한다. REQUIREMENTS.md에는 이 탭바 셸 자체를 커버하는 REQ가 명시적으로 없었다는 점을 downstream(연구/계획) 단계에서 인지해야 한다 — Phase 4 Success Criteria에 없는 작업이지만 이번 논의로 Phase 4 스코프에 포함하기로 확정됐다.
- **D-07:** 캘린더 탭 플레이스홀더 화면은 **담담한 안내 텍스트 한 줄만**(예: "캘린더는 곧 추가돼요" 톤) 보여준다. 새 컴포넌트/아이콘 설계 없이 기존 typography 토큰만으로 구현한다.
- **D-08:** 햄버거 메뉴(≡, 설정 화면 진입점)는 제품 문서에 오늘 뷰 상단 상시 노출로 돼 있지만 설정 화면 콘텐츠는 Phase 6 소관이다. **이번 phase에서는 햄버거 아이콘 자체를 놓지 않는다** — 아직 없는 화면으로의 진입점을 미리 만들지 않는 보수적 선택. Phase 6이 설정 화면과 함께 아이콘도 추가한다.
- **D-09:** 제품 문서는 체크인 진행 중(저장 전)에도 사용자가 캘린더 탭으로 전환하는 것을 막지 않는다고 명시한다(`footlog-product-design.md` line 193 부근, "체크인 진행 중 탭 전환" 절). 이에 따라 **하단 탭바 자체는 D-04(오늘 뷰 바텀시트 숨김)와 별개로, 체크인 진행 중에도 항상 보이고 탭 가능해야 한다.** 즉 "숨기는 것"은 오늘 뷰 안의 바텀시트뿐이며, 탭바 레이어는 건드리지 않는다.

### 오늘 저장된 체크인 핀의 지도 표시
- **D-10:** 오늘 저장된(과거) 체크인 핀과 지금 진행 중인 확인 핀을 시각적으로 구별한다 — 둘 다 물방울(teardrop) 핀 모양은 동일하게 유지하되 색상만 다르게 한다. DESIGN.md의 "accent 색상 1개만, 절대 늘리지 않음" 원칙에 따라 새 색상을 추가하지 않고 기존 토큰을 재사용한다: **저장된 핀 = `colors.accentSoft`(연한 accent), 진행 중인 확인 핀 = `colors.accent`(진한 accent, 기존 `pinConfident` 스타일 그대로)**.
- **D-11:** 오늘 저장된 체크인들을 조회해 지도에 다시 그리는 쿼리/렌더링 로직은 이번 phase의 신규 작업이다 — `src/checkin/checkinRepo.ts`에는 아직 "오늘 체크인 목록 조회" 함수가 없다(현재는 `getLatestCheckinCoordinate` 하나만 존재, 폴백 좌표용). 리스트(바텀시트)와 지도 핀 렌더링이 같은 조회 결과를 공유하도록 설계해야 한다(같은 쿼리, 두 군데 소비).

### Claude's Discretion
- 바텀시트 구현 라이브러리 선택(`@gorhom/bottom-sheet` 도입 vs `react-native-gesture-handler`+`react-native-reanimated` 위에 커스텀 구현) — 현재 두 의존성 모두 미설치 상태(제품 문서가 이미 "T5/T6 구현 시 필요"로 플래그해둔 gap). 연구/계획 단계에서 판단.
- Phase 3의 임시 전체화면 지도 화면(`src/app/index.tsx`, 03-CONTEXT.md D-06)을 그대로 확장할지, 컴포넌트 구조를 재편(맵 로직을 훅/컴포넌트로 추출 후 Today 화면이 감싸는 구조)할지 — 970줄짜리 기존 파일의 리팩터링 범위는 기술적 판단, 연구/계획 단계에서 결정.
- 재센터 버튼/체크인 버튼이 바텀시트 높이를 구독하는 정확한 구현 방식(애니메이션 값 공유 vs 별도 state) — D-05의 구현 세부사항.
- 사진 리사이징 라이브러리(`expo-image-manipulator` 등) 및 리사이징 진행 중 로딩 UX — REQ-photo-resize의 기술적 구현.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/footlog-product-design.md` — T6(오늘 뷰: 지도+바텀시트 3단 스냅+실제 체크인만 시간순 표시), T7(사진 리사이징 1600px+documentDirectory+실패 인라인 문구), T9(첫 실행 온보딩=priming만, 위치 권한은 체크인 탭 시점), T14(이동 궤적선, 라벨 없음), "네비게이션 — 하단 탭바" 절(228~246번째 줄 부근, RootTabNavigator 구조·하단 탭바 확정 사항·햄버거 메뉴 설정 진입점), "체크인 진행 중 탭 전환" 절(193번째 줄 부근, 탭 전환이 체크인 드래프트를 막지 않는다는 확정 사항 — D-09 근거), "바텀시트 스냅" 절(262번째 줄 부근, CLOSED/DRAGGING/OPEN 220ms 타이밍)

### 요구사항
- `.planning/REQUIREMENTS.md` §Today view — REQ-today-view, REQ-photo-resize, REQ-onboarding-empty-state, REQ-trajectory-line (M-id로 product-design.md 원본 태스크 대응 확인). **참고:** 하단 탭바 셸 자체를 커버하는 REQ는 REQUIREMENTS.md에 명시적으로 없음 — D-06에 따라 이번 phase 스코프에 포함하기로 논의로 확정됨.

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Context §진행률/완료 수치 UI 노출 금지(CRITICAL, 전체 화면 공통), Constraints §오프라인 우선(네트워크 의존성 전무 — D-01 장소명 결정의 직접 근거), Key Decisions(하단 탭바 도입이 "지도 어디서나 엣지투엣지" 원칙을 대체)
- `.planning/ROADMAP.md` §Phase 4 — Goal / Success Criteria 5개
- `.planning/phases/03-check-in-core-loop/03-CONTEXT.md` — D-06(Phase 3의 임시 전체화면 지도가 Phase 4의 기반이 됨, 지도 렌더링/GPS 캡처/확인 핀 드래그 로직 재사용 전제), D-01/D-02(사진 원본은 이미 documentDirectory에 UUID 파일명으로 저장돼 있음 — 리사이징만 Phase 4 신규)

### 디자인 시스템
- `DESIGN.md` — 타이포 3계층(§Typography, 장소명/시간/메모/보조텍스트 스케일 — 장소명 항목은 D-01에 따라 이번 phase에서 미사용), Color §accent 1개 원칙(D-10 근거), 모션(바텀시트 스냅 220ms) — 리스트/핀/바텀시트 구현 전 필독

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/index.tsx`(Phase 3) — 전체화면 지도, GPS 캡처, 확인 핀 드래그, 체크인 상태 머신 배선이 이미 완성돼 있음. `pinStyleForSource()`, `pinWrapper`/`pinDrop` 스타일(물방울 핀)을 D-10의 저장된 핀 스타일에도 재사용 가능(색상만 accentSoft로 분기 추가).
- `src/checkin/checkinRepo.ts`의 `commitCheckin`/`getLatestCheckinCoordinate` — 쿼리 패턴(트랜잭션, 재시도) 참고용. D-11이 요구하는 "오늘 체크인 목록 조회" 함수는 이 파일에 새로 추가.
- `src/db/schema.ts`의 `idx_checkins_local_date_key` 인덱스 — 오늘 체크인 목록 조회(리스트+지도 핀 공용) 쿼리가 바로 사용 가능.
- `src/components/NotificationDeniedBanner.tsx`, `LocationDeniedBanner.tsx` — 배너 스택 컴포넌트, Today 화면 리팩터링 시 위치만 재조정.

### Established Patterns
- `src/app/index.tsx`의 `resolveInstantPosition`(캐시 우선 + 백그라운드 GPS 보정) 패턴 — 재센터 버튼 로직은 그대로 유지, D-05는 버튼의 화면상 위치(bottom 오프셋)만 바텀시트 높이에 연동.
- Phase 3의 "화면 최하단 절대위치" 액션카드 패턴 — D-04에 따라 바텀시트와 상호 배타적으로 렌더링(둘 다 화면 하단을 쓰지만 동시에 존재하지 않음).

### Integration Points
- `src/app/index.tsx` — Today 화면의 기반. 바텀시트/탭바 셸 도입 시 이 파일을 확장하거나 리팩터링(Claude's Discretion 참고).
- `expo-router`(현재 `~57.0.16` 설치됨, `react-navigation` 직접 의존성은 없음) — RootTabNavigator 셸(D-06)은 expo-router의 `(tabs)` 그룹 레이아웃 패턴으로 구현 가능. `react-native-gesture-handler`/`react-native-reanimated`/바텀시트 라이브러리는 미설치 — 연구 단계에서 선정 필요.

</code_context>

<specifics>
## Specific Ideas

- 저장된 체크인 핀 = `colors.accentSoft`, 확인 핀 = `colors.accent`(기존 `pinConfident` 그대로) — 새 색상 토�큰 추가 없이 기존 2단계 톤 차이로 구별(D-10).
- 캘린더 탭 플레이스홀더는 새 컴포넌트/아이콘 없이 담담한 안내 텍스트 한 줄(D-07).

</specifics>

<deferred>
## Deferred Ideas

- **장소명(지오코딩) 기능** — D-01에 따라 이번 phase에서 만들지 않기로 결정. 오프라인 원칙과 충돌하는 근본 문제라 향후 재검토가 필요하면 별도 판단(온디바이스 지오코딩 신뢰성, 또는 원칙 예외 여부)이 있어야 함 — 새로 발생한 TODOS.md형 항목으로 취급.
- **체크인 상세화면 진입(리스트 행 탭)** — D-03에 따라 Phase 5(REQ-checkin-detail-base)로 그대로 유지. 새로 옮긴 게 아니라 기존 스코프 경계를 재확인.
- **설정 화면 및 햄버거 메뉴 아이콘** — D-08에 따라 Phase 6로 유지. 새로 옮긴 게 아니라 기존 스코프 경계를 재확인.

</deferred>

---

*Phase: 4-Today View*
*Context gathered: 2026-08-30*
