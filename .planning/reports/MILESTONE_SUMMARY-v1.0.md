# Milestone v1.0 — Project Summary

**Generated:** 2026-08-27
**Purpose:** Team onboarding and project review
**Status:** In progress — 3 of 8 phases complete (mid-milestone snapshot, not yet archived)

---

## 1. Project Overview

**FootLog**는 창업자 1인이 매일 자신의 위치를 짧게 "체크인"으로 남기는 습관을 만들기 위한 로컬 전용 iOS 앱입니다.

**Core value:** 체크인을 남기는 행위가 실제 매일의 사용을 버텨낼 만큼 마찰이 적어야 합니다 — 이 습관이 형성되지 않으면 앱의 다른 어떤 부분도 의미가 없습니다.

1단계(현재 마일스톤 v1.0)는 **로컬 전용 MVP**입니다: 백엔드/인증/클라우드 없음, 창업자 본인의 iPhone 한 대만이 유일한 실행 환경입니다. 명시적 kill condition(1~2주 트라이얼 중 3일 연속 체크인 0건, 또는 메모/사진 첨부율 20% 미만)이 이 마일스톤 이후 백엔드 단계 착수 여부를 가릅니다.

**진행 상태:** Phase 1(Foundation), Phase 2(Notification Infrastructure), Phase 3(Check-in Core Loop) 완료. Phase 4(Today View)부터 8(Export & Polish)까지 5개 Phase는 아직 계획도 시작되지 않았습니다.

## 2. Architecture & Technical Decisions

- **DI 3파일 분리 패턴** (`config.ts` 타입 전용 / `deps.ts` 런타임 import 유일 지점 / `testing/fake*.ts` 더블)
  - **Why:** 네이티브 모듈(expo-notifications, expo-location 등)을 테스트 환경에서 안전하게 격리하기 위해
  - **Phase:** 2에서 확립, 3에서 `src/checkin/`에 동일 패턴 복제

- **SQLite `PRAGMA user_version` 마이그레이션 프레임워크**
  - **Why:** 별도 ORM 없이 스키마 버전을 관리하면서 트랜잭션 경계를 앱이 직접 통제
  - **Phase:** 1에서 구축, 3에서 `drafts` 테이블 추가로 확장(v1→v2)

- **알림 스케줄링 = 반복 캘린더 트리거(방법 A) + 자가진단 레지스트리**, 매일 재스케줄링(방법 B) 아님
  - **Why:** iOS 64개 대기 알림 한도를 피하고, "iOS 반복 트리거가 조용히 멈추는" 알려진 실패 모드를 자가진단으로 완화
  - **Phase:** 2

- **확인 핀 드래프트를 AsyncStorage가 아닌 SQLite `drafts` 테이블(고정 PK 단일 row)로 영속화**
  - **Why:** 새 저장 엔진을 도입하지 않고 드래프트와 실제 체크인을 같은 트랜잭션 경계에서 처리하기 위해; "드래프트는 항상 최대 1개"를 스키마 레벨에서 강제
  - **Phase:** 3 (D-03, D-04)

- **저장 실패 복구를 별도 상태로 만들지 않고 기존 드래프트 복구 메커니즘에 통합**
  - **Why:** `checkins` insert 성공 전까지 드래프트 row가 살아있으므로, 앱 재실행 시 기존 "이어서 체크인하시겠어요?" 프롬프트가 저장 실패 케이스도 자동으로 커버
  - **Phase:** 3 (D-05)

- **사진은 `documentDirectory`에만 저장, `cacheDirectory` 금지**
  - **Why:** OS가 디스크 공간 부족 시 백그라운드 앱 몰래 캐시를 비울 수 있어 `photo_path` 참조가 조용히 깨질 위험
  - **Phase:** 3 (D-02), 리사이징 자체는 Phase 4로 이연

- **최소 지도 화면을 Phase 3에 임시 배치**(Today view의 바텀시트는 아직 없음)
  - **Why:** 지도 렌더링·GPS 캡처·확인 핀 드래그 로직을 Phase 4에서 그대로 재사용하기 위해, 화면을 미리 실체화해 수동 QA도 가능하게 함
  - **Phase:** 3 (D-06)

