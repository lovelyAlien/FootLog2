# Phase 5: Check-in Detail & Edit - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

오늘 뷰(Phase 4)의 바텀시트 리스트에서 완료된 체크인 행을 탭하면 열리는 상세화면.
시간(모노스페이스) → 정적 지도 미리보기 → "지도 앱에서 열기" → 사진 → 메모 순서로
고정된 레이아웃을 가지며, 언제든 메모/사진을 편집할 수 있다. `AppState` 백그라운드
전환 시 미저장 메모를 강제 flush하고, "지도 앱에서 열기"는 저장되지 않은 수정
내용을 잃지 않고 딥링크한다. 리스트 행 스와이프로 개별 체크인을 삭제할 수 있다
(올리브그린 어포던스 + 4초 undo 스낵바).

**Phase 5가 만들지 않는 것:**
- 캘린더 탭 콘텐츠(월 그리드/과거 날짜 뷰/스크러버, Phase 6) — 상세화면은 오늘 뷰의
  리스트 행에서만 진입한다. 과거 날짜 뷰(Phase 6)에서 같은 상세화면으로 진입하는
  배선은 Phase 6이 담당.
- 하루 마무리 회고(Phase 7) — 회고의 자동저장(디바운스+background flush) 패턴은
  참고용으로만 언급되며, 이번 phase는 그 패턴을 의도적으로 채택하지 않는다(D-01 참고).
- 전체 데이터 삭제 — 설정 화면 소관(2단계로 연기, PROJECT.md 참고), 이 phase와 무관.

</domain>

<decisions>
## Implementation Decisions

### 메모 편집 저장 방식
- **D-01:** 상세화면의 메모 편집은 **자동저장이 아니라 명시적 미저장 경고 방식**을 쓴다
  — `product-design.md` T13 원문 스펙 그대로. 사용자가 메모를 수정한 뒤 화면을
  나가려 하면(뒤로가기 등) 저장되지 않은 변경 사항이 있을 경우 경고를 보여주고,
  확인 없이는 저장하지 않는다. Day-end 회고(Phase 7, `day-end-reflection-map.md`)의
  "5초 디바운스 자동저장, 경고 없음" 패턴과는 **의도적으로 다른 모델**임을
  downstream(연구/계획) 단계가 인지해야 한다 — 논의 중 두 문서가 서로 다른 방향을
  가리키는 걸 확인했고, 사용자가 명시적으로 경고 방식을 선택했다. `AppState`
  background 강제 flush(D-02, T26 딥링크 유실 방지용)는 이 결정과 별개로 그대로
  유지 — "인앱에서 뒤로가기"는 경고, "OS가 앱을 백그라운드로 보냄(딥링크 등)"은
  조용히 flush, 두 경로가 다르게 동작한다.
- **D-02:** "지도 앱에서 열기" 딥링크로 인한 백그라운드 전환 시에는 D-01의 경고
  UI가 발동하지 않고 `day-end-reflection-map.md`에서 이미 확정된 "`AppState`가
  background로 바뀌는 순간 즉시 저장 실행" 패턴을 그대로 재사용해 조용히 flush한다
  (product-design.md 확정 사항, DRY). D-01과 D-02는 서로 다른 트리거(인앱 이탈 vs
  OS 백그라운드 전환)에 대한 서로 다른 처리이며 모순이 아니다.

### 기존 사진 교체/삭제
- **D-03:** 상세화면에서 이미 첨부된 사진이 있을 때, 사용자는 **교체와 삭제 둘 다**
  할 수 있다. 사진을 탭하면 기존 첨부 흐름과 동일한 액션시트(촬영/앨범에서 선택)로
  새 사진으로 교체 가능하고, 별도의 삭제 액션으로 사진을 완전히 제거해 "사진 없음
  + 추가 버튼" 상태로 되돌릴 수 있다. product-design.md는 "사진(있으면 표시, 없으면
  추가 버튼)"까지만 명시했고 편집 흐름은 스펙에 없던 gap — 이번 논의로 확정.
