# Requirements: FootLog

**Defined:** 2026-08-25
**Core Value:** 체크인을 남기는 행위가 실제 매일의 사용을 버텨낼 만큼 마찰이 적어야 합니다 — 이 습관이 형성되지 않으면 앱의 다른 어떤 부분도 의미가 없습니다.

아래 모든 요구사항은 `docs/designs/PHASE1-MASTER-CHECKLIST.md`의 `M`-id에 대응되며,
각 M-id는 원본 문서의 태스크 ID를 가리킵니다(`PD-T*` = footlog-product-design.md,
`DE-T*` = day-end-reflection-map.md, `CM-T*` = calendar-multiselect-view.md,
`CS-T*` = calendar-date-scrubber.md). 상세 인수 조건은 해당 원본 문서를 참고할 것.

## v1 Requirements

1단계(로컬 전용 MVP)의 요구사항. 각 항목은 정확히 하나의 roadmap phase에 매핑됨.

### Foundation

- [x] **REQ-foundation-setup** (M1, PD-T1): Expo 프로젝트가 초기화되고, 창업자의 iPhone에 설치·실행되는 EAS Dev Client를 빌드한다.
- [x] **REQ-design-tokens** (M2, PD-T21): DESIGN.md의 타이포그래피/컬러/스페이싱/모션 토큰이 모든 화면에서 import 가능한 단일 상수 파일로 export된다.
- [x] **REQ-sqlite-migrations** (M3, PD-T23): 스키마를 쓰는 태스크가 실행되기 전에 SQLite 마이그레이션 프레임워크(`PRAGMA user_version` + 마이그레이션 함수)가 먼저 존재한다.

### Notification infrastructure

- [ ] **REQ-notification-scheduling** (M4, PD-T2/T22/T31): 앱이 `checkin`과 `daily_reflection` 두 종류 모두에 대해 반복 캘린더 트리거 알림(방법 A, minute 컴포넌트만, `repeats: true`)을 스케줄링하며, "사용자 설정으로 꺼짐"과 "예기치 않게 사라짐"을 구분하고, 다중 트리거의 부분 실패를 감지하고, 빈도 변경 시 고아 트리거를 정리하는 자가진단 레지스트리를 갖춘다.
- [x] **REQ-permission-copy** (M5, PD-T18): iOS 권한 프롬프트 4종(위치/카메라/사진 라이브러리/알림) 전부에 대해 OS 다이얼로그가 뜨기 전에 표시되는 확정된 문구가 존재한다.
- [ ] **REQ-notification-denied-flow** (M6, PD-T8; M4/M5에 의존): 알림 권한이 거부되면 사용자는 priming 화면 → OS 프롬프트 → 조용한 상태 배너 + 설정 딥링크를 보게 되며, 앱 복귀 시 `AppState` 기반 재확인이 이뤄진다.

### Check-in core loop

- [x] **REQ-checkin-core** (M7, PD-T3): 체크인을 탭하면 위치를 캡처해 즉시 SQLite에 저장한 뒤, 선택적으로 사진/메모 입력을 허용한다.
- [x] **REQ-checkin-write-failure-ui** (M8, PD-T4; M7 확장): 저장이 실패하면 앱이 자동으로 한 번 재시도한 뒤 "저장하지 못했어요" + 재시도 버튼을 표시하며, 저장이 성공할 때까지 메모/사진 입력을 막는다.
- [x] **REQ-checkin-confirm-pin** (M9, PD-T5/T24/T32): 앱은 항상 드래그 가능한 확인 핀을 보여주며(GPS 성공/실패/저정확도 모두 동일 경로), 5초 타임아웃 시 마지막으로 알려진 위치로 폴백하고, 날짜 경계 만료·저장 시 삭제·단일 드래프트만 허용·권한 변경에 대한 강건성을 포함해 확인 핀 창 동안 드래프트가 영속화된다.
- [x] **REQ-location-denied-flow** (M10, PD-T19; M9 확장): 위치 권한이 거부되면 앱은 OS 캐시 위치가 아닌 앱 소유의 폴백 위치를 사용하고, 알림 거부와 동일한 배너 패턴을 보여준다.

### Today view

