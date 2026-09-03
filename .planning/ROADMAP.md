# Roadmap: FootLog

## Overview

FootLog 1단계(이 roadmap)는 빈 저장소에서 시작해, 창업자가 자신의 iPhone에서 1~2주간
실사용 트라이얼을 진행할 수 있는 완전 로컬·1인용 iOS 체크인 저널을 빌드합니다. 아래 8개
phase는 앱 자체의 의존성 사슬을 따릅니다 — 먼저 기반 인프라(스캐폴드, 디자인 토큰,
SQLite 마이그레이션), 다음으로 알림 스케줄링과 그것이 확립하는 권한 거부 UI 패턴, 그
패턴을 재사용하는 체크인 캡처 루프, 체크인을 보여주는 두 개의 홈 화면(오늘 뷰, 그다음
체크인 상세/편집), 히스토리를 훑어보는 캘린더 탭, 알림 스케줄링과 오늘 뷰 배선에 의존하는
하루 마무리 회고, 마지막으로 내보내기 + 접근성/이름 마무리 순서입니다. 여기 있는 모든
요구사항은 로컬 전용 1단계 MVP에 속합니다 — 유예된 백엔드/클라우드 마일스톤(제품
문서에서는 내부적으로 "2단계"라 부름)은 의도적으로 이 roadmap에서 제외되어 있습니다;
REQUIREMENTS.md의 v2 섹션과 PROJECT.md의 Out of Scope 참고.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): 계획된 마일스톤 작업
- Decimal phases (2.1, 2.2): 긴급 삽입 항목(INSERTED로 표시)

Decimal phase는 앞뒤 정수 phase 사이에 숫자 순서대로 배치됩니다.

- [x] **Phase 1: Foundation** - Expo/EAS 스캐폴드, 디자인 토큰, 그리고 나머지 전부를 그 위에 지을 수 있는 SQLite 마이그레이션 프레임워크가 존재한다. (completed 2026-08-26)
- [x] **Phase 2: Notification Infrastructure** - 앱이 체크인/회고 리마인더를 신뢰성 있게 스케줄링하고 스스로 복구하며, 확정된 권한 프롬프트 문구와 거부 상태 UI 패턴을 갖춘다. (completed 2026-08-27)
- [x] **Phase 3: Check-in Core Loop** - 사용자가 자유형 체크인(위치 + 선택적 사진/메모)을 GPS·저장 실패를 포함해 안정적으로 남길 수 있다. (completed 2026-08-27)
- [x] **Phase 4: Today View** - 사용자가 오늘의 체크인들을 지도에서 보여주는 홈 화면과, 새 체크인을 위한 마찰 낮은 진입점을 갖는다. (completed 2026-08-31)
- [x] **Phase 5: Check-in Detail & Edit** - 사용자가 기록된 개별 체크인을 조회·수정·삭제할 수 있다. (completed 2026-08-31)
- [x] **Phase 6: Calendar Tab** - 사용자가 월 그리드와 빠른 날짜별 스크러버로 과거 날짜를 훑어볼 수 있다. (completed 2026-09-02)
- [ ] **Phase 7: Day-end Reflection** - 사용자가 하루 루프의 핵심 요소인 짧은 하루 마무리 회고를 완료할 수 있다.
- [ ] **Phase 8: Export & Polish** - 사용자가 데이터를 로컬로 내보낼 수 있고, 앱이 이름/접근성 기준을 충족한다.

**Phase 9~12: 백엔드/인증/클라우드(2단계)** — 1단계 로드맵(Phase 1~8)과 별도 트랙으로, 1단계 실사용 트라이얼 완료 게이트를 사용자 명시적 승인으로 우회하고 착수됨(2026-09-01). PROJECT.md Out of Scope / Key Decisions 참고.

- [x] **Phase 9: Backend Foundation** - Spring Boot(Kotlin) 백엔드 프로젝트가 스캐폴딩되고, 서버측 DB 스키마와 마이그레이션 프레임워크가 존재한다. (completed 2026-09-02)
- [ ] **Phase 10: Authentication (Kakao OAuth2/PKCE)** - 사용자가 카카오 계정으로 OAuth2/PKCE 로그인해 인증 토큰을 발급받는다.
- [ ] **Phase 11: Object Storage (S3-compatible)** - 체크인 사진이 S3 호환 오브젝트 스토리지에 업로드·조회된다.
- [ ] **Phase 12: Client-Server Sync** - 클라이언트 SQLite와 서버 DB 간 local-first 동기화가 이뤄진다.