- **D-04:** 사진 삭제는 **확인 없이 즉시 삭제되며, 되돌림(undo)을 제공하지 않는다**
  — 체크인 전체 삭제(REQ-checkin-swipe-delete, 4초 undo 스낵바)와는 별개의 가벼운
  편집 액션으로 취급한다. 사진 필드 하나만 바뀌는 편집이라 체크인 전체 삭제 수준의
  되돌림 장치는 과설계로 판단. 새 undo UI를 만들지 않는다.

### 상세화면 자체의 삭제 진입점
- **D-05:** 체크인 전체 삭제(REQ-checkin-swipe-delete)는 **리스트 스와이프로만**
  제공한다 — 상세화면에는 별도의 삭제 버튼을 두지 않는다. 상세화면을 "편집 전용"
  공간으로 유지해, 파괴적 액션(체크인 전체 삭제)이 편집 액션(메모/사진 수정)과
  섞이지 않게 한다. 기존 스펙 문서(REQUIREMENTS.md, product-design.md)와도 일치하는
  선택 — 두 문서 모두 삭제 경로를 리스트 스와이프로만 명시하고 있었다.

### Claude's Discretion
- 정적 지도 미리보기의 정확한 렌더링 방식(react-native-maps MapView를
  scrollEnabled=false로 잠글지, 별도 스냅샷 API를 쓸지) — 이미 앱이 실시간 지도
  타일 렌더링에 네트워크를 쓰고 있으므로(Phase 3/4) 오프라인 원칙과 새로운 충돌은
  없음. 기술 구현은 연구/계획 단계에서 판단.
- 사진 교체 시 기존 파일 삭제 타이밍(새 파일 저장 성공 후 이전 파일 삭제 vs 즉시
  삭제) — `documentDirectory`에 남는 고아 파일 방지 관점의 기술 판단, 연구/계획
  단계에서 결정.
- "저장 전 화면 이탈 시 미저장 경고" UI의 정확한 형태(네이티브 Alert vs 커스텀
  다이얼로그, 정확한 문구) — DESIGN.md 톤 원칙(담담함, 빨강/경고아이콘 지양) 안에서
  UI-SPEC 또는 구현 단계에서 결정.
- 메모 저장 실패 재시도 UI를 최초 저장 실패 UI(`CheckinActionCard.tsx` 패턴)와
  얼마나 재사용/공유할지 — 컴포넌트 재사용 범위는 기술 판단, 연구/계획 단계에서
  결정.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/footlog-product-design.md` — T13(체크인 상세화면 레이아웃 순서 확정,
  254번째 줄 부근), T26(지도 앱 딥링크 + 배경전환 flush, 255·736번째 줄 부근),
  T11(스와이프 삭제, 248·348번째 줄 부근), "네비게이션 셸" 절(233~244번째 줄,
  상세화면은 push + 탭바 노출 유지 — 설정과 동급), "저장 후 수정 + 사진 실패 피드백"
  절(252~259번째 줄), Section 1 상태 다이어그램의 `editing (T13, ...)` 흐름(660~662번째
  줄, home_idle → detail_view → editing → saving_edit)
- `docs/designs/day-end-reflection-map.md` — 20~22번째 줄(디바운스 자동저장 +
  background flush 패턴 원문) — **이 phase는 이 패턴을 의도적으로 채택하지 않음**
  (D-01), 그러나 background flush 자체(D-02)는 이 문서의 패턴을 그대로 재사용하므로
  구현 시 반드시 참고.

### 요구사항
- `.planning/REQUIREMENTS.md` §Check-in detail & edit — REQ-checkin-detail-base,
  REQ-checkin-detail-layout, REQ-checkin-detail-flush, REQ-maps-deeplink,
  REQ-checkin-swipe-delete (M15~M19, PD-T13/T28/T29/T26/T11 대응)

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Context §진행률/완료 수치 UI 노출 금지(CRITICAL),
  Constraints §사진 저장(documentDirectory 필수), §디자인 시스템(색상 원칙 — 삭제는
  올리브그린, 빨강 금지)
- `.planning/ROADMAP.md` §Phase 5 — Goal / Success Criteria
- `.planning/phases/04-today-view/04-CONTEXT.md` — D-03(Phase 4는 리스트 행을 탭
  불가능하게 남겨둠, 이번 phase가 그걸 탭 가능하게 바꿈), D-10/D-11(오늘 체크인 조회
  쿼리·핀 색상 패턴, 상세화면의 정적 지도 미리보기가 참고할 수 있음)

### 디자인 시스템
- `DESIGN.md` — 타이포 3계층(시간=모노스페이스, 메모=세리프 이탤릭), Color §accent
  1개 원칙("지도 앱에서 열기" 버튼은 accent 아닌 muted 톤 — accent는 "지금" 의미로
  예약), 시맨틱 컬러 금지(삭제 버튼은 빨강이 아닌 올리브그린) — 상세화면/삭제 UI
  구현 전 필독

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/checkin/checkinRepo.ts`의 `getTodayCheckins`/`updateCheckinNoteAndPhoto` —
  이미 구현되어 있음. `updateCheckinNoteAndPhoto`가 이번 phase의 메모/사진 저장에
  바로 재사용 가능. `runWithSingleRetry`(범용 재시도 헬퍼)는 파일 자체 주석에 "Phase
  5(T13 상세화면 메모 저장 실패)가 그대로 재사용할 수 있도록 설계됐다"고 명시돼
  있음 — 최초 저장과 동일한 재시도 패턴을 그대로 가져다 쓸 수 있음.
