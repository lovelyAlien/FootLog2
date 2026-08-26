# Phase 2: Notification Infrastructure - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

앱이 체크인/회고 리마인더를 반복 캘린더 트리거(방법 A)로 신뢰성 있게 스케줄링하고, 트리거가 조용히 사라지는 iOS의 알려진 실패 모드에서 포그라운드 복귀 시 자가진단 레지스트리로 스스로 복구하며, iOS 권한 프롬프트 4종(위치/카메라/사진 라이브러리/알림)에 확정된 문구를 갖추고, 알림 권한 거부 상태를 조용한 배너 + 설정 딥링크로 처리한다.

**Phase 2가 만들지 않는 것:** 빈도(매시간/3시간마다/끔)를 사용자가 직접 바꾸는 설정 화면 UI. 이건 햄버거 메뉴가 도입되는 Phase 6(Calendar tab)의 소관이다.

</domain>

<decisions>
## Implementation Decisions

### 알림 빈도 UI 경계 (Phase 2 vs Phase 6)
- **D-01:** Phase 2는 빈도 선택 UI(설정 화면)를 만들지 않는다. `scheduleNotifications(frequency)`류 함수를 매시간/3시간마다/끔 3개 값으로 파라미터화해 통합 테스트로만 검증한다. 실제 설정 화면 UI는 Phase 6(Calendar tab, 햄버거 메뉴 → 설정 화면)에서 구현한다.
- **D-02:** Phase 2 동안 앱이 실제로 동작할 때 쓰는 하드코딩 기본 빈도는 **매시간**이다.

### 권한 프롬프트 문구 (Info.plist)
- **D-03:** 위치/카메라/사진 라이브러리 3개의 Info.plist usage description은 PROJECT.md 전제 #6(담담한 톤)에 맞춰 아래 초안으로 작성한다. 창업자가 나중에 확인/수정 가능하며 지금 확정은 아니다.
  - `NSLocationWhenInUseUsageDescription`: "체크인 위치를 기록하려면 위치 정보가 필요해요."
  - `NSCameraUsageDescription`: "체크인에 사진을 남기려면 카메라 접근이 필요해요."
  - `NSPhotoLibraryUsageDescription`: "체크인에 사진을 첨부하려면 사진 보관함 접근이 필요해요."
- **D-04:** 문구는 한국어만 작성한다(영어 병기 없음) — 1단계 유일 사용자(창업자)는 한국어 로케일을 사용한다.
- **D-05:** '알림' 권한 프롬프트 문구는 iOS에 Info.plist 키가 없어(OS가 커스텀 문구를 지원하지 않음) 이미 확정된 priming 화면 문구("매시간 알림으로 지금 어디 있는지 잠깐 기록해요")로 REQ-permission-copy를 충족한 것으로 간주한다. 별도 작업 불필요.

### 시간대 변경 검증
- **D-06:** 반복 캘린더 트리거가 기기 시간대 변경 시 올바르게 재정렬되는지에 대한 실기기 검증은 Phase 2 범위에서 **제외**한다. 실기기(창업자 iPhone)는 Phase 1에서 이미 확보됐지만, 사용자가 지금 당장은 다루지 않기로 결정 — TODOS.md에 계속 유예.

### 자가진단 상태 가시성
- **D-07:** 자가진단(포그라운드 복귀 시 트리거 존재 확인 및 재생성)의 동작 확인은 개발 빌드의 콘솔 로그(`console.log`)만으로 충분하다. 사용자에게 보이는 UI 신호는 만들지 않는다 — 문서의 "조용히 재생성" 원칙을 그대로 유지.

### Claude's Discretion
논의된 4개 영역 모두 구체적 결정으로 마무리됨 — 별도로 위임된 재량 영역 없음. 단, 레지스트리 내부 자료구조(배열 스키마 `[{id, kind, recreate()}, ...]`)의 정확한 구현 방식은 product-design.md의 설명을 기반으로 연구/계획 단계에서 자유롭게 판단.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/footlog-product-design.md` — T2(알림 스케줄링 + 자가진단 레지스트리, 재생성 조건의 "꺼짐" 예외 처리 포함), T8(알림 거부 시 전체 플로우: priming→OS팝업→배너→AppState 재확인), T9(첫 실행 온보딩=priming 화면), T10(햄버거 메뉴→설정 화면, **Phase 6 소관**), T18(권한 프롬프트 문구, 아직 미확정으로 명시됨), T22(자가진단, T2에 통합), Cross-Phase Themes(알림 무음 실패 감지 — Codex CEO/Eng 리뷰 두 차례 독립 지적) 섹션 참고.

### 요구사항
- `.planning/REQUIREMENTS.md` §Notification infrastructure — REQ-notification-scheduling, REQ-permission-copy, REQ-notification-denied-flow

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Key Decisions("알림 스케줄링 = 방법 A + 자가진단 레지스트리, 매일 재스케줄링 아님"), Constraints(알림 스케줄링 절 — 반복 캘린더 트리거, minute 컴포넌트만, 64개 한도), Context(열린 질문 중 "시간대 변경 검증" 항목 — 이번 논의로 계속 유예 확정)
- `.planning/ROADMAP.md` §Phase 2 — Goal / Success Criteria 4개

### 디자인 시스템
- `DESIGN.md` — 담담한 톤, 시맨틱 컬러 금지(오류=muted 텍스트), 색상/타이포/스페이싱 원칙 — 배너·권한 문구 작성 전 필독

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 없음 — Phase 1은 스캐폴드/디자인 토큰/SQLite 마이그레이션만 만들었고, 알림 관련 코드는 전무한 그린필드 상태 (`expo-notifications` 의존성도 아직 미설치, `app.json`에 알림 관련 plugin 설정 없음).

### Established Patterns
- `src/db`의 `PRAGMA user_version` 기반 마이그레이션 패턴(Phase 1)은 알림과 무관하지만, "버전 관리된 상태를 앱 부팅 시 확인" 이라는 구조적 아이디어는 자가진단 레지스트리 설계에 참고할 만함(단, D-07에 따라 영속 저장은 불필요 — 매 포그라운드 복귀마다 즉시 조회).

### Integration Points
- `src/app/_layout.tsx` — 현재 SQLiteProvider onInit 마이그레이션 배선이 있는 곳. `AppState` 리스너(포그라운드 복귀 감지)를 추가할 자연스러운 위치.
- `src/app/index.tsx` — 현재 부팅 확인 화면. 알림 거부 배너를 렌더링할 후보 위치(단, 오늘 뷰가 아직 없으므로 실제 배치는 Phase 4 Today view와 조율 필요).

</code_context>

<specifics>
## Specific Ideas

- Info.plist 권한 문구 3종 초안(D-03 참고) — "~하려면 ~이 필요해요" 패턴으로 기존 priming/배너 문구 톤과 통일.

</specifics>

<deferred>
## Deferred Ideas

- **시간대 변경 시 반복 트리거 재정렬 실기기 검증** (D-06) — Phase 2에서 제외, TODOS.md에 계속 유예. 실기기는 이미 확보되어 있으므로 창업자가 원할 때 언제든 별도로 확인 가능.

[그 외 TODOS.md의 기존 유예 항목들(Apple Journal 대체 여부, 사진 실패 문구 분리, 보상신호 긴장관계, VoiceOver 대체경로)은 이번 논의에서 새로 발생한 게 아니라 참고용으로만 언급 — 그대로 유지]

</deferred>

---

*Phase: 2-Notification Infrastructure*
*Context gathered: 2026-08-27*
