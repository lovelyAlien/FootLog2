# FootLog Phase 1 — 마스터 구현 체크리스트

TODOS.md "5개 설계 문서 태스크 통합 체크리스트 부재" 항목의 해결 결과물.
`footlog-product-design.md`(부모) + 자식 문서 3개(`day-end-reflection-map.md`,
`calendar-multiselect-view.md`, `calendar-date-scrubber.md`)에 흩어진 Phase 1
스코프 태스크를 하나의 빌드 순서로 통합. **원본 태스크의 Surfaced
by/Files/Verify는 그대로 각 문서에 남아있음 — 이 문서는 순서를 정하는
인덱스이지 내용을 복제한 문서가 아님.** 구현 시 이 파일로 순서를 잡고,
디테일은 원본 ID를 따라가서 확인할 것.

**소스 ID 접두어:** `PD` = footlog-product-design.md, `DE` = day-end-reflection-map.md,
`CM` = calendar-multiselect-view.md, `CS` = calendar-date-scrubber.md.

**이 문서를 만들며 새로 발견한 것 (기존 어느 문서에도 번호로 없던 gap):**
하루 마무리 모달의 **기본 빌드(base build)** 자체가 어느 문서에도 명시적
태스크로 없습니다. `day-end-reflection-map.md`의 T1~T5는 전부 "리뷰에서
발견된 수정사항"이지 "화면을 처음 만드는 태스크"가 아니고, `footlog-product-design.md`
쪽에도 이 화면을 만드는 태스크가 없습니다 — 스펙(지도 재사용+프롬프트 2칸
+DailyReflection 모델)은 그 문서의 Premises/Visual Design Decisions/Data
Model 섹션에 산문으로만 존재합니다. 아래 6단계에 `[신규발견]`으로 명시.

---

## 0. Foundation
- [ ] **M1 [PD-T1]** 프로젝트 셋업 — Expo 초기화 + EAS Dev Client
- [ ] **M2 [PD-T21]** DESIGN.md 토큰 상수 파일 export — *순서 조정: 원문서엔 후반부(Design phase) 태스크지만, 이후 모든 화면이 hex 리터럴 대신 이 상수를 import해야 하므로 앞으로 당김*
- [ ] **M3 [PD-T23]** SQLite 마이그레이션 프레임워크 + 스키마 확장 필드 — *순서 조정: T3(체크인 저장) 착수 전에 스키마 관리 체계가 있어야 함*

## 1. 알림 인프라
- [ ] **M4 [PD-T2, PD-T22, PD-T31 통합]** 알림 스케줄링 + 자가진단 레지스트리 패턴(부분실패 탐지 + 고아 트리거 정리 포함) — *하루 마무리 알림(6단계)이 이 레지스트리에 `daily_reflection` kind로 이미 등록되게 설계돼 있음, 6단계보다 먼저 완성 필요*
- [ ] **M5 [PD-T18]** iOS 권한 프롬프트 문구 4종(위치/카메라/사진 라이브러리/알림) 확정
- [ ] **M6 [PD-T8]** 알림 권한 거부 시 전체 플로우 — depends on M4, M5

## 2. 체크인 코어 루프
- [ ] **M7 [PD-T3]** 체크인 코어 플로우 (위치 캡처 → SQLite 저장 → 선택적 사진/메모)
- [ ] **M8 [PD-T4]** SQLite 쓰기 실패 UI — extends M7
- [ ] **M9 [PD-T5, PD-T24, PD-T32 통합]** 체크인 확인 핀 흐름 + 드래프트 영속화(만료/삭제/단일드래프트/권한변경 4개 엣지케이스 포함)
- [ ] **M10 [PD-T19]** 위치 권한 거부 시 플로우 — extends M9

## 3. 오늘 뷰
- [ ] **M11 [PD-T6]** 오늘 뷰(지도+바텀시트 3단 스냅) — *주의: "오늘 돌아보기" 행은 지금 넣지 않음, 6단계에서 추가*
- [ ] **M12 [PD-T7]** 사진 리사이징 — *2026-08-24 확장분 포함: 카메라/라이브러리 출처를 구분해서 저장(M22의 EXIF 태깅이 이 구분에 의존)*
- [ ] **M13 [PD-T9]** 첫 실행 empty state + 온보딩
- [ ] **M14 [PD-T14]** 오늘의 이동 궤적선

