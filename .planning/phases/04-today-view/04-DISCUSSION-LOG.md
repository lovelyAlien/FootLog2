# Phase 4: Today View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 4-Today View
**Areas discussed:** 바텀시트 리스트의 장소명 표시, 체크인 진행 중 vs 바텀시트 공존, 하단 탭바(오늘/캘린더) 도입 시점, 오늘 저장된 체크인 핀 지도 표시

---

## 바텀시트 리스트의 장소명 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 장소명 필드 자체를 생략 | 리스트 행은 시간만 1차 표시하고 장소명 텍스트는 이번 phase에서 만들지 않음 | ✓ |
| 좌표를 축약해서 표시 | lat/lng를 짧게 축약해 장소명 자리에 표시 | |
| 온디바이스 역지오코딩 사용 | expo-location의 reverseGeocodeAsync(iOS CLGeocoder)로 실제 지명 조회 — 네트워크 필요, 오프라인 원칙과 충돌 | |

**User's choice:** 장소명 필드 자체를 생략(권장)
**Notes:** 좌표→장소명 변환이 iOS CLGeocoder 기반이라 네트워크가 필요해 PROJECT.md의 "1단계는 네트워크 의존성 전무" 원칙과 충돌한다는 점을 짚은 뒤 결정.

| Option | Description | Selected |
|--------|-------------|----------|
| 시간 + 메모 미리보기(있을 때만) | 시간 아래 메모 세리프 이탤릭 1줄 미리보기 추가, 사진 유무 아이콘 없음 | ✓ |
| 시간만(미리보기 없음) | 가장 담담하고 단순 | |
| 시간 + 사진/메모 유무 아이콘 | 텍스트 미리보기 대신 작은 아이콘으로 부가 정보 유무 표시 | |

**User's choice:** 시간 + 메모 미리보기(있을 때만)

| Option | Description | Selected |
|--------|-------------|----------|
| 이번 phase는 행을 탭 불가능하게 둘 | 화살표/탭 피드백 없이 순수 정보 행으로만 | ✓ |
| Phase 4에서 미리 화살표/탭 인터랙션을 숨기지만 동작은 없음(placeholder) | 시각적으로 확정 레이아웃이지만 탭 시 무반응 | |

**User's choice:** 이번 phase는 행을 탭 불가능하게 둘(권장)
**Notes:** 제품 문서는 "완료된 행을 탭하면 상세화면이 열림"을 전제하지만 상세화면(REQ-checkin-detail-base)은 Phase 5 소관이라는 점을 짚은 뒤 결정.

---

## 체크인 진행 중 vs 바텀시트 공존

| Option | Description | Selected |
|--------|-------------|----------|
| 체크인 진행 중에는 바텀시트를 완전히 숨김 | 액션카드가 뜨면 바텀시트는 언마운트, 확인/저장이 끝나 IDLE로 돌아오면 다시 나타남 | ✓ |
| 바텀시트를 강제로 CLOSED로 접은 채 유지(핸들만 보임) | 핸들 바는 보이되 상호작용은 잠금 | |
| 가리는 것 없이 동시 공존(바텀시트는 그대로, 액션카드는 그 위에 뜨우는 레이어) | 화면이 복잡해지고 z-index 조율 필요 | |

**User's choice:** 체크인 진행 중에는 바텀시트를 완전히 숨김(권장)

| Option | Description | Selected |
|--------|-------------|----------|
| 둘 다 바텀시트 현재 상단(높이)에 따라 함께 위로 뜬다 | 체크인 버튼/재센터 버튼이 시트 높이를 구독해 bottom 오프셋 동적 계산 | ✓ |
| 바텀시트 상태와 상관없이 insets.bottom 기준 고정 위치 유지 | 구현은 단순하지만 시트 OPEN 시 버튼이 가려질 수 있음 | |

**User's choice:** 둘 다 바텀시트 현재 상단(높이)에 따라 함께 위로 뜬다(권장)

---

## 하단 탭바(오늘/캘린더) 도입 시점

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4가 탭바 셸까지 만든다(캘린더는 플레이스홀더) | RootTabNavigator 도입, 오늘 뷰 레이아웃이 처음부터 최종 형태로 자리잡음 | ✓ |
| Phase 4는 Today 단독 화면으로 유지하고 탭바는 Phase 6이 도입 | Phase 3의 전체화면 구조 유지, Phase 6에서 레이아웃 재조정 필요 | |