## Phase Details

### Phase 1: Foundation

**Goal**: Expo/EAS 스캐폴드, 디자인 토큰, 그리고 나머지 전부를 그 위에 지을 수 있는 SQLite 마이그레이션 프레임워크가 존재한다.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-foundation-setup, REQ-design-tokens, REQ-sqlite-migrations
**Success Criteria** (what must be TRUE):

  1. 창업자가 EAS Dev Client 빌드를 자신의 iPhone에 설치하고 실행할 수 있다.
  2. 앱 화면들이 DESIGN.md와 일치하는 단일 상수 파일에서 공유 디자인 토큰(컬러, 타입, 스페이싱, 모션)을 import할 수 있다.
  3. SQLite 데이터베이스가 마이그레이션 프레임워크(`PRAGMA user_version` + 마이그레이션 함수)를 통해 초기화되며, 이후 기존 데이터를 지우지 않고 테이블/컬럼을 추가할 수 있다.

**Plans**: 5 plans (4 waves)

- [x] 01-01-PLAN.md — Expo SDK 57 스캐폴드 + 런타임 의존성 + jest-expo 테스트 인프라 (wave 1)
- [x] 01-02-PLAN.md — DESIGN.md 디자인 토큰 단일 상수 파일 + Newsreader 번들 폰트 (wave 2)
- [x] 01-03-PLAN.md — PRAGMA user_version SQLite 마이그레이션 프레임워크 + 실엔진 회귀 테스트 (wave 2)
- [x] 01-04-PLAN.md — 루트 레이아웃 배선(폰트 게이팅 + onInit 마이그레이션) + 부팅 확인 화면 (wave 3)
- [x] 01-05-PLAN.md — EAS Dev Client 빌드 + 창업자 iPhone 실기기 설치·실행 검증 (wave 4)

### Phase 2: Notification Infrastructure

**Goal**: 앱이 체크인/회고 리마인더를 신뢰성 있게 스케줄링하고 스스로 복구하며, 확정된 권한 프롬프트 문구와 거부 상태 UI 패턴을 갖춘다.
**Depends on**: Phase 1
**Requirements**: REQ-notification-scheduling, REQ-permission-copy, REQ-notification-denied-flow
**Success Criteria** (what must be TRUE):

  1. 사용자가 반복 체크인·하루 마무리 리마인더를 예정대로 받으며, 종류당 반복 캘린더 트리거 1개만 사용한다(매일 재스케줄링 없음).
  2. 사용자가 4개 iOS 권한 프롬프트(위치/카메라/사진 라이브러리/알림) 각각에 대해 OS 다이얼로그가 뜨기 전에 확정된 구체적 문구를 본다.
  3. 알림 권한이 거부되면 사용자는 (오류가 아닌) 조용한 상태 배너와 설정 딥링크를 보며, 앱이 포그라운드로 돌아올 때 권한 상태를 재확인한다.
  4. 예정된 트리거가 조용히 사라지면(알려진 iOS 실패 모드), 자가진단 레지스트리가 앱이 다음에 포그라운드로 올 때 이를 감지해 재생성하며, 매일 재스케줄링 방식으로 되돌아가지 않는다.

**Plans**: 8 plans (5 waves)

- [x] 02-01-PLAN.md — expo-notifications 설치 + 타입/문구/deps 계약 + 인메모리 테스트 더블 (wave 1)
- [x] 02-02-PLAN.md — iOS 권한 문구 3종 app.json 반영 + plugin 덮어쓰기 회귀 가드 (wave 1)
- [x] 02-03-PLAN.md — 반복 캘린더 트리거 스케줄링 + 기대 id 집합 + 고아 정리 (wave 2)
- [x] 02-04-PLAN.md — 권한 조회/요청 + 배너 판정 + 포그라운드 재확인 + priming 세션 (wave 2)
- [x] 02-05-PLAN.md — 자가진단 레지스트리 selfHeal + 포그라운드 오케스트레이터 (wave 3)
- [x] 02-06-PLAN.md — 알림 priming 화면 + 거부 배너 컴포넌트 + UI 계약 테스트 (wave 3)
- [x] 02-07-PLAN.md — _layout/index 배선(SafeAreaProvider, AppState 리스너, 배너, priming 게이트) (wave 4)
- [x] 02-08-PLAN.md — EAS Dev Client 재빌드 + 창업자 iPhone 실기기 검증 (wave 5)