- [x] **REQ-today-view** (M11, PD-T6): 오늘 탭에 지도 + 3단 스냅 바텀시트(CLOSED/DRAGGING/OPEN, 220ms)가 표시되어 오늘의 실제 체크인들을 시간순으로 나열하며, 시트 상태와 무관하게 플로팅 체크인 버튼에 항상 접근 가능하다. "오늘 돌아보기" 행은 아직 포함하지 않음(REQ-reflection-today-entry에서 추가).
- [x] **REQ-photo-resize** (M12, PD-T7): 사진은 최대 1600px로 리사이징되어 `documentDirectory`(절대 `cacheDirectory` 아님) 하위에 저장되며, 실패 시 인라인 실패 문구를 표시한다. 카메라 vs 라이브러리 출처는 이후 EXIF 태깅을 위해 구분된다.
- [x] **REQ-onboarding-empty-state** (M13, PD-T9): 알림 priming 화면이 온보딩 전체를 대신하며, 위치 권한은 사전이 아니라 첫 체크인 탭 시점에 맥락적으로 요청된다.
- [x] **REQ-trajectory-line** (M14, PD-T14): 지도 위에서 오늘의 체크인들을 시간순으로 잇는 얇고 채도 낮은 선을 그리며, 거리/시간 라벨은 표시하지 않는다.

### Check-in detail & edit

- [ ] **REQ-checkin-detail-base** (M15, PD-T13): 완료된 체크인 행을 탭하면 언제든 메모/사진을 편집할 수 있는 상세화면이 열린다.
- [ ] **REQ-checkin-detail-layout** (M16, PD-T28; M15 확장): 상세화면은 시간(모노스페이스) → 정적 지도 미리보기 → "지도 앱에서 열기" → 사진 → 메모 순서로 고정된 레이아웃을 갖는다.
- [ ] **REQ-checkin-detail-flush** (M17, PD-T29; M15 확장): 저장되지 않은 메모 수정 내용은 `AppState` 백그라운드 전환 시 강제로 flush된다.
- [ ] **REQ-maps-deeplink** (M18, PD-T26; M17에 의존): "지도 앱에서 열기"는 저장되지 않은 수정 내용을 잃지 않고 지도 앱으로 딥링크한다.
- [ ] **REQ-checkin-swipe-delete** (M19, PD-T11; 색상 2026-09-01 갱신 — DESIGN.md Decisions Log 참고): 스와이프 삭제는 (빨강이 아닌) Pin(테라코타) 어포던스와 4초 undo 스낵바를 사용하며, 메모/사진 유무와 무관하게 모든 삭제에 동일하게 적용된다.

### Calendar tab

- [x] **REQ-calendar-grid** (M20, CM-T1a + CM-T5): 캘린더 탭은 탭 전용 월 그리드(1단계에는 드래그 없음)를 보여주며 "오늘"에 accent 밑줄을 표시한다.
- [x] **REQ-past-date-view** (M21, PD-T10; M20에 의존): 과거 날짜를 탭하면 체크인 버튼 없이 해당 날짜의 읽기전용 지도+시트 뷰가 열린다.
- [x] **REQ-date-scrubber** (M22, CS-T1..T4; M21 확장): 플로팅 가로 날짜 스크러버 오버레이는 터치 시 바텀시트를 강제로 접고, 범위 경계에서 하드 클램프(러버밴딩 없음)되며, 44×44pt 터치 타겟과 44pt 헤더 높이를 사용한다.
- [x] **REQ-settings-screen** (PD-T10, 06-CONTEXT.md D-01/D-02; Today 뷰 상단 햄버거 아이콘에서 진입): 설정 화면은 알림 빈도(매시간/3시간마다/끔), 하루 마무리 알림 토글(기본 켜짐), 버전 정보 3개 항목을 노출하고, 알림 빈도/토글 값은 앱 재시작 후에도 보존된다("전체 데이터 삭제"는 포함하지 않음 — 2단계로 연기). 06-01(영속화 계층)~06-06(화면/햄버거 진입점/배선)에 걸쳐 완료, 06-08에서 시뮬레이터 확인 + 창업자 확인 통과.

### Day-end reflection

