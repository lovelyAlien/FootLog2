# TODOS

## /autoplan 리뷰에서 유예된 항목 (2026-08-23)

### 위젯/잠금화면 퀵 체크인 (P3)
**What:** iOS 잠금화면/홈화면 위젯에서 앱을 열지 않고 바로 체크인.
**Why:** 체크인까지의 마찰을 더 줄여 습관 형성 성공률을 높일 수 있음.
**Pros:** 알림 탭보다 빠른 경로, "확인 핀" 단계는 위젯에서 생략하고 앱 열림 시 뒤늦게 확인시켜도 됨.
**Cons:** WidgetKit 네이티브 브릿지가 필요해 Expo 관리형 워크플로우 밖 작업(EAS 네이티브 모듈), CC 기준으로도 1일 이상 소요 — Phase 1 블라스트 반경 밖.
**Context:** CEO 리뷰(2026-08-23, /autoplan)에서 SELECTIVE EXPANSION 체리픽 후보로 검토했으나 effort가 커 유예. Phase 1 핵심 루프(알림→체크인) 검증 이후 재검토.
**Depends on/blocked by:** Phase 1 실사용 검증 통과.

### 경쟁 구도 문단 추가 (P3)
**What:** 설계 문서에 Arc Timeline, Day One, Swarm 등 인접 서비스가 "잠깐 멈춰서 알아차리기"라는 핵심 가치를 해결하지 못하는 이유를 한 문단으로 명시.
**Why:** CEO 리뷰(Codex)가 지적 — 2단계 서비스화가 여전히 옵션으로 열려있는데 경쟁 분석이 전무함. 문서 완성도 문제일 뿐 지금 당장 막는 gap은 아님.
**Pros:** 나중에 2단계를 실제로 고려할 때 다시 조사할 필요 없음.
**Cons:** 순수 문서 작업, 빌드에 영향 없음.
**Context:** CEO 리뷰(2026-08-23), Codex가 Arc Timeline/iso.me/Jellyspot/Map My Day/PersonalMap을 구체적으로 지목.
**Depends on/blocked by:** 없음, 언제든 가능.

### 사진 권한 거부 vs 리사이징 실패 문구 분리 (P3)
**What:** 현재 "사진을 추가하지 못했어요" 한 문구로 세 다른 실패(카메라 권한 영구 거부 / 사진 라이브러리 권한 영구 거부 / 일회성 리사이징 실패)를 처리 — 각각 다른 복구 경로(설정 딥링크 vs 설정 딥링크 vs 재시도)가 필요. (2026-08-24 `/superpowers:brainstorming` — 사진 첨부에 라이브러리 선택 옵션이 추가되며 케이스가 2개→3개로 확장, `footlog-product-design.md` "사진 첨부 진입 방식" 참고)
**Why:** Design 리뷰(Claude 서브에이전트) 지적 — 권한 거부는 설정으로 보내야 하고, 리사이징 실패는 그냥 다시 시도하면 됨. 지금은 셋 다 같은 문구라 사용자가 뭘 해야 할지 불명확.
**Pros:** 더 명확한 복구 경로.
**Cons:** 저심각도 — 사진은 애초에 선택 사항이라 체크인 자체 실패보다 훨씬 낮은 임팩트.
**Context:** Design 리뷰(2026-08-23), 범위 확장은 브레인스토밍(2026-08-24).
**Depends on/blocked by:** 없음.

### 하루 첫 체크인의 긍정 신호 (P3)
**What:** 이동 궤적선은 체크인 2개 이상부터 나타남 — 하루의 첫 체크인은 담담한 크로스페이드 외엔 아무 보상 신호가 없음.
**Why:** Design 리뷰(Claude 서브에이전트) 지적. 단, 전제 #6(담담하게, 스트릭 압박 없음)과 정면으로 긴장 관계 — 빠른 수정이 아니라 진짜 디자인 고민이 필요.
**Pros:** 하루 시작 체크인의 심리적 보상 강화 가능.
**Cons:** 잘못 만들면 바로 게이미피케이션으로 보일 위험 — 신중한 검토 필요.
**Context:** Design 리뷰(2026-08-23). 의도적인지 미고려인지 문서에 명시된 적 없음.
**Depends on/blocked by:** 없음, 하지만 실제 사용 후("정말 첫 체크인이 밋밋하게 느껴지는가") 판단하는 게 나을 수 있음.