- **위치 폴백 3단계 체인의 최종 기본 좌표 = 창업자 본인 실생활권 좌표(하드코딩)**
  - **Why:** 1단계는 창업자 1인용 로컬 앱이라 `(0,0)` 같은 무의미한 좌표보다 실제 좌표가 최초 실행 경험에 나음
  - **Phase:** 3 (D-07, checkpoint를 통해 창업자가 직접 값 제공: 37.3789, 127.1145)

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 1 | Foundation | ✓ Complete (5/5 plans) | Expo/EAS 스캐폴드, 디자인 토큰(`tokens.ts`), SQLite 마이그레이션 프레임워크, 실기기 부팅 확인까지 완료 |
| 2 | Notification Infrastructure | ✓ Complete (8/8 plans) | 반복 캘린더 트리거 스케줄링 + 자가진단 레지스트리, 권한 프롬프트 문구, 거부 배너, 실기기 검증(정각 수신은 시간 제약으로 미검증) |
| 3 | Check-in Core Loop | ✓ Complete (11/11 plans) | 위치 캡처→즉시 저장→저장 실패 복구→확인 핀 드래그→드래프트 복구까지 체크인 코어 루프 전체, 실기기 검증 5/5 통과 |
| 4 | Today View | ○ Not started | 지도+3단 바텀시트 홈 화면, 사진 리사이징, 궤적선 (UI hint: yes) |
| 5 | Check-in Detail & Edit | ○ Not started | 체크인 상세/편집, 지도 앱 딥링크, 스와이프 삭제 |
| 6 | Calendar Tab | ○ Not started | 월 그리드, 과거 날짜 읽기전용 뷰, 날짜 스크러버 |
| 7 | Day-end Reflection | ○ Not started | 하루 마무리 회고 모달, 자동저장, 회고 알림 |
| 8 | Export & Polish | ○ Not started | 로컬 내보내기, EXIF 지오태깅, 접근성 기준 |

**Total: 24/24 계획된 plan 완료 (3/8 phase 완료, 전체 milestone 기준 진행률은 미계획 phase 포함 시 더 낮음)**

## 4. Requirements Coverage

v1 요구사항 34개 중 **10개 완료**, 나머지는 미계획 Phase에 배정된 상태(Pending)입니다.

- ✅ **Foundation (3/3):** REQ-foundation-setup, REQ-design-tokens, REQ-sqlite-migrations
- ⚠️ **Notification infrastructure (1/3):** REQ-permission-copy만 완료. REQ-notification-scheduling, REQ-notification-denied-flow는 REQUIREMENTS.md 표에는 "Pending"으로 남아있으나 02-SUMMARY 실기기 검증(02-08)에서 우선순위 기능 대부분 확인됨 — 트래킹 표 갱신 여부는 `/gsd:audit-uat` 로 재확인 권장.
- ✅ **Check-in core loop (4/4):** REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-location-denied-flow — 전부 완료, 단 아래 6절의 human-verify 항목 1건 미종결.
- ❌ **Today view, Check-in detail & edit, Calendar tab, Day-end reflection, Export & polish (24개):** 전부 Pending — Phase 4~8 미착수.

## 5. Key Decisions Log

**Phase 2 (02-CONTEXT.md):**
- D-01: 빈도 선택 UI는 Phase 2에 만들지 않음 — 파라미터화된 함수로만 검증, 실제 UI는 Phase 6.
- D-02: Phase 2 하드코딩 기본 빈도 = 매시간.
- D-03~D-04: Info.plist 권한 문구는 한국어 전용, 담담한 톤으로 확정.
- D-05: '알림' 권한 프롬프트는 OS 커스텀 문구를 지원하지 않아 기존 priming 화면 문구로 요구사항 충족 간주.
- D-06: 시간대 변경 시 반복 트리거 재정렬 실기기 검증은 Phase 2 범위에서 제외(TODOS.md로 유예).
- D-07: 자가진단 동작 확인은 콘솔 로그만으로 충분 — 사용자 노출 UI 없음.

**Phase 3 (03-CONTEXT.md):**
- D-01~D-02: 사진 첨부 UI/권한은 Phase 3, 리사이징·최종 저장 규약은 Phase 4로 스코프 분리. 원본은 `documentDirectory`에 임시 보관.
- D-03~D-04: 확인 핀 드래프트는 SQLite `drafts` 테이블, 고정 PK 단일 row.
- D-05: 저장 실패 복구는 기존 드래프트 복구 메커니즘에 통합(별도 상태 플래그 없음).
- D-06: Today view가 없으므로 Phase 3에 최소 지도+체크인 버튼 화면을 임시 배치.
- D-07: 최종 폴백 좌표 = 창업자 실생활권 좌표(37.3789, 127.1145), 창업자가 checkpoint에서 직접 제공.

**PROJECT.md Key Decisions (선별):**
- 1단계는 로컬 전용, 백엔드 없음 — 세션 중 두 번 뒤집힌 끝에 정착.
- 체크인 모델은 슬롯 기반이 아니라 자유형 — "놓친 슬롯" 개념 자체가 없음.
- 하단 탭 바(오늘/캘린더) 도입, "지도가 어디서나 엣지투엣지" 대체.
- 하루 마무리 회고는 2단계 추가기능이 아니라 핵심 루프의 일부.
- 진행률/완료 수치 UI 노출 절대 금지(CRITICAL, 문서 전반) — AI 생성 목업에서 반복적으로 재도입되었다가 반복적으로 거부됨.