- [ ] **REQ-reflection-base** (M23; 스펙은 day-end-reflection-map.md의 Premises/Visual Design Decisions/Data Model에 산문으로만 존재, 번호 있는 원본 태스크 없음 — 계획 시 과소 명세 가능성이 가장 높은 항목으로 플래그됨): 전체화면 회고 모달이 그날의 정적 지도를 재사용하고, 2개의 프롬프트를 보여주며, `DailyReflection` 레코드로 저장한다. 진입점이 연결되어 있다.
- [ ] **REQ-reflection-autosave** (M24, DE-T2): 회고 답변은 5초 디바운스, `AppState` 백그라운드 flush, 모달 닫기(✕/스와이프) flush — 모두 동일한 저장 함수를 통해 — 자동저장된다.
- [ ] **REQ-reflection-save-failure-ui** (M25, DE-T1): 회고 저장 실패는 체크인 저장 실패와 동일한 재시도 패턴을 사용한다.
- [ ] **REQ-reflection-copy-fix** (M26, DE-T3): "오늘의 흔적" 섹션명이 변경되고 더 이상 체크인 개수를 표시하지 않는다(진행률 노출 금지).
- [ ] **REQ-reflection-notification** (M27, DE-T4; M4에 의존): 매일 고정 시각의 회고 알림이 기본으로 켜져 있으며, 설정에서 끌 수 있는 토글이 있다.
- [ ] **REQ-reflection-today-entry** (M28; M11 확장): "오늘 돌아보기" 행이 오늘 뷰 바텀시트 리스트 최상단에 고정되며, 체크인이 0건이어도 항상 보인다.
- [ ] **REQ-past-reflection-edit** (M29, DE-T5; M23에 의존): 과거 날짜 뷰(REQ-past-date-view)에 편집 가능한 회고 프롬프트가 추가되며, 회고 문서 자체의 원래 "읽기전용" 스코프 결정을 뒤집는다.

### Export & polish

- [ ] **REQ-export** (M30, PD-T20): 사용자가 수동으로 내보내기를 실행하면 JSON 파일과 사진 zip이 함께 생성된다("JSON만"인 백업이 아님).
- [ ] **REQ-exif-geotag** (M31, PD-T25; M12에 의존): 카메라로 촬영한 사진은 내보내기 시 EXIF GPS 지오태그를 받으며, 라이브러리에서 선택한 사진에는 위치 메타데이터를 절대 주입하지 않는다.
- [ ] **REQ-exif-disclosure** (M32, PD-T30; M31 확장): 내보내기 화면은 내보내기 전에 "사진에 위치 정보가 포함됩니다"를 고지한다.
- [ ] **REQ-app-name** (M33, PD-T15): "FootLog"는 priming/설정 화면에서만 표시되며, 매일 보는 오늘 뷰에는 노출되지 않는다.
- [ ] **REQ-accessibility-baseline** (M34, PD-T16): 앱 전역에서 44px 터치 타겟, 4.5:1 명도 대비, 아이콘 전용 버튼의 VoiceOver 라벨을 적용한다. (명시적으로 다루지 않는 알려진 gap: 확인 핀 드래그 제스처의 VoiceOver 대체 경로 없음 — 별도로 추적되며 이 요구사항의 인수 조건에는 포함되지 않음.)

## v2 Requirements

향후 릴리스로 연기됨. 추적은 하되 현재 roadmap에는 없음.

### Phase 2 (제품 마일스톤 — 연기됨, 단일 백로그 버킷)

- **REQ-phase2-backend**: Spring Boot(Kotlin) 백엔드, Spring Security + 카카오 OAuth2/PKCE, S3 호환 오브젝트 스토리지, 클라이언트-서버 local-first 동기화. 1단계가 정성적 kill-condition 트라이얼을 통과하는 것이 조건(PROJECT.md Context 참고). 언블록되기 전까지는 하위 요구사항이나 roadmap phase로 확장하지 않음.

### Calendar multiselect (해당 스펙 문서 자체에서 명시적으로 연기됨)

- **REQ-calendar-multiselect-drag** (CM-T1b, CM-T2, CM-T3, CM-T4): 캘린더 그리드의 드래그 멀티셀렉트 승격 + 멀티셀렉트 결과 화면(지도+시트 집계 뷰, 인덱스 범위 선택, 불연속 패턴 처리).

### 기타 연기/백로그 항목 (TODOS.md에서 추적)