- `src/today/CheckinListRow.tsx` — Phase 4에서 D-03에 따라 의도적으로 탭 불가능(순수
  View, Pressable 아님)하게 만들어짐. 이번 phase가 이 컴포넌트를 Pressable로 감싸고
  상세화면으로 네비게이션하는 배선을 추가해야 함.
- `src/components/CheckinActionCard.tsx` — 최초 저장 실패 UI 패턴("저장하지
  못했어요" + 다시 시도) 참고용, 상세화면의 수정 저장 실패 UI가 재사용/복제 후보.

### Established Patterns
- `src/checkin/checkinRepo.ts`의 트랜잭션+단일재시도 패턴 — 메모/사진 수정 저장에도
  동일 원칙(자동 재시도 1회 → 실패 UI) 적용.
- `src/db/schema.ts`의 `checkins.photo_path`가 단일 필드 — 사진은 체크인당 최대
  1장, 다중 사진 개념 없음(D-03의 "교체" 개념이 이 제약과 일치).

### Integration Points
- `src/app/(tabs)/index.tsx`(오늘 뷰) — `CheckinListRow` 탭 시 상세화면으로
  네비게이션하는 진입점. expo-router 기반이므로 상세화면은 새 라우트로 추가될 가능성
  높음(예: `src/app/checkin/[id].tsx` 또는 유사 패턴) — 정확한 라우트 구조는
  연구/계획 단계에서 결정.
- `expo-router` — "네비게이션 셸" 절이 명시한 "push, 탭바 노출 유지" 요구사항을
  expo-router의 스택 네비게이션으로 구현 가능.

</code_context>

<specifics>
## Specific Ideas

- 메모 편집은 회고와 다르게 "명시적 저장/미저장 경고" 모델을 쓴다는 것이 이번
  논의의 핵심 결정 — 두 문서(product-design.md T13 vs day-end-reflection-map.md)가
  서로 다른 저장 모델을 제시하고 있었는데, 사용자가 T13의 경고 방식을 명시적으로
  선택함(D-01).
- 사진은 교체+삭제 둘 다 가능, 삭제는 즉시(되돌림 없음) — 체크인 전체 삭제의 4초
  undo 스낵바보다 가벼운 액션으로 취급(D-03, D-04).
- 삭제는 상세화면이 아니라 리스트 스와이프로만 — 상세화면을 편집 전용으로 유지
  (D-05).

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음. 세 가지 논의 주제(메모 저장 방식, 사진
교체/삭제, 상세화면 삭제 진입점) 모두 이번 phase가 이미 다루는 화면(체크인
상세화면) 안에서의 구현 결정이었고, 새로운 capability를 스코프에 추가하지 않았다.

</deferred>

---

*Phase: 5-Check-in Detail & Edit*
*Context gathered: 2026-08-31*
