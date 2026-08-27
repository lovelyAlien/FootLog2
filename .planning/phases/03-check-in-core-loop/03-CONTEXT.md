# Phase 3: Check-in Core Loop - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 "체크인" 버튼을 눌러 위치를 캡처하고, 드래그 가능한 확인 핀을 거쳐 SQLite에 즉시 저장하며, GPS 실패/저장 실패/위치 권한 거부 상황 모두에서 조용하고 안정적으로 복구되는 체크인 코어 루프. 선택적 사진/메모 입력 UI도 이 phase에 포함되지만, 사진의 리사이징(최대 1600px)과 `documentDirectory` 최종 저장 규약(REQ-photo-resize)은 Phase 4 몫이다.

**Phase 3가 만들지 않는 것:** Today view의 완성형 지도+바텀시트 UI(REQ-today-view, Phase 4), 사진 리사이징 파이프라인(REQ-photo-resize, Phase 4), 이동 궤적선(REQ-trajectory-line, Phase 4).

</domain>

<decisions>
## Implementation Decisions

### 사진 입력의 Phase 3 범위
- **D-01:** Phase 3에서 사진 첨부 UI를 액션시트(촬영/앨범에서 선택) + 카메라·사진 라이브러리 권한 요청까지 구현한다. 리사이징과 `documentDirectory` 최종 저장 규약(REQ-photo-resize)은 Phase 4로 남긴다.
- **D-02:** 아직 리사이징 전인 원본 사진은 `cacheDirectory`가 아닌 `documentDirectory`에 복사해 임시 보관한다. PROJECT.md의 "사진 저장은 반드시 documentDirectory, cacheDirectory 사용 금지" 원칙을 Phase 3부터 지킨다 — `cacheDirectory`에 두면 OS가 디스크 공간 부족 시 백그라운드 상태의 앱 몰래 파일을 지울 수 있어, `checkins.photo_path` 컬럼이 참조하는 파일이 조용히 사라지는(에러 없이) 위험이 있기 때문.

### 드래프트 영속화 저장 방식
- **D-03:** 확인 핀이 뜬 시점(GPS 캡처 완료 ~ "확인" 탭 사이)의 드래프트는 AsyncStorage가 아닌 **SQLite `drafts` 테이블**로 영속화한다. Phase 1의 기존 마이그레이션 프레임워크(`src/db/migrations.ts`, `PRAGMA user_version`)에 테이블 하나를 추가하는 방식 — 새 저장 엔진(AsyncStorage)을 도입하지 않고 이미 source of truth인 SQLite 안에서 드래프트와 실제 체크인을 같은 트랜잭션 경계로 다룰 수 있게 한다.
- **D-04:** 드래프트는 스펙상 항상 최대 1개만 존재(다중 드래프트 관리 안 함, REQUIREMENTS.md REQ-checkin-confirm-pin 참고)하므로, 고정 PK(예: `id = 'draft'`)를 쓰는 단일 row 패턴으로 구현한다.

### 저장 실패 재시도 중 앱 종료 시 동작
- **D-05:** "확인" 탭 이후 SQLite 쓰기가 자동 재시도 중이거나 "다시 시도" 버튼이 떠있는 상태에서 앱이 강제종료되면, 별도의 "저장 실패" 상태 플래그를 새로 만들지 않고 **기존 드래프트 복구 메커니즘에 통합**한다. `checkins` insert가 성공하기 전까지는 D-03의 드래프트 row가 계속 살아있으므로, 재실행 시 이미 정의된 "이어서 체크인하시겠어요?" 복구 프롬프트가 이 케이스도 자동으로 커버한다 — insert 성공 직후에만 드래프트 row를 삭제한다.

### Phase 3의 임시 UI 호스팅
- **D-06:** Today view(지도+바텀시트, Phase 4)가 아직 없으므로, Phase 3의 체크인 버튼/확인 핀 플로우는 **최소 지도 화면 + 체크인 버튼**에 놓는다 — `react-native-maps`로 전체화면 지도를 바로 띄우고(미니맵/바텀시트 없이) 그 위에 체크인 알약버튼만 얹는다. Phase 4에서 이 지도 위에 바텀시트/리스트를 씌우면 되므로, 지도 렌더링·GPS 캡처·확인 핀 드래그 로직을 그대로 재사용할 수 있다. 화면이 실제로 존재하므로 사용자가 직접 탭하며 확인하는 수동 QA도 가능하다.

### 위치 완전 실패 시 최종 폴백 좌표
- **D-07:** 위치 권한도 없고 최근 체크인도 없고(옥 최초 실행) 지도 마지막 표시 좌표도 없는 상황(3단계 폴백 체인이 모두 실패)에서 쓸 "고정 기본 좌표"는 **창업자 본인의 집/자주 가는 고정 장소 좌표**로 하드코딩한다. 1단계가 창업자 1인용 로컬 앱이므로, 의미 없는 임의 좌표(0,0 등)보다 실제 생활권 좌표를 쓰는 게 최초 실행 시 지도 경험에 낫다는 판단. 정확한 좌표값은 계획/구현 단계에서 창업자에게 확인.