### 멀티셀렉트 달력 월 전체 선택 시 핀 렌더링 성능·클러스터링 (P3)
**What:** `calendar-multiselect-view.md`의 멀티셀렉트 결과 화면에서 한 달 전체를 선택하면 최대 500~700개 체크인 핀이 동시에 지도에 올라갈 수 있음 — 렌더링 지연·프레임 드랍 실측 및 필요 시 클러스터링/그룹핑 적용.
**Why:** Design 리뷰(Codex + Claude 서브에이전트)에서 공통 지적. 지금은 마커 수백 개를 동시 렌더링하는 실측치가 없어 클러스터링이 필요한지조차 판단 불가 — 문서 자체도 "Phase 1 실사용 후 실측해 판단"으로 유예.
**Pros:** 조기 최적화 비용 회피 — 실제로 이 화면을 얼마나 자주, 얼마나 넓은 범위로 쓰는지도 아직 검증 전(문서의 Assignment 참고).
**Cons:** 측정 전까지는 실제 체감 성능 미지수. 이 화면 자체가 Phase 1 스코프에 아직 편입되지 않아(문서 "스코프 상태" 참고) 우선순위가 낮음.
**Context:** `/plan-design-review`(2026-08-23), `docs/designs/calendar-multiselect-view.md` Open Questions 참고.
**Depends on/blocked by:** Phase 1 핵심 루프 실사용 검증 통과 + 이 화면의 Phase 1 스코프 편입 여부 결정.

### iOS Location Services 전역 꺼짐 vs 앱별 거부 구분 (P3)
**What:** 현재 두 상태 모두 동일한 배너·동일한 설정 딥링크로 처리. 실제로는 서로 다른 iOS 설정 화면(전역 Location Services vs 앱별 권한)에 도착해야 함.
**Why:** Eng 리뷰(Claude 서브에이전트) 지적. 개인 도구 규모에서는 사용자(창업자 본인)가 설정 앱에서 알아서 올바른 화면을 찾을 수 있어 지금은 단순화가 맞음.
**Pros:** 더 정확한 딥링크 타겟.
**Cons:** 구분 로직 자체가 iOS 버전별로 API가 다를 수 있어 생각보다 손이 감 — 1인 사용자 대상으론 과함.
**Context:** Eng 리뷰(2026-08-23). Design 리뷰에서도 같은 이유로 재확인됨(NOT in scope).
**Depends on/blocked by:** Phase 2에서 사용자가 여럿이 되면 재검토.

## /gstack-autoplan CEO 리뷰에서 유예된 항목 (2026-08-24)

### 1~2주 실사용 검증의 명시적 실패 조건(kill condition) 부재 (P1)
**What:** Success Criteria가 정성 판단("실제로 습관이 됐고 계속 쓸만한지")뿐이라 "실패"가 뭘 의미하는지 사전에 정의된 적이 없음. 예: "연속 3일 체크인 0건이면 중단" 같은 구체적 실패 신호.
**Why:** 2026-08-23 CEO 리뷰(via /autoplan)에서 이미 이 gap을 발견해 "TODOS.md updates" 목록에 추가하기로 로그했으나(원본 문서 Decision Audit Trail 근처 참고), **실제로 TODOS.md에 반영되지 않은 채 누락됨** — 2026-08-24 `/gstack-autoplan` 재실행에서 CEO 페이즈의 독립 Claude 서브에이전트와 Codex 아웃사이드 보이스가 동일한 gap을 각자 다른 각도로 재발견(서브에이전트: "kill condition deferred unresolved, no deadline"를 HIGH로 지목; Codex: 정성적 성공기준이 "빌더가 곧 판사"인 동기부여된 추론을 유발한다고 지적). 자가 판단(창업자 본인이 유일한 사용자이자 평가자)이라는 구조 자체가 이 gap을 더 위험하게 만듦.
**Pros:** 1~2주 후 "그냥 계속 써보자"는 매몰비용 합리화를 막는 명확한 기준선이 생김.
**Cons:** 정성 판단의 취지(수치 게이트 제거)와 살짝 긴장 관계 — 완전히 정량적인 게이트로 되돌리자는 게 아니라, 최소한의 "이러면 중단" 신호 하나만 사전에 적어두자는 것.
**Context:** CEO 리뷰(2026-08-23) 최초 발견 → 미반영으로 누락 → `/gstack-autoplan`(2026-08-24) 재발견.
**Depends on/blocked by:** 없음, T1 착수 전 확정 권장 — 원래도 "T1 착수 전"으로 스코프됐던 항목.