### Phase 3: Check-in Core Loop

**Goal**: 사용자가 자유형 체크인(위치 + 선택적 사진/메모)을 GPS·저장 실패를 포함해 안정적으로 남길 수 있다.
**Depends on**: Phase 2
**Requirements**: REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-location-denied-flow
**Success Criteria** (what must be TRUE):

  1. 체크인을 탭하면 사진/메모 입력이 가능해지기 전에 기기 위치를 캡처해 즉시 SQLite에 저장한다.
  2. 사용자는 (GPS 성공/실패/저정확도 관계없이) 항상 드래그로 보정 가능한 확인 핀을 보며, 5초 타임아웃 시 마지막으로 알려진 위치로 폴백한다.
  3. 저장이 실패하면 앱이 자동으로 한 번 재시도한 뒤 명확한 실패 메시지와 재시도 버튼을 보여주며, 저장이 성공할 때까지 메모/사진 입력을 막는다.
  4. 위치 권한이 거부되면 사용자는 알림 거부와 동일한 조용한 배너+설정 딥링크 패턴을 보며, (OS 캐시가 아닌) 앱 소유의 폴백 위치가 뒷받침한다.
  5. 진행 중인 체크인 드래프트는 저장되거나 명시적으로 폐기될 때까지 앱 백그라운드 전환/재실행을 버텨내며, 날짜 경계 만료와 단일 드래프트 전용 엣지케이스를 포함한다.

**Plans**: 12 plans (8 waves)

- [x] 03-01-PLAN.md — 네이티브 모듈 5종 설치 + checkin DI 골격(config/deps) + 테스트 더블 3종 (wave 1)
- [x] 03-02-PLAN.md — D-07 최종 폴백 좌표 창업자 확정 체크포인트 + fallbackLocation 상수 모듈 (wave 1)
- [x] 03-03-PLAN.md — drafts 테이블 DDL + DATABASE_VERSION 2 마이그레이션 + 데이터 보존 회귀 (wave 1)
- [x] 03-04-PLAN.md — localDate/draftRepo/checkinRepo (1회 자동 재시도 + insert 성공 후에만 드래프트 삭제) (wave 2)
- [x] 03-05-PLAN.md — 위치 권한 모듈 + LocationDeniedBanner + UI 계약 테스트 (wave 2)
- [x] 03-06-PLAN.md — 사진 액션시트 + documentDirectory 복사(UUID 파일명, 출처 보존) (wave 2)
- [x] 03-07-PLAN.md — 5초 타임아웃 레이스 + 3단계 폴백 체인 + location_source 5값 매핑 확정 (wave 3)
- [x] 03-08-PLAN.md — 체크인 상태 머신 리듀서 + 액션 카드(메모/사진은 SAVED에서만 마운트) (wave 4)
- [x] 03-09-PLAN.md — 최소 지도 화면 배선(MapView + 배너 스택 + 알약버튼 + 확인 핀 드래그 + 드래프트 upsert) (wave 5)
- [x] 03-10-PLAN.md — 저장 커밋 + 메모/사진 저장 + 드래프트 복구 + 미저장 이탈 안내 + 키보드 회피 (wave 6)
- [x] 03-11-PLAN.md — EAS Dev Client 재빌드 + 창업자 iPhone 실기기 검증 5종 (wave 7)
- [x] 03-12-PLAN.md — [gap closure] 체크인 알약버튼 라벨 비가시 회귀 수정(크로스페이드 Animated.Value 재동기화) + 실기기 재검증 (wave 8)

### Phase 4: Today View

