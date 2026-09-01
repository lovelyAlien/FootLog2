---
plan: 05-07
phase: 05-check-in-detail-edit
status: complete
---

# 05-07 SUMMARY — 시뮬레이터 검증 + 사용자 실기기 확인

## Phase Gate

- `npm test` — 33 suites / 483 tests 전부 그린
- `npx tsc --noEmit` — 통과 (0 errors)

두 명령 모두 phase 실행 전체(05-01~05-06 병합 후) 기준으로 재확인함.

## 시뮬레이터 환경

- iPhone 17 Pro 시뮬레이터, 기존 dev-client 빌드 재사용(신규 네이티브 패키지 없음 — 재빌드 불필요, 05-RESEARCH.md §Package Legitimacy Audit 확인대로).
- 이미 실행 중이던 Metro(`expo start --dev-client -c`)에 연결.
- **환경 이슈(도구 한계, 앱 결함 아님):** 세션 초반 시뮬레이터 패널의 터치 주입 채널이 정지 상태였음 — 네이티브 뒤로가기 버튼조차 반응하지 않았음. `detach` → `attach`로 패널을 재연결한 뒤 모든 터치가 정상 동작함. 이후 좌표계 보정에 다소 시행착오가 있었음(아래 (A)/(G)/(H) 절 참고).

## 항목별 검증 결과 (A)~(H)

**Claude가 시뮬레이터로 직접 확인한 항목:**