### 여행 중 시간대 변경 시 반복 알림 트리거 재정렬 실기기 검증 (P2)
**What:** 이미 예약된 "매시간" 반복 캘린더 트리거가 기기 시간대가 바뀐 뒤에도 새 로컬 시간대 기준으로 올바르게 울리는지 실기기에서 확인된 적 없음.
**Why:** `/gstack-autoplan`(2026-08-24) Eng 리뷰 — Claude 서브에이전트 지적. iOS 반복 트리거가 분(minute) 컴포넌트 기반이라 로컬 벽시계 기준 자동 재정렬될 가능성이 높다는 게 현재 가정일 뿐, 코드가 없는 스펙 단계라 검증된 사실이 아님.
**Pros:** 여행 중 사용 시나리오(창업자가 이미 스키마에 `timezoneAtCapture`를 넣을 만큼 염두에 둔 케이스)의 신뢰성 확보.
**Cons:** 실기기 시간대 변경 시뮬레이션이 필요해 코드 리뷰만으로는 못 끝남.
**Context:** `/gstack-autoplan`(2026-08-24) Eng 리뷰, Failure modes 표 참고.
**Depends on/blocked by:** T1(프로젝트 셋업) 이후, 실기기 확보 시.

### 체크인 확인 핀 드래그 보정의 VoiceOver 대체 경로 부재 (P3)
**What:** 체크인 확인 화면에서 핀 위치가 틀렸을 때 "손가락으로 드래그해서 고치는" 것 외에 VoiceOver로 조작할 방법이 없음. 기본 확인("그대로 확인" 버튼)은 일반 버튼이라 문제없지만, 보정 경로는 순수 드래그 제스처라 스크린리더 사용자가 접근 불가.
**Why:** `/gstack-autoplan`(2026-08-24) Design 리뷰 — Codex 지적. DESIGN.md의 기존 접근성 문구("바텀시트 리스트가 이미 비-지도 경로")는 지도 위 핀을 **조회**하는 경로에만 해당하고, 체크인 중 핀을 **보정**하는 경로는 애초에 다루지 않았던 걸 이번에 발견 — 4라운드 리뷰 내내 방치됐던 문서 오류.
**Pros:** 실제 VoiceOver 사용자가 체크인을 완결할 수 있게 됨.
**Cons:** 진지한 인터랙션 설계가 필요한 작업(예: VoiceOver 조정 액션으로 미세 이동, 좌표 직접 입력 대체 경로 등) — 즉석 수정으로 때울 대상 아님. 1단계는 창업자 본인(비 VoiceOver 사용자)만 타겟이라 지금 당장 실사용을 막지는 않음.
**Context:** `/gstack-autoplan`(2026-08-24) Design 리뷰, `footlog-product-design.md` 접근성 섹션 정정과 함께 발견.
**Depends on/blocked by:** 없음, Phase 2에서 사용자가 여럿이 되거나 실제 VoiceOver 니즈가 생기면 우선순위 재검토.

### Apple Journal(iOS 17+ 내장) 대체재 평가 필요 여부 (P2, User Challenge — Final Approval Gate에서 사용자 결정 대기)
**What:** iOS 17+에 이미 무료로 내장된 Apple Journal 앱이 위치+사진 기반 회고형 저널링과 알림 프롬프트를 이미 제공함 — FootLog가 만들려는 것과 상당 부분 겹침. 4라운드의 이전 리뷰(CEO/Design/Eng × Claude+Codex, 2회)가 Arc Timeline·iso.me·Jellyspot 등 훨씬 덜 알려진 경쟁자 5개는 짚었으면서 이건 한 번도 언급하지 않음.
**Why:** `/gstack-autoplan`(2026-08-24) CEO 리뷰의 독립 Claude 서브에이전트와 Codex 아웃사이드 보이스가 **각자 독립적으로** 이 동일한 gap을 발견 — 강한 수렴 신호. Codex는 Day One 지도뷰, Swarm, Traveled, iso.me도 함께 재조사해 기존 5개 경쟁자 목록보다 더 정확한 대체재 지도를 제시.
**Pros:** 며칠만 Apple Journal을 실제로 써보면 빌드 시작 전에 "이미 있는 걸 다시 만드는 중인가"를 저비용으로 확인 가능.
**Cons:** 2026-08-23 CEO 리뷰의 "Approve as-is" 결정(Approach C 3일 사전검증 없이 바로 진행)과 같은 종류의 긴장 — 창업자가 이미 "빌드하면서 검증"을 선택한 전례가 있음. 다만 Apple Journal은 그때 논의되지 않은 새로운 정보라 재론 가치가 있다고 판단해 자동 기각하지 않고 Final Approval Gate로 올림.
**Context:** `/gstack-autoplan`(2026-08-24) CEO 리뷰 Step 0.5 Dual Voices.
**Depends on/blocked by:** 없음 — 사용자 판단 대기.