**Goal**: 사용자가 오늘의 체크인들을 지도에서 보여주는 홈 화면과, 새 체크인을 위한 마찰 낮은 진입점을 갖는다.
**Depends on**: Phase 3
**Requirements**: REQ-today-view, REQ-photo-resize, REQ-onboarding-empty-state, REQ-trajectory-line
**Success Criteria** (what must be TRUE):

  1. 사용자가 오늘 탭을 열면 3단 스냅 바텀시트(CLOSED/DRAGGING/OPEN)가 있는 지도가 보이며, 오늘의 실제 체크인들이 시간순으로 나열된다.
  2. 바텀시트 상태와 무관하게 플로팅 체크인 버튼에 항상 접근할 수 있다.
  3. 체크인 시 첨부된 사진은 최대 1600px로 리사이징되어 `documentDirectory` 하위에 저장되어 OS 캐시 삭제에도 살아남는다.
  4. 얇고 채도 낮은 궤적선이 오늘의 체크인들을 시간순으로 연결하며, 거리/시간 라벨은 없다.
  5. 첫 사용자는 알림 priming 외에 별도의 온보딩 플로우를 보지 않으며, 위치 권한은 첫 체크인 탭 시점에 맥락적으로 요청된다.

**Plans**: 7 plans (5 waves)

- [x] 04-01-PLAN.md — MigratableDb getAllAsync 확장 + getTodayCheckins 단일 공유 쿼리 + 궤적 좌표 파생 (wave 1)
- [x] 04-02-PLAN.md — expo-image-manipulator 도입 + 방향 인식 1600px 리사이징 → documentDirectory 저장 (wave 1)
- [x] 04-03-PLAN.md — (tabs) 탭 셸(오늘/캘린더) + 캘린더 플레이스홀더 + 오늘 화면 라우트 이동 (wave 1)
- [x] 04-04-PLAN.md — @gorhom/bottom-sheet 도입(정당성 게이트) + CheckinListRow + TodayBottomSheet (wave 2)
- [x] 04-05-PLAN.md — 오늘 체크인 조회 배선 + accentSoft 저장 핀 + Polyline 궤적선 (wave 3)
- [x] 04-06-PLAN.md — 바텀시트 마운트 게이트(D-04) + animatedPosition 기반 플로팅 버튼 오프셋(D-05) (wave 4)
- [x] 04-07-PLAN.md — EAS Dev Client 재빌드 + 시뮬레이터 자체 검증 + 실기기 전용 항목 검증 (wave 5)

**UI hint**: yes

### Phase 5: Check-in Detail & Edit

**Goal**: 사용자가 기록된 개별 체크인을 조회·수정·삭제할 수 있다.
**Depends on**: Phase 4
**Requirements**: REQ-checkin-detail-base, REQ-checkin-detail-layout, REQ-checkin-detail-flush, REQ-maps-deeplink, REQ-checkin-swipe-delete
**Success Criteria** (what must be TRUE):

  1. 완료된 체크인 행을 탭하면 시간(모노스페이스) → 정적 지도 미리보기 → "지도 앱에서 열기" → 사진 → 메모 순서로 상세화면이 열린다.
  2. 사용자는 상세화면에서 언제든 메모/사진을 수정할 수 있으며, 저장되지 않은 메모 수정 내용은 앱이 백그라운드로 전환될 때 강제로 flush된다.
  3. "지도 앱에서 열기"는 저장되지 않은 수정 내용을 잃지 않고 지도 앱에서 위치를 연다.
  4. 사용자는 메모/사진 유무와 무관하게 체크인을 스와이프 삭제할 수 있으며(빨강이 아닌 Pin 테라코타 어포던스, 2026-09-01 갱신), 4초 스낵바로 되돌릴 수 있다.

**Plans**: 7 plans (5 waves)

- [x] 05-01-PLAN.md — 라우트 폴더 재구성((tabs)/index/{_layout,index}.tsx) + 회귀 가드 5개 파일 경로 갱신 (wave 1)
- [x] 05-02-PLAN.md — 데이터/유틸 레이어: getCheckinById·deleteCheckin·formatLocalMonthDay·PhotoStorageDeps.deleteFile (wave 1)
- [x] 05-03-PLAN.md — 상세화면 [id] 라우트 + 조회 + 시각/정적지도/사진 고정 레이아웃 (wave 2)
- [x] 05-04-PLAN.md — 메모 편집·저장 + beforeRemove 미저장 경고 + AppState flush + Maps 딥링크 (wave 3)
- [x] 05-05-PLAN.md — 리스트 행 탭 진입 + 스와이프 삭제 + 4초 지연 삭제/undo 스낵바 (wave 3)
- [x] 05-06-PLAN.md — 상세화면 사진 교체/삭제(D-03/D-04) + 파일 삭제 순서 원자성 (wave 4)
- [x] 05-07-PLAN.md — 전체 게이트 + 시뮬레이터 제스처 경합/시각 검증 + 사용자 확인 (wave 5)