- 주간 반복 패턴 분석
- 회고 모달을 넘어서는 하루 리뷰 글쓰기
- 위젯/잠금화면 퀵 체크인(WidgetKit 네이티브 브릿지)
- Apple Watch 컴패니언
- 사진 권한 거부 vs 리사이징 실패 문구 분리(현재 하나의 공유 인라인 문구가 서로 다른 3가지 원인을 처리 중)
- 하루 첫 체크인의 보상 신호(반게이미피케이션 원칙과 긴장 관계; 진지한 디자인 고민 필요)
- iOS Location Services 전역 꺼짐 vs 앱별 거부 구분(1단계에서는 의도적으로 단순화해 하나의 공유 딥링크로 처리)

## Out of Scope

명시적으로 제외됨. 스코프 크리프를 막기 위해 문서화함.

| Feature | Reason |
|---------|--------|
| 체크인 시 날씨/기온 자동 캡처 | 네트워크 호출이 필요함 — 1단계의 무네트워크-의존 원칙을 깨뜨림; 창업자가 명시적으로 거부 |
| 1단계의 다중 사용자/계정/인증 | 1단계는 정확히 한 명의 사용자(창업자)만 있음; 인증은 전적으로 2단계의 관심사 |
| 백그라운드/"항상 허용" 위치 권한 | 의도적 결정 — 앱스토어 심사 마찰 회피; 체크인에는 포그라운드만으로 충분 |
| 매일 재스케줄링 방식(방법 B) | 방법 A(반복 캘린더 트리거) + 자가진단 레지스트리로 대체됨; 그 결과로 스누즈도 제거됨 |
| UI 어디에도 시맨틱 상태 컬러(빨강/초록/노랑) 사용 | DESIGN.md에는 시맨틱 컬러 시스템이 없음 — 오류는 절대 빨강이 아닌 muted-tone 텍스트로 표현됨 |

## Traceability

어떤 phase가 어떤 요구사항을 커버하는지. roadmap 생성 시점 기준으로 갱신됨.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-foundation-setup | Phase 1 | Complete |
| REQ-design-tokens | Phase 1 | Complete |
| REQ-sqlite-migrations | Phase 1 | Complete |
| REQ-notification-scheduling | Phase 2 | Pending |
| REQ-permission-copy | Phase 2 | Complete |
| REQ-notification-denied-flow | Phase 2 | Pending |
| REQ-checkin-core | Phase 3 | Complete |
| REQ-checkin-write-failure-ui | Phase 3 | Complete |
| REQ-checkin-confirm-pin | Phase 3 | Complete |
| REQ-location-denied-flow | Phase 3 | Complete |
| REQ-today-view | Phase 4 | Complete |
| REQ-photo-resize | Phase 4 | Complete |
| REQ-onboarding-empty-state | Phase 4 | Complete |
| REQ-trajectory-line | Phase 4 | Complete |
| REQ-checkin-detail-base | Phase 5 | Pending |
| REQ-checkin-detail-layout | Phase 5 | Pending |
| REQ-checkin-detail-flush | Phase 5 | Pending |
| REQ-maps-deeplink | Phase 5 | Pending |
| REQ-checkin-swipe-delete | Phase 5 | Pending |
| REQ-calendar-grid | Phase 6 | Complete |
| REQ-past-date-view | Phase 6 | Complete |
| REQ-date-scrubber | Phase 6 | Complete |
| REQ-settings-screen | Phase 6 | Complete |
| REQ-reflection-base | Phase 7 | Pending |
| REQ-reflection-autosave | Phase 7 | Pending |
| REQ-reflection-save-failure-ui | Phase 7 | Pending |
| REQ-reflection-copy-fix | Phase 7 | Pending |
| REQ-reflection-notification | Phase 7 | Pending |
| REQ-reflection-today-entry | Phase 7 | Pending |
| REQ-past-reflection-edit | Phase 7 | Pending |
| REQ-export | Phase 8 | Pending |
| REQ-exif-geotag | Phase 8 | Pending |
| REQ-exif-disclosure | Phase 8 | Pending |
| REQ-app-name | Phase 8 | Pending |
| REQ-accessibility-baseline | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-25*
*Last updated: 2026-08-25 after initial project ingest*