**User's choice:** Phase 4가 탭바 셸까지 만든다(캘린더는 플레이스홀더)(권장)
**Notes:** REQUIREMENTS.md에 탭바 셸 자체를 커버하는 REQ가 명시적으로 없다는 점을 짚은 뒤 결정 — 이번 논의로 Phase 4 스코프에 포함 확정.

| Option | Description | Selected |
|--------|-------------|----------|
| 담담한 안내 텍스트 한 줄만 | 새 컴포넌트 없이 기존 typography 토큰만 사용 | ✓ |
| 빈 화면(아무 텍스트 없음) | 가장 최소한의 구현 | |

**User's choice:** 담담한 안내 텍스트 한 줄만(권장)

| Option | Description | Selected |
|--------|-------------|----------|
| 이번 phase에서는 햄버거 아이콘을 놓지 않음 | 설정 화면이 아직 없으므로 진입점도 만들지 않음, Phase 6이 함께 추가 | ✓ |
| 햄버거 아이콘은 놓이지만 누르면 무반응(placeholder) | 최종 레이아웃 미리 자리잡지만 탭해도 아무 일 없음 | |

**User's choice:** 이번 phase에서는 햄버거 아이콘을 놓지 않음(권장)

| Option | Description | Selected |
|--------|-------------|----------|
| 네, 탭바는 체크인 진행 중에도 계속 보이고 탭 가능 | 제품 문서가 명시한 "체크인 중 탭 전환" 허용 시나리오와 일치 | ✓ |
| 체크인 진행 중엔 탭바도 함께 숨김 | 단순한 규칙이지만 제품 문서의 확정 사항과 충돌 | |

**User's choice:** 네, 탭바는 체크인 진행 중에도 계속 보이고 탭 가능(권장)
**Notes:** 오늘 뷰의 바텀시트만 숨기고(D-04) 탭바 레이어는 건드리지 않는다는 점을 명확히 함.

---

## 오늘 저장된 체크인 핀 지도 표시

**사용자 추가 확인 요청:** "체크인 화면은 오늘을 기준으로 하고 있는지 확인해줘. 오늘 기준으로 체크인한 기록이 있다면 체크인했던 위치 핀이 맵에 표시가 보존되는지 확인해줘."

**확인 결과:** local_date_key 기준 필터링은 이미 스키마/ROADMAP에 확정돼 있음. 그러나 오늘 저장된 체크인들을 조회해 지도에 핀으로 다시 그리는 로직은 현재 코드(`src/app/index.tsx`, `src/checkin/checkinRepo.ts`)에 없음 — Phase 4의 신규 작업으로 확인됨.

| Option | Description | Selected |
|--------|-------------|----------|
| 구별함 — 저장된 핀은 작고 담담한 점, 확인 핀은 기존 물방울 핀 모양 유지 | (질문 제시 초안) | |
| 둘 다 물방울 핀, 색상만 다르게 | 사용자가 제시한 실제 선택 — 모양은 동일, 색상만 차별화 | ✓ |

**User's choice:** 둘 다 물방울 핀, 다른 색상 (사용자 자유 응답 — 제시된 옵션과 다름)

| Option | Description | Selected |
|--------|-------------|----------|
| 저장된 핀 = accentSoft(연한 accent), 확인 핀 = accent(진한 accent) | 기존 pinFallback 톤 차이만 재사용, 새 토큰 없음 | ✓ |
| 저장된 핀 = textMuted(회색계), 확인 핀 = accent | "지금 하는 것" vs "이미 끝난 것" 대비가 더 강함 | |

**User's choice:** 저장된 핀 = accentSoft, 확인 핀 = accent(권장)
**Notes:** DESIGN.md의 "accent 색상 1개만, 절대 늘리지 않음" 원칙을 짚은 뒤, 새 색상 추가 없이 기존 토큰 재사용으로 결정.

---

## Claude's Discretion

- 바텀시트 구현 라이브러리 선택(`@gorhom/bottom-sheet` vs 커스텀 구현)
- Phase 3 임시 화면(`src/app/index.tsx`)의 재사용 vs 리팩터링 범위
- 체크인/재센터 버튼의 바텀시트 높이 구독 구현 방식
- 사진 리사이징 라이브러리 및 로딩 UX

## Deferred Ideas

- 장소명(지오코딩) 기능 — 오프라인 원칙과 근본적으로 충돌, 향후 재검토 필요 시 별도 판단
- 체크인 상세화면 진입(리스트 행 탭) — Phase 5 스코프 재확인(새로 옮긴 것 아님)
- 설정 화면 및 햄버거 메뉴 아이콘 — Phase 6 스코프 재확인(새로 옮긴 것 아님)