**UI hint**: yes

### Phase 6: Calendar Tab

**Goal**: 사용자가 월 그리드와 빠른 날짜별 스크러버로 과거 날짜를 훑어볼 수 있다.
**Depends on**: Phase 5
**Requirements**: REQ-calendar-grid, REQ-past-date-view, REQ-date-scrubber, REQ-settings-screen
**Success Criteria** (what must be TRUE):

  1. 사용자가 캘린더 탭을 열면 오늘 날짜가 시각적으로 밑줄 표시된 월 그리드가 보이며, 과거 날짜를 탭하면 (체크인 버튼 없이) 그날의 읽기전용 지도+시트 뷰가 열린다.
  2. 과거 날짜 뷰에서 사용자는 플로팅 가로 날짜 스크러버를 드래그해 실시간으로 날짜 사이를 이동할 수 있으며, 범위 경계에서는 하드 클램프(러버밴딩 없음)되고 44×44pt 터치 타겟을 사용한다.
  3. 스크러버를 터치하면 바텀시트가 강제로 접혀 스크러빙 중에도 지도가 계속 보인다.
  4. Today 뷰 상단의 햄버거 아이콘(≡)을 탭하면 설정 화면이 열리며, 알림 빈도/하루 마무리 알림 토글(기본 켜짐)/버전 정보 3개 항목을 보여준다.

**Plans**: 8 plans (5 waves)

- [x] 06-01-PLAN.md — app_settings 스키마/마이그레이션 v3 + settingsRepo (wave 1)
- [x] 06-02-PLAN.md — 월 그리드·스크러버 순수 산수 + 월 범위 기록 조회 (wave 1)
- [x] 06-03-PLAN.md — 캘린더 탭 nested Stack + 월 그리드 화면 + fence 테스트 갱신 (wave 2)
- [x] 06-04-PLAN.md — 설정 화면 컴포넌트 + 문구/액션시트 단일 출처 (wave 2)
- [x] 06-05-PLAN.md — 과거 날짜 읽기전용 지도+시트 화면 + 탭바 숨김 (wave 3)
- [x] 06-06-PLAN.md — 설정 라우트 + Today 뷰 햄버거 진입점 + 포그라운드 자가진단 배선 (wave 3)
- [x] 06-07-PLAN.md — 플로팅 날짜 스크러버 + 시트 강제 접힘 통합 (wave 4)
- [x] 06-08-PLAN.md — 전체 검증 + 시뮬레이터 확인 + 창업자 승인 체크포인트 (wave 5)

**UI hint**: yes

### Phase 7: Day-end Reflection

**Goal**: 사용자가 하루 루프의 핵심 요소인 짧은 하루 마무리 회고를 완료할 수 있다.
**Depends on**: Phase 6
**Requirements**: REQ-reflection-base, REQ-reflection-autosave, REQ-reflection-save-failure-ui, REQ-reflection-copy-fix, REQ-reflection-notification, REQ-reflection-today-entry, REQ-past-reflection-edit
**Success Criteria** (what must be TRUE):

  1. 사용자가 (오늘의 정적 지도를 재사용하고 2개 프롬프트를 담은) 전체화면 하루 마무리 회고 모달을 열 수 있으며, `DailyReflection` 레코드로 저장된다. 이 모달은 탭 바를 숨기는 push 규칙이 아니라, 탭 바를 덮는 방식이다.
  2. 회고 답변은 5초 디바운스, 앱 백그라운드 전환, 모달 닫기(✕/스와이프) 시점에 — 모두 동일한 저장 함수를 통해 — 자동저장되며, 저장 실패 시 체크인 저장과 동일한 재시도 패턴을 사용한다.
  3. 이름이 바뀐 "오늘의 흔적" 행은 체크인 개수를 표시하지 않으며(진행률 수치 금지), 체크인이 0건이어도 오늘 뷰 바텀시트 리스트 최상단에 고정된다.
  4. 사용자는 기본으로 켜진 매일 고정 시각의 회고 리마인더를 받으며, 설정에서 끌 수 있는 토글이 있다.
  5. 과거 날짜 뷰에서 사용자는 그날의 회고 프롬프트도 편집할 수 있다(읽기전용 아님).

