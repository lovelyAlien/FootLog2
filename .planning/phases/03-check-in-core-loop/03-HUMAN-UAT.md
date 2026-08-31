---
status: resolved
phase: 03-check-in-core-loop
source: [03-VERIFICATION.md]
started: 2026-08-27T16:45:24Z
updated: 2026-08-28T00:00:00Z
resolved_by: [03-12-SUMMARY.md]
---

## Current Test

[testing complete]

## Tests

### 1. SAVED 카드 닫기 제스처(CR-01 수정) UX 확인
expected: 코드 리뷰에서 발견된 Critical 버그(CR-01 — 저장 완료 후 IDLE로 돌아가는 경로가 없어 세션당 체크인 1회만 가능)를 고치면서, "지도의 빈 영역을 탭하면 SAVED 카드가 닫히고 다음 체크인을 시작할 수 있다"는 제스처를 추가했습니다(`src/app/index.tsx`의 `handleMapPress` → `<MapView onPress>`). 이 제스처는 03-UI-SPEC.md에 명시된 디자인이 아니라 수정 과정에서 임시로 정한 것입니다. 창업자가 실기기에서 이 흐름(체크인 완료 → 지도 탭 → 카드 닫힘 → 재체크인)을 직접 확인하고, 이 제스처가 의도한 제품 동작과 맞는지(혹은 명시적 "완료"/"닫기" 버튼 등 다른 방식이 필요한지) 판단해야 합니다. 참고: 03-11의 실기기 검증은 이 수정이 반영되기 전에 진행되어, 이 흐름 자체가 실기기에서 테스트된 적이 없습니다.
result: resolved
reported: "지도 탭하면 카드 닫히고 다시 체크인 버튼을 누를 수 있어. 그런데 체크인 버튼 색깔이 기존 체크인 버튼과 색깔이 다르고 체크인 문구도 안보여"
severity: major
resolution: "plan 03-12(commit 966441f)에서 buttonContentOpacity 크로스페이드 useEffect 의존성에 showActionCard/isCapturing/buttonContentOpacity를 추가하고 cleanup에서 stop()+setValue(1) 이중 방어를 적용해 수정. iOS Simulator 콜드 부팅 검증으로 '완료' 버튼 경로와 지도 탭 경로 둘 다 라벨이 정상 렌더링됨을 확인 (03-12-SUMMARY.md 참조)."

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "지도 탭으로 SAVED 카드를 닫으면 최초 IDLE 상태와 동일한 올리브그린 '체크인' 알약버튼이 다시 나타난다."
  status: resolved
  resolved_by: "03-12-SUMMARY.md (commit 966441f) — buttonContentOpacity 재동기화 effect 의존성 수정 + cleanup 이중 방어. iOS Simulator로 재검증 완료."
  reason: "User reported: 지도 탭하면 카드 닫히고 다시 체크인 버튼을 누를 수 있어. 그런데 체크인 버튼 색깔이 기존 체크인 버튼과 색깔이 다르고 체크인 문구도 안보여"
  severity: major
  test: 1
  root_cause: "체크인 알약버튼의 크로스페이드 투명도(`buttonContentOpacity`, native-driver Animated.Value)가 `src/app/index.tsx`에서 checkinReducer 상태 밖에 선언돼 있고, 이를 1로 리셋하는 useEffect가 `isCapturing`에만 의존한다. CR-01의 DISMISS(SAVED→IDLE) 경로는 `isCapturing`을 전혀 거치지 않으므로 이 effect가 재실행되지 않는다. 그 사이 버튼은 CONFIRM~SAVED 구간 내내 언마운트돼 있다가 DISMISS로 다시 마운트되는데, 이때 RN의 알려진 프레임워크 한계(native-driven Animated.Value가 마지막 setValue() 값 — 여기선 크로스페이드 시작 직전의 0 — 으로 되돌아가는 현상, facebook/react-native #28114/#38510/#23712/#23621)에 걸려 opacity 0으로 렌더된다. 버튼 배경(accent 올리브)은 Animated.View 밖의 Pressable에 있어 정상 표시되지만, 그 안의 '체크인' Text 라벨은 투명해져 안 보인다 — 사용자에게는 '문구 없는 밋밋한 알약'으로 보여 색깔이 다르다고 인지됨."
  artifacts:
    - path: "src/app/index.tsx"
      issue: "buttonContentOpacity 리셋 useEffect(약 192~201행)가 isCapturing에만 의존 — showActionCard(버튼 마운트/언마운트 여부)를 반영하지 않음"
  missing:
    - "SAVED→IDLE(DISMISS) 경로에서도 buttonContentOpacity가 1로 리셋되도록 effect 의존성에 showActionCard(또는 phase === 'IDLE') 추가, 또는 애니메이션 없이 동기적으로 1 설정"
    - "장기적으로는 Animated.View를 phase 조건부 언마운트 대신 항상 마운트해두고 visibility만 토글하는 방식으로 native-driver 리마운트 함정 자체를 회피하는 것을 고려"
  debug_session: ".planning/debug/checkin-button-color-label-regression.md"