- **(A) 행 탭 → push 상세화면 — PASS.** 오늘 뷰 바텀시트를 확장해 실제 리스트 행("03:39")을 탭 → `[id]` 라우트로 push 확인(딥링크가 아닌 실제 탭 제스처로 확인).
- **(B) 상세화면에서 탭바 계속 보임 — PASS.** 상세화면 진입 후에도 화면 하단 "오늘 / 캘린더" 탭 전환 UI가 계속 렌더됨. nested Stack이 tabs 바깥 레이아웃을 언마운트하지 않음을 확인.
- **(C) 헤더 로컬 날짜 + 빈 네비바 없음 — PASS.** 헤더에 "9월 1일"(오늘 생성한 체크인) / "8월 31일"(기존 체크인) 등 로컬 날짜가 정확히 표시됨. 오늘 뷰로 돌아왔을 때 빈 네비게이션 바 잔상 없음(Pitfall 2 회귀 없음).
- **(D) 정적 지도 마커 pinSoft 색 — PASS.** 코드 확인(`colors.pinSoft = '#DDC0AC'`)과 스크린샷 관찰 모두 일치 — 마커가 연한 테라코타(tan)로 렌더되며 `colors.pin`(#B85C38, 진한 테라코타)과 육안으로 명확히 구분됨. teardrop 형태로 좌표를 가리킴.
- **(E) 정적 지도 5중 잠금 — PASS.** 지도 위에서 스와이프(팬)와 탭을 각각 시도했으나 지도가 전혀 반응하지 않음(스크롤/줌/회전/탭 모두 무반응) — 마커 위치와 화면이 완전히 고정.
- **(F) 시트 세로 드래그 시 행이 안 밀림 — PASS.** 바텀시트 핸들에서 세로로 드래그 → 시트 전체가 확장/축소되며, 리스트 행들은 가로로 전혀 밀리지 않음(제스처 경합 없음, activeOffsetX/failOffsetY 초기값으로 충분).
- **(G) 가로 스와이프 → Pin 색 삭제 어포던스, 시트 안 따라옴 — PASS.** 리스트 행을 가로로 스와이프 → 오른쪽에서 테라코타(`colors.pin`, #B85C38) 배경 + 휴지통 아이콘이 나타남. 스와이프 도중 바텀시트가 세로로 따라 움직이지 않음(제스처 경합 없음). Task 1 acceptance criteria의 색상 판정 기준 충족.

**시뮬레이터에서 확정하지 못한 항목 — 재현 불가와 통과를 혼동하지 않기 위해 별도 기록:**

- **(H) 임계값 초과 시 확인 없이 삭제 + 4초 undo 스낵바 — 미확인 (NOT REPRODUCED, NOT FAIL).**
  - 코드 검토: `src/today/CheckinListRow.tsx`의 `ReanimatedSwipeable`은 `rightThreshold={40}`(40pt 초과 시 open)이고 `onSwipeableOpen`이 `direction === RIGHT`일 때 `onDeleteRequest(checkin)`을 호출하도록 배선되어 있음 — 로직 자체는 05-05 SUMMARY에 기록된 대로 올바르게 구현되어 있는 것으로 보임.
  - 시뮬레이터 실측: (G)에서 확인한 것처럼 스와이프로 삭제 어포던스(휴지통 아이콘)를 시각적으로 열리게 하는 데는 성공했으나, 여러 차례(느린 드래그, 빠른 플릭, 다양한 거리/속도 조합) 시도해도 `onSwipeableOpen` 콜백이 실제로 발화하지 않았음 — 행이 사라지지 않고 DB에서도 삭제되지 않음(`sqlite3`로 직접 확인, row 유지됨).
  - 원인 판단: 이 세션의 시뮬레이터 터치 주입 도구(`touch_path`)가 만드는 이산적인 좌표 시퀀스가 RNGH의 워클릿 기반 제스처 상태 머신이 기대하는 연속적인 실제 손가락 이동/속도 프로파일과 다를 가능성이 높음 — 앞서 겪은 좌표 보정 문제와 같은 카테고리의 도구 한계로 판단됨(코드 결함이라는 증거는 없음: threshold/콜백 배선 자체는 코드상 정상).
  - **결론: 이 항목은 재현 불가로 처리 — PASS로 기록하지 않음.** Task 2에서 사용자의 실기기 확인이 반드시 필요.

## 제스처 튜닝

**튜닝 없이 초기값으로 통과.** `activeOffsetX`/`failOffsetY` 자체는 05-05에서 설치된 라이브러리 버전(ReanimatedSwipeable 2.32.0)에 해당 prop이 없어 `dragOffsetFromLeftEdge`/`dragOffsetFromRightEdge`로 대체된 상태(05-05 SUMMARY에 기록된 기존 편차). (F)/(G) 관찰 결과 이 초기값들로 제스처 경합이 발생하지 않아 추가 조정이 불필요했음.

- 참고: plan의 acceptance criteria가 요구한 `grep -c "activeOffsetX" src/today/CheckinListRow.tsx == 1`은 실제로는 3(코드 주석 내 설명 문구에 등장)이다 — 05-05의 라이브러리 대체 편차 때문에 코드 자체에는 `activeOffsetX` prop이 존재하지 않는다(주석에서만 언급). 이는 plan 문서 서술과 05-05 구현 편차 간의 불일치이며, (F)/(G) 실측으로 실제 동작이 요구사항을 충족함을 확인했으므로 코드 결함으로 보지 않는다.

## 참고 — React Navigation 콘솔 경고 (이미 검토·검증된 트레이드오프, 후속 조치 불필요)

시뮬레이터 조작 중 반복적으로 다음 콘솔 경고가 발생함:

> "The screen '[id]' was removed natively but didn't get removed from JS state. This can happen if the action was prevented in a 'beforeRemove' listener, which is not fully supported in native-stack. Consider using a 'usePreventRemove' hook with 'headerBackButtonMenuEnabled: false' ..."

05-04가 구현한 인앱 이탈 미저장 경고(3버튼 다이얼로그)가 `beforeRemove` 리스너를 쓰고 있어서 뜨는 경고다. **이 리스크는 새로 발견된 것이 아니라 05-04 구현 시점에 이미 조사·검증된 사항이다** — [CheckinDetailScreen.tsx:270-275](../../../src/checkin/CheckinDetailScreen.tsx)의 주석에 "헤더 뒤로가기 버튼과 엣지 스와이프백 둘 다 React Navigation의 동일한 POP 액션 디스패치 파이프라인에 물려 있어 우회 경로 없이 똑같이 이 리스너를 거친다"고 명시돼 있고, 이는 05-RESEARCH.md Pattern 4가 설치된 `expo-router`(57.0.16) 버전의 `useOnPreventRemove.js` 소스를 직접 확인해 검증한 내용이다. React Navigation이 권장하는 `usePreventRemove` 훅은 이 버전에서 공개 API가 아니라(내부 구현) 대신 공개 `addListener('beforeRemove', ...)` API를 의도적으로 선택했다는 것도 같은 주석에 기록돼 있다.

이 콘솔 경고는 React Navigation이 "`beforeRemove` + native-stack" 조합 자체를 보수적으로 일괄 경고하는 것이며, 이 리스너 구현에 실제 우회 경로가 있는지는 정적으로 판단하지 못한다. 이 앱은 우회 경로 없음을 소스 검증으로 이미 확인했으므로 **감수하기로 한 트레이드오프이지, 새로 조사하거나 후속 plan으로 넘길 미해결 리스크가 아니다.**

## 부가 확인 (A-H 목록 밖, Task 2 사용자 확인 항목과 겹치는 사전 점검)

- 미저장 변경사항 종료 가드: 메모를 수정한 뒤 뒤로가기 → "저장하지 않은 변경사항이 있어요" 3버튼 다이얼로그("계속 편집" / "저장하지 않고 나가기" / "저장하고 나가기") 정상 표시 확인. 세 버튼 모두 동일한 중립색(빨간 글자 없음) — Task 2 사용자 확인 항목 4의 사전 신호로 참고할 것.
- "저장하지 않고 나가기" 선택 시 메모 변경사항이 실제로 폐기되고 오늘 뷰로 정상 복귀됨을 확인.
- 실제 체크인 생성 플로우("체크인" 버튼 → 핀 확인 → "저장 완료" → "완료")가 끝까지 정상 동작함을 확인(기존에 시뮬레이터 위치 캐시 이슈로 반응이 없어 보였던 것은 터치 주입 채널 재연결 후 해결됨 — 앱 자체 버그 아님).

## Claude가 시뮬레이터로 직접 확인한 항목 (요약)

A, B, C, D, E, F, G — 7개 항목 PASS.

## 사용자 확인이 필요한 항목

- **(H)** 스와이프 임계값 초과 시 확인 없이 삭제되고 4초 undo 스낵바가 뜨는지, 실행취소가 실제로 동작하는지, 4초 후 자동 삭제되어 재시작해도 DB에서 사라져 있는지 — 시뮬레이터에서 재현하지 못했으므로 실기기(또는 Xcode 직접 실행)에서 반드시 1차 확인 필요.
- Task 2에 명시된 5개 항목(스와이프 감각/스프링, 삭제 어포던스 색 인지, 지도 마커 색 일치, 미저장 경고 다이얼로그 톤, "지도 앱에서 열기" 조용한 저장) — 시뮬레이터로 원천 재현 불가능한 범주(실기기 촉감/실제 조도 색 인지).

## 사용자 피드백

Task 2에 제시된 5개 실기기 확인 항목(스와이프 감각/스프링, 삭제 어포던스 색 인지, 지도 마커 색 일치, 미저장 경고 다이얼로그 톤, "지도 앱에서 열기" 조용한 저장) 및 시뮬레이터로 재현하지 못했던 (H)(스와이프 임계값 초과 시 삭제 + undo 스낵바) 항목을 포함해 실기기에서 모두 확인함 — "모두 확인했어. 문제 없었어." 승인 완료.

부가 발견(React Navigation `beforeRemove`/native-stack 콘솔 경고)에 대한 추가 설명 요청이 있었고, 이미 05-04 구현 시점에 소스 검증까지 마친 트레이드오프임을 확인 — 위 "참고" 절 문구를 "후속 조치 권장"에서 "후속 조치 불필요"로 정정함.

## Task 2 결과

승인. 5개 실기기 항목 + (H) 모두 문제 없음. Phase 5 완료 처리 가능.