**Plans**: TBD
**UI hint**: yes

### Phase 8: Export & Polish

**Goal**: 사용자가 데이터를 로컬로 내보낼 수 있고, 앱이 이름/접근성 기준을 충족한다.
**Depends on**: Phase 7
**Requirements**: REQ-export, REQ-exif-geotag, REQ-exif-disclosure, REQ-app-name, REQ-accessibility-baseline
**Success Criteria** (what must be TRUE):

  1. 사용자가 수동으로 내보내기를 실행하면 JSON 파일과 사진 zip이 함께 생성된다.
  2. 카메라로 촬영한 사진은 내보내기 시 EXIF GPS 지오태그를 받으며, 라이브러리에서 선택한 사진에는 위치 메타데이터가 절대 주입되지 않는다.
  3. 내보내기 화면은 내보내기 전에 "사진에 위치 정보가 포함됩니다"를 고지한다.
  4. "FootLog"는 priming/설정 화면에서만 표시명으로 나타나며, 매일 보는 오늘 뷰에는 절대 노출되지 않는다.
  5. 모든 인터랙티브 요소가 44px 터치 타겟과 4.5:1 텍스트 대비를 충족하며, 아이콘 전용 버튼에는 VoiceOver 라벨이 붙는다.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phase 1~8은 numeric order로 순차 실행: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
Phase 9~12(백엔드/인증/클라우드)는 위 1단계 트랙과 별도로 병행 진행되는 독립 트랙이며, 트랙 내부는 순차: 9 → 10 → 11(9,10에 의존) → 12(10,11에 의존)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete   | 2026-08-26 |
| 2. Notification Infrastructure | 8/8 | Complete   | 2026-08-27 |
| 3. Check-in Core Loop | 12/12 | Complete   | 2026-08-28 |
| 4. Today View | 7/7 | Complete   | 2026-08-31 |
| 5. Check-in Detail & Edit | 7/7 | Complete   | 2026-08-31 |
| 6. Calendar Tab | 8/8 | Complete   | 2026-09-02 |
| 7. Day-end Reflection | 0/TBD | Not started | - |
| 8. Export & Polish | 0/TBD | Not started | - |
| 9. Backend Foundation | 6/6 | Complete   | 2026-09-02 |
| 10. Authentication (Kakao OAuth2/PKCE) | 5/7 | In Progress|  |
| 11. Object Storage (S3-compatible) | 0/TBD | Not started | - |
| 12. Client-Server Sync | 0/TBD | Not started | - |

### Phase 9: Backend Foundation

**Goal**: Spring Boot(Kotlin) 백엔드 프로젝트가 스캐폴딩되고, 서버측 DB 스키마와 마이그레이션 프레임워크가 존재한다.
**Depends on**: Nothing (1단계 roadmap과 독립된 트랙 — Phase 6~8과 병행)
**Requirements**: REQ-backend-scaffold, REQ-backend-db-schema
**Success Criteria** (what must be TRUE):

  1. Spring Boot(Kotlin) 프로젝트가 초기화되고 로컬/스테이징 환경에서 빌드·기동된다.
  2. 서버측 DB에 클라이언트 `Checkin`/`DailyReflection` 스키마에 대응하는 테이블이 존재하며, 버전 관리되는 마이그레이션 프레임워크로 스키마를 변경할 수 있다.

**Plans**: 6 plans (5 waves)