## 4. 체크인 상세/편집
- [ ] **M15 [PD-T13]** 체크인 상세화면(메모/사진 수정) 기본 빌드
- [ ] **M16 [PD-T28]** 상세화면 레이아웃 순서 확정 반영(시간→정적지도→지도앱열기→사진→메모) — extends M15
- [ ] **M17 [PD-T29]** AppState 배경전환 시 미저장 메모 강제 flush — extends M15
- [ ] **M18 [PD-T26]** "지도 앱에서 열기" 딥링크 버튼 — depends on M17(먼저 없으면 메모 유실 위험)
- [ ] **M19 [PD-T11]** 개별 체크인 스와이프 삭제

## 5. 캘린더 탭
- [ ] **M20 [CM-T1a, CM-T5 통합]** 캘린더 탭 홈(월 그리드, 단순 탭만) + 오늘 accent 밑줄
- [ ] **M21 [PD-T10]** 캘린더 과거 날짜 뷰(읽기전용) — depends on M20(진입점)
- [ ] **M22 [CS-T1~T4 통합]** 날짜 스크러버 4개 디테일(강제접힘/경계클램프/터치타겟/헤더높이) — extends M21

## 6. 하루 마무리 (day-end reflection)
- [ ] **M23 `[신규발견]`** 하루 마무리 모달 기본 빌드 — 지도 재사용(정적) + 프롬프트 2칸 + `DailyReflection` 데이터 모델 + 진입점 연결. 스펙 출처: `day-end-reflection-map.md`의 Premises/Visual Design Decisions/Data Model 섹션(번호 있는 태스크 아님)
- [ ] **M24 [DE-T2]** 디바운스 5초 + AppState 배경전환 flush + **✕/스와이프 닫기 flush**(2026-08-24 Eng 리뷰에서 재발견 후 Premise 7에 반영된 최신 스펙 — 두 flush 경로 다 구현할 것)
- [ ] **M25 [DE-T1]** 자동저장 실패 UI
- [ ] **M26 [DE-T3]** "오늘의 흔적" 섹션명 + 개수표기 제거
- [ ] **M27 [DE-T4]** "오늘 돌아보기" 알림 기본 켜짐 + 설정 토글 — depends on M4(레지스트리에 이미 daily_reflection kind로 반영돼 있음)
- [ ] **M28 `[연계]`** 오늘 뷰 바텀시트 리스트 최상단에 "오늘 돌아보기" 행 추가 — M11(오늘 뷰) 위에 얹는 작은 수정, `day-end-reflection-map.md` Premise 5 참고
- [ ] **M29 [DE-T5]** M21(과거 날짜 뷰)에 과거 회고 열람·편집 추가 — depends on M23(DailyReflection 모델이 있어야 함)

## 7. 내보내기
- [ ] **M30 [PD-T20]** 로컬 데이터 수동 내보내기(JSON+사진 zip)
- [ ] **M31 [PD-T25]** 사진 EXIF GPS 태깅(카메라 사진 한정) — depends on M12(카메라/라이브러리 출처 구분)
- [ ] **M32 [PD-T30]** EXIF 위치 태깅 고지 문구 — extends M31

## 8. 마무리
- [ ] **M33 [PD-T15]** 앱 표시 이름 "FootLog" 반영
- [ ] **M34 [PD-T16]** 접근성 기본 적용(터치타겟/명도대비/VoiceOver 라벨)

## 문서 작업 (구현 불필요, 이미 완료)
- [x] **[PD-T27]** kill condition — 2026-08-24에 Success Criteria 섹션에 직접 반영 완료. 태스크로는 남아있지만 실제 작업은 이미 끝남.

---

## Phase 2 — 지금 하지 않음 (착수 금지)
- **CM-T1b, CM-T2, CM-T3, CM-T4** — 캘린더 멀티셀렉트 드래그 + 결과 화면 전체. Phase 1 실사용 검증 통과 후 재검토.
- `footlog-product-design.md`의 "2단계 (확장)" 전체(Spring Boot 백엔드, 카카오 OAuth, S3, 주간 패턴 분석 등)

## 알려진 순서 유연성
M2(디자인 토큰 파일), M14(이동 궤적선), M19(스와이프 삭제), M33/M34(마무리 항목)는
다른 태스크와 강한 의존관계가 없어 실제 구현 중 순서가 조금 바뀌어도 무방함 —
위 순서는 "논리적으로 막히지 않는 순서"이지 "반드시 이 순서여야 하는" 강제가 아님.