## 6. Tech Debt & Deferred Items

**미종결 human-verify 항목 (03-VERIFICATION.md, status: human_needed):**
- 코드 리뷰(03-REVIEW.md CR-01)가 "SAVED 상태에서 IDLE로 돌아갈 방법이 없어 세션당 체크인 1회만 가능"한 Critical 버그를 발견, 수정하며 "지도 빈 영역 탭 → 카드 닫기" 제스처를 새로 발명해 배선함. 이 제스처는 03-UI-SPEC.md에 정의돼 있지 않아 디자인 의도와 일치하는지 확인이 필요했음 — **대화 중 창업자가 실기기에서 직접 확인·승인**(2026-08-27). 다만 03-HUMAN-UAT.md는 아직 `status: partial`로 남아있어, `/gsd:verify-work 3` 실행 전까지 감사 도구(`audit-uat`)에 계속 노출됨.

**PROJECT.md에 기록된 열린 질문(창업자 판단 대기, 요구사항 미확정):**
- Apple Journal(iOS 17+ 내장 저널링 앱) 대체 가능성 — go/no-go 미결.
- 사진 권한 거부 vs 리사이징 실패 문구가 현재 하나의 인라인 문구를 공유 중 — 분리 필요(P3).
- 하루 첫 체크인 보상 신호와 반게이미피케이션 원칙의 긴장 관계 — 진지한 디자인 고민 필요(P3).
- 확인 핀 드래그 보정 제스처에 VoiceOver 대체 경로 없음 — 인지된 gap, 우선순위 낮음(P3, REQ-accessibility-baseline 인수 조건에서 명시적으로 제외).
- 시간대 변경 시 반복 트리거 실기기 검증 — Phase 2에서 제외, 아직 미검증(P2).

**Deferred to v2 / Out of Scope (REQUIREMENTS.md):**
- REQ-phase2-backend — Spring Boot/Kotlin 백엔드, 카카오 OAuth2/PKCE, S3, 동기화. 1단계 정성적 트라이얼 통과가 조건.
- REQ-calendar-multiselect-drag — 캘린더 드래그 멀티셀렉트, 스펙 문서 자체에서 1단계 제외.
- 주간 반복 패턴 분석, 하루 리뷰 글쓰기, 위젯/잠금화면 퀵 체크인, Apple Watch 컴패니언, 날씨/기온 자동 캡처(네트워크 의존이라 명시적 거부).

**빌드 중 관찰된 환경 이슈 (비차단):**
- `npx expo-doctor`가 12개 패키지의 SDK 57 패치 버전 드리프트를 보고(Phase 1/2에서 이미 존재하던 상태, Phase 3 범위 밖).
- 02-08: 정각 알림 실제 수신, 자가진단 재생성 로그 실기기 검증은 시간 제약으로 미완료.

## 7. Getting Started

- **Run the project:** `npm start` (Metro) 후 EAS Dev Client로 iPhone에서 실행 — **Expo Go 사용 불가** (`react-native-maps` 등 네이티브 모듈 필수). 새 네이티브 모듈 추가 시 EAS Dev Client 재빌드 필요(`eas build --profile development --platform ios`).
- **Key directories:**
  - `src/app/` — expo-router 화면(현재 `index.tsx`가 체크인 코어 루프의 메인 화면)
  - `src/checkin/` — 체크인 도메인 로직(리포지토리, 리듀서, 위치 캡처, 사진, 권한)
  - `src/notifications/` — 알림 스케줄링/권한/자가진단 레지스트리
  - `src/db/` — SQLite 스키마 + `PRAGMA user_version` 마이그레이션
  - `src/theme/` — 디자인 토큰(색상/타이포/스페이싱), DESIGN.md가 단일 소스
  - `src/components/` — 재사용 프레젠테이셔널 컴포넌트
- **Tests:** `npm test` (Jest, `NODE_OPTIONS=--experimental-sqlite`) — 현재 275개 테스트, 26개 스위트, 전부 green. `npx tsc --noEmit`으로 타입 체크.
- **Where to look first:** `DESIGN.md`(모든 UI 결정의 단일 소스), `.planning/PROJECT.md`(제품 컨텍스트/제약/kill condition), `.planning/ROADMAP.md`(8-phase 로드맵과 각 phase의 성공 기준).

---

## Stats

- **Timeline:** 2026-08-25 → 2026-08-27 (진행 중, 3일)
- **Phases:** 3 / 8 complete
- **Commits:** 173 (첫 phase 리서치 커밋부터 HEAD까지)
- **Files changed:** 172 (+34,638 / -47)
- **Contributors:** jaeseung choun