- [x] 09-01-PLAN.md — Spring Boot 4.1.1(Kotlin/Gradle KTS) 스캐폴딩 + Boot4 Flyway/allOpen 함정 차단 + 프로파일 3종 (wave 1)
- [x] 09-02-PLAN.md — Flyway V1~V3 마이그레이션(users/checkins/daily_reflections) + Testcontainers 스키마 계약 테스트 (wave 2)
- [x] 09-03-PLAN.md — multi-stage Dockerfile + .dockerignore + backend/** 경로 필터 GitHub Actions CI (wave 2)
- [x] 09-04-PLAN.md — JPA 엔티티/리포지토리 3종 + 클라이언트 발급 UUID 보존 왕복 테스트 (wave 3)
- [x] 09-05-PLAN.md — 헬스체크/actuator 노출 잠금 + staging 프로파일 기동 테스트 + REQUIREMENTS.md 갱신 (wave 4)
- [x] 09-06-PLAN.md — 전체 게이트(build/docker/bootRun) + 스테이징 범위·PaaS 벤더 창업자 결정 (wave 5)

### Phase 10: Authentication (Kakao OAuth2/PKCE)

**Goal**: 사용자가 카카오 계정으로 OAuth2/PKCE 로그인해 인증 토큰을 발급받는다.
**Depends on**: Phase 9
**Requirements**: REQ-auth-kakao-oauth, REQ-auth-session-token
**Success Criteria** (what must be TRUE):

  1. 사용자가 카카오 로그인 화면에서 OAuth2/PKCE 플로우를 완료하면 서버가 사용자 계정을 생성/조회하고 인증 토큰을 발급한다.
  2. 클라이언트는 발급된 토큰을 안전하게 저장하고, 만료 시 갱신하며, 이후 모든 서버 요청에 사용한다.

**Plans**: 7 plans (4 waves)

- [x] 10-01-PLAN.md — 카카오 개발자 콘솔 앱 등록 게이트 + 패키지 정통성 확인 + 환경변수 계약 (wave 1)
- [x] 10-02-PLAN.md — Flyway V4 users 카카오 필드 확장(BIGINT/UNIQUE/nullable) + User 엔티티·리포지토리 (wave 1)
- [x] 10-03-PLAN.md — Spring Security 7 + NimbusJwt 발급/검증 인프라 + access/refresh 구분 디코더 2종 (wave 1)
- [x] 10-04-PLAN.md — 카카오 /v2/user/me 조회 + find-or-create + 자체 JWT 발급 서비스 (wave 2)
- [ ] 10-05-PLAN.md — POST /api/auth/kakao/login · /api/auth/refresh + 필터 체인 계약 테스트 (wave 3)
- [x] 10-06-PLAN.md — 클라이언트 SecureStore 토큰 보관 + 만료 임박 선제 갱신 + authorizedFetch (wave 2)
- [ ] 10-07-PLAN.md — 개발자 검증 화면 + Dev Client 재빌드 + 실기기 카카오 왕복 검증 (wave 4)

**Note**: D-14는 계획 단계에서 수정됨 — 네이티브 SDK가 인가 코드가 아니라 카카오 accessToken을
직접 반환하므로, 백엔드는 `kauth.kakao.com/oauth/token` 교환 없이 `/v2/user/me`만 호출한다.
10-CONTEXT.md D-14 / 10-RESEARCH.md ⚠️ AMENDMENT 블록 참고.

### Phase 11: Object Storage (S3-compatible)

**Goal**: 체크인 사진이 S3 호환 오브젝트 스토리지에 업로드·조회된다.
**Depends on**: Phase 9, Phase 10 (인증된 요청만 업로드 허용)
**Requirements**: REQ-storage-s3-upload, REQ-storage-access-control
**Success Criteria** (what must be TRUE):

  1. 인증된 사용자가 체크인 사진을 서버 경유로 S3 호환 오브젝트 스토리지에 업로드할 수 있다.
  2. 업로드된 사진은 소유자만 접근 가능한 방식(서명 URL 또는 동등한 접근 제어)으로 조회된다.

**Plans**: TBD

### Phase 12: Client-Server Sync

**Goal**: 클라이언트 SQLite와 서버 DB 간 local-first 동기화가 이뤄진다.
**Depends on**: Phase 10, Phase 11
**Requirements**: REQ-sync-local-first, REQ-sync-conflict-resolution
**Success Criteria** (what must be TRUE):

  1. 오프라인 상태에서 작성된 체크인/회고가 클라이언트 SQLite에 즉시 반영되고, 온라인 복귀 시 서버와 자동 동기화된다.
  2. 동일 레코드가 여러 기기에서 수정된 충돌 상황이 정의된 전략(예: last-write-wins 또는 필드 단위 병합)으로 결정론적으로 해소된다.

**Plans**: TBD