### Claude's Discretion
- 확인 핀 드래그 제스처와 지도 팬 제스처 간의 우선순위 충돌 처리 방식(product-design.md에 이미 "T5/T6 구현 시 반드시 확인"으로 플래그됨) — 기술 구현 세부사항으로 연구/계획 단계에서 판단.
- GPS 저정확도/폴백 상태를 나타내는 핀 색상/아웃라인의 정확한 시각적 차이값 — DESIGN.md 토큰 범위 내에서 UI-SPEC 또는 구현 단계에서 결정.
- `drafts` 테이블의 정확한 컬럼 스키마(체크인과 동일 필드를 얼마나 재사용할지) — 연구/계획 단계에서 스키마 설계.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 사양 (필수 정독)
- `docs/designs/footlog-product-design.md` — T3(체크인 코어 플로우), T4(SQLite 쓰기 실패 UI), T5(확인 핀 흐름 + GPS 로딩 5초 타임아웃 + 드래프트 영속화), T19(위치 권한 거부 플로우), T24(드래프트 영속화 엣지케이스 4가지: 날짜 경계 만료/저장 시 삭제/단일 드래프트만/권한 변경 강건성) — "Visual Design Decisions" 섹션의 "체크인 화면 위계", "저장 실패 시 사용자 대면 UI", "위치 권한 거부 시 플로우" 산문 설명 전체가 이 phase의 1차 소스.

### 요구사항
- `.planning/REQUIREMENTS.md` §Check-in core loop — REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-location-denied-flow (각 REQ 옆의 M-id로 product-design.md 원본 태스크 대응 확인)

### 프로젝트 컨텍스트
- `.planning/PROJECT.md` — Constraints §사진 저장(documentDirectory 필수, cacheDirectory 금지), §스키마(Checkin/DailyReflection 테이블, PRAGMA user_version 마이그레이션), §위치 권한(포그라운드 전용); Key Decisions(체크인 모델은 자유형)
- `.planning/ROADMAP.md` §Phase 3 — Goal / Success Criteria 5개
- `.planning/phases/02-notification-infrastructure/02-CONTEXT.md` — 위치/알림 권한 거부 배너가 동일한 조용한 회색 배너+설정 딥링크 패턴을 공유한다는 전례(D-01~D-07 참고, 특히 배너 톤/AppState 재확인 패턴)

### 기존 코드 (source of truth)
- `src/db/schema.ts` — `checkins` 테이블 DDL과 `LocationSource` enum(`gps_auto`/`gps_dragged`/`gps_low_accuracy_fallback`/`manual_denied`/`manual_no_signal`)이 이미 확정돼 있음, `photo_path`가 Phase 4 리사이징 규약 전제로 주석 처리됨
- `src/db/migrations.ts` — Phase 3에서 `drafts` 테이블을 추가할 마이그레이션 체인의 기존 패턴

### 디자인 시스템
- `DESIGN.md` — 담담한 톤, 시맨틱 컬러 금지, 컬러/타이포/스페이싱/모션 원칙 — 저장 실패 문구/배너/확인 핀 시각 차이 구현 전 필독

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/migrations.ts`의 `PRAGMA user_version` 기반 마이그레이션 프레임워크(Phase 1) — `drafts` 테이블 추가에 그대로 재사용
- `src/db/schema.ts`의 `checkins` 테이블 DDL + `LocationSource` enum — 이미 이 phase가 필요로 하는 5가지 위치 소스 값을 전부 포함해 확정돼 있음
- `src/components/NotificationDeniedBanner.tsx`(Phase 2) — 위치 권한 거부 배너(REQ-location-denied-flow)가 알림 거부 배너와 동일한 톤/딥링크 패턴을 요구하므로 컴포넌트 재사용 또는 패턴 복제 후보

### Established Patterns
- Phase 2의 `AppState` 포그라운드 복귀 재확인 패턴(`src/app/_layout.tsx`) — 위치 권한 거부 배너도 동일하게 포그라운드 복귀 시 권한 상태 재확인 필요(product-design.md 확정 사항)

### Integration Points
- `src/app/_layout.tsx` — SQLiteProvider onInit 마이그레이션 배선 위치, `drafts` 테이블 마이그레이션도 이 체인에 추가
- `src/app/index.tsx` — 현재 부팅 확인 화면. D-06에 따라 이 화면 또는 신규 화면에 최소 지도+체크인 버튼을 배치할 후보 위치

</code_context>

<specifics>
## Specific Ideas

- 드래프트 테이블 PK를 `'draft'` 같은 고정 문자열로 둬서 "항상 최대 1개"를 스키마 레벨에서 자연스럽게 강제(D-04)
- 최종 폴백 좌표는 창업자 본인의 실제 생활권 좌표(예: 자택)로 하드코딩(D-07) — 정확한 위경도 값은 계획/구현 단계에서 창업자 확인 필요

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 스코프 안에 머물렀음(사진 리사이징 자체는 이미 REQ-photo-resize로 Phase 4에 배정된 기존 스코프 경계이며, 이번 논의는 그 경계를 재확인했을 뿐 새로 옮긴 게 아님).

</deferred>

---

*Phase: 3-Check-in Core Loop*
*Context gathered: 2026-08-27*