### 체크인 시 날씨(기온) 자동 캡처 (P3)
**What:** 체크인 시 GPS와 함께 날씨(기온)도 자동 캐처해서 저장 — 나중에 메모를 다시 읽을 때 "그날 추웠구나" 같은 감각적 맥락 제공.
**Why:** `/gstack-autoplan` CEO 리뷰(SELECTIVE EXPANSION 모드) 확장 스캔에서 발견된 delight 후보. 창업자가 명시적으로 제외 결정.
**Pros:** 저비용(GPS 캡처 시점에 날씨 API 한 번 더 호출), 회고 시 감각적 디테일 추가.
**Cons:** Phase 1이 지금까지 완전히 오프라인·무네트워크의존이었던 원칙을 깨고(날씨 API 호출 필요), API 키 관리·실패 처리가 새로 생김 — 이번 세션에서 DailyVox 등 조사로 확인한 "완전 로컬" 포지셔닝의 순수성과 상충.
**Context:** `/gstack-autoplan`(2026-08-24) CEO 리뷰 Step 0D 확장 스캔.
**Depends on/blocked by:** Phase 2(백엔드 생기면) 또는 Phase 1 실사용 검증 후 재판단.

## 브레인스토밍에서 유예된 항목 (2026-08-24)

### 5개 설계 문서 태스크 통합 체크리스트 부재 (P2)
**What:** `footlog-product-design.md`(T1-T24)와 자식 문서 3개(`day-end-reflection-map.md` T1-T5, `calendar-multiselect-view.md` T1a/T1b/T2-T5, `calendar-date-scrubber.md` T1-T4)가 각자 독립된 번호 체계로 태스크를 관리 중 — 구현 착수 시 부모 문서만 보고 자식 문서 태스크를 놓칠 위험이 있음.
**Why:** `/superpowers:brainstorming`(2026-08-24) 세션에서 사용자가 이번 라운드 대상에서 제외하고 다음으로 미룸 — 이번엔 새로운 시각의 gap 탐색에 집중.
**Pros:** 구현 시작 전 순서/의존성이 명확한 마스터 목록이 있으면 태스크 누락 리스크가 사라짐.
**Cons:** 4개 문서를 넘나드는 통합 작업이라 순서/의존성 정리에 시간이 걸림 — 문서 자체보다 구현 착수 직전에 하는 게 더 실용적일 수 있음.
**Context:** `/superpowers:brainstorming`(2026-08-24), 목업 캔버스 리뷰 세션에서 발견.
**Depends on/blocked by:** 없음, 구현 착수 전 아무 때나 가능.



## 2단계: 백엔드/인증/클라우드 인프라 (1단계 검증 통과 후)

**What:** Spring Boot(Kotlin) 백엔드, 카카오 OAuth2/PKCE 인증, S3 호환 객체 스토리지 사진 업로드, 클라이언트-서버 local-first 동기화 로직.

**Why:** 학습/포트폴리오 목적(Kotlin/Spring Boot 실전 경험) + 향후 사업화/확장 가능성 대비. 1단계(로컬 전용 MVP)에서 핵심 루프(알림→체크인→기록)가 실제로 며칠 이상 쓰이는지 검증되지 않은 상태에서 먼저 만들면, /plan-eng-review에서 Codex 아웃사이드 보이스가 지적한 대로 "검증이 아니라 풀스택 개발"이 되어버린다.

**Pros:**
- 검증된 핵심 루프 위에 안전하게 확장 — 헛수고 리스크 감소.
- Kotlin/Spring Boot 학습 기회는 그대로 유지, 순서만 뒤로.

**Cons:**
- 실제 착수 시점이 1단계 Success Criteria(체크인 완료율, 메모 첨부율) 통과 여부에 달려 있어 불확실.
- 오래 미루면 동기부여가 식을 수 있음 — 1단계 완료 직후 바로 이어가는 걸 권장.

**Context:** 이 결정은 세션 중 두 번 뒤집혔다 — office-hours에서 "학습 목적으로 1단계부터 백엔드 포함" → eng-review 초반 "인증(카카오)+S3까지 1단계에 추가" → eng-review 후반 Codex 지적으로 "전부 2단계로 연기, 1단계는 순수 로컬"로 최종 확정. 전체 맥락은 design doc 참고: `~/.gstack/projects/FootLog2/lovelyalien-main-design-20260821-011836.md`

**Depends on / blocked by:** 1단계(로컬 전용 Expo 앱) Success Criteria 통과 — 체크인 완료율이 수기 일기보다 높고, 메모/사진 첨부율이 50% 이상.

**추천 시작점:** 카카오 개발자 센터에서 OAuth2 앱 등록 → Spring Boot에 Spring Security + OAuth2 Client 의존성 추가 → PKCE 플로우 구현 → 체크인 CRUD API → S3 호환 스토리지 연동 순서.
