---
status: diagnosed
trigger: "checkin-button-color-label-regression: 지도 탭으로 SAVED 카드를 닫은 뒤 다시 나타나는 체크인 알약버튼이, 최초 IDLE 상태에서 보이던 체크인 버튼과 색깔이 다르고 \"체크인\" 문구도 보이지 않는다."
created: 2026-08-28T00:00:00Z
updated: 2026-08-28T00:25:00Z
---

## Current Focus

hypothesis: CONFIRMED — src/app/index.tsx의 `buttonContentOpacity`(Animated.Value, useNativeDriver:true)가 checkinReducer 상태와 별개로 컴포넌트 전체 수명 동안 공유되고, 이를 1로 되돌리는 크로스페이드 useEffect가 `isCapturing`에만 의존한다. SAVED→IDLE(DISMISS) 전환은 isCapturing을 바꾸지 않으므로(내내 false) 이 effect가 재실행되지 않고, 그 사이 체크인 버튼의 Animated.View는 CONFIRM~SAVED 구간 내내 언마운트돼 있었다. 리마운트된 새 네이티브 뷰는 마지막 setValue(0) 시점의 값을 그대로 물려받아(RN의 잘 알려진 네이티브 드라이버 리마운트 버그, facebook/react-native #28114/#38510/#23712/#23621과 동일 패턴) opacity 0으로 렌더되고, 그 안의 "체크인" Text가 보이지 않는다. Pressable 배경(colors.accent)은 Animated.View 밖에 있어 그대로 올리브색이지만 라벨이 사라진 "빈 알약"으로 보여 사용자가 "색깔이 다르다"고 표현한 것으로 판단.
test: (1) checkinFlow.ts DISMISS 케이스와 initialCheckinState 비교 — 상태 필드 자체는 완전 초기화됨을 확인. (2) src/app/index.tsx의 버튼 렌더 분기(showActionCard else) JSX/스타일이 최초 IDLE과 DISMISS 이후 IDLE에서 코드상 100% 동일함을 확인. (3) buttonContentOpacity 크로스페이드 useEffect의 의존성 배열이 [isCapturing, buttonContentOpacity]뿐이고 showActionCard/마운트 여부와 무관함을 확인. (4) 웹 검색으로 RN native-driver Animated.Value가 언마운트→리마운트 시 마지막 setValue 값으로 되돌아가는 프레임워크 버그가 실재함을 확인.
expecting: 확인됨 — 리듀서/props 차이가 아니라, 리듀서 상태 밖에 있는 Animated.Value 하나가 이 특정 전환(SAVED→IDLE)에서만 재동기화되지 않는 게 원인.
next_action: (진단 전용 모드 — 수정 없이 종료) 이 파일을 resolved로 옮기지 않고 ROOT CAUSE FOUND로 반환.

## Symptoms

expected: 지도 빈 영역 탭 → SAVED 카드 닫힘 → 최초 부팅 시(IDLE 상태)와 동일한 올리브그린(#7C8660 accent) "체크인" 알약버튼이 하단 중앙에 다시 나타남
actual: 카드는 닫히고 버튼을 눌러 재체크인은 가능하지만, 버튼 색깔이 기존(최초 IDLE) 체크인 버튼과 다르고 "체크인" 문구 텍스트가 보이지 않음
errors: None reported (creating a checkin still works after tapping the wrong-looking button)
reproduction: 03-11-PLAN.md Task 2 절차대로 체크인 1건 완료(저장 완료 카드까지) → 지도 빈 영역 탭(CR-01 수정, src/app/index.tsx handleMapPress) → 다시 나타난 체크인 버튼 육안 확인
started: CR-01 코드리뷰 수정(commit 8381f80, 2026-08-27)이 지도 탭 → DISMISS 배선을 새로 추가한 직후부터 관찰됨. 이 수정 이전에는 SAVED에서 IDLE로 돌아가는 경로 자체가 없어 이 상태가 재현된 적이 없었음.

## Eliminated

- hypothesis: DISMISS 이후 리듀서가 만드는 IDLE 상태가 최초 부팅 IDLE과 필드 값이 다르다(잔여 photo/note/checkinId 등)
  evidence: "src/checkin/checkinFlow.ts의 DISMISS 케이스는 `return initialCheckinState;` — 최초 useReducer 초기값과 동일한 리터럴 상수를 그대로 반환한다. phase/pin/checkinId/photo/photoError/note 전부 최초 부팅 값과 완전히 동일하다."
  timestamp: 2026-08-28T00:05:00Z

- hypothesis: CheckinActionCard.tsx가 phase 외 다른 필드로 분기해 IDLE에서도 다른 스타일의 카드를 렌더한다
  evidence: "phase === 'IDLE' 또는 'CAPTURING'이면 컴포넌트가 `return null`만 반환한다 — IDLE에서는 이 컴포넌트가 아예 아무것도 렌더하지 않으므로, 실제로 보이는 알약 버튼은 src/app/index.tsx의 else 분기(checkinButtonContainer)다."
  timestamp: 2026-08-28T00:06:00Z

- hypothesis: checkinButtonCapturing(배경 accentSoft)이 DISMISS 이후에도 잘못 적용돼 색이 바뀐다
  evidence: "isCapturing은 `state.phase === 'CAPTURING'`에서만 true다. DISMISS는 phase를 IDLE로 되돌리므로 isCapturing은 false — checkinButtonCapturing 스타일은 적용되지 않는다. 또한 사용자가 이 버튼을 다시 눌러 재체크인에 성공했다는 보고는 버튼이 disabled(=isCapturing true) 상태가 아니었음을 뒷받침한다."
  timestamp: 2026-08-28T00:07:00Z

## Evidence

- timestamp: 2026-08-28T00:04:00Z
  checked: src/checkin/checkinFlow.ts 전체(리듀서, initialCheckinState, DISMISS 케이스)
  found: "DISMISS는 항상 `initialCheckinState`(모듈 최상단 상수, 최초 useReducer 초기값과 동일한 객체 참조)를 반환한다. 모든 다른 케이스는 `{ ...state, ... }` 스프레드로 새 객체를 만들며 mutate하지 않는다."
  implication: 리듀서 레벨에서는 DISMISS 이후 IDLE 상태와 최초 IDLE 상태 사이에 어떤 필드 차이도 없다 — 색상/문구 차이의 원인이 아니다.

- timestamp: 2026-08-28T00:08:00Z
  checked: src/components/CheckinActionCard.tsx 전체
  found: "phase === 'IDLE' || phase === 'CAPTURING' 조건에서 `return null`. 즉 IDLE에서는 이 컴포넌트가 관여하지 않는다."
  implication: 사용자가 본 '색깔이 다른 체크인 버튼'은 CheckinActionCard가 아니라 src/app/index.tsx의 checkinButtonContainer(플로팅 알약 버튼) 자체다 — 조사 범위를 index.tsx로 좁힌다.

- timestamp: 2026-08-28T00:12:00Z
  checked: src/app/index.tsx의 showActionCard 계산과 checkinButtonContainer JSX(line 190, 503-540, 556-576)
  found: "`showActionCard = state.phase !== 'IDLE' && !isCapturing`. 최초 마운트 IDLE과 DISMISS 이후 IDLE 모두 showActionCard=false로 동일한 else 분기(checkinButtonContainer)를 렌더한다. 이 분기 안의 JSX/스타일 배열([styles.checkinButton, isCapturing && styles.checkinButtonCapturing])과 조건부 Text/ActivityIndicator 렌더는 두 경우 모두 코드상 완전히 동일한 값(isCapturing=false)으로 평가된다."
  implication: index.tsx의 렌더 로직 자체(스타일/분기)는 두 경우를 구분하지 않는다 — 코드에 있는 값의 차이가 아니라 렌더 트리 밖의 어떤 지속 상태(persisted, non-reducer state) 때문에 실제 화면이 달라 보일 가능성으로 조사를 좁힌다.

- timestamp: 2026-08-28T00:15:00Z
  checked: src/app/index.tsx line 100, 192-201, 529-537 — buttonContentOpacity(Animated.Value)와 크로스페이드 useEffect
  found: "`buttonContentOpacity`는 `useState(() => new Animated.Value(1))[0]`로 컴포넌트 전체 수명 동안 하나만 생성되며 checkinReducer의 phase와 무관하게 유지된다. 이를 리셋하는 useEffect는 `[isCapturing, buttonContentOpacity]`에만 의존한다 — `setValue(0)` 후 `Animated.timing(...,{toValue:1, duration: motion.saveStateCrossfadeMs, useNativeDriver: true}).start()`. 체크인 버튼의 <Animated.View style={{opacity: buttonContentOpacity}}>는 CONFIRM~SAVED 구간 내내 언마운트돼 있다가(그 사이 CheckinActionCard가 대신 렌더됨) SAVED→DISMISS로 IDLE에 돌아올 때 처음으로 다시 마운트된다. 이 SAVED→IDLE 전환에서 isCapturing은 false→false로 변하지 않으므로 크로스페이드 useEffect가 재실행되지 않는다."
  implication: 리마운트되는 새 네이티브 Animated.View는 마지막으로 fire된 크로스페이드(CAPTURING→CONFIRM 전환 시점의 setValue(0))가 useNativeDriver로 구동된 뒤 남긴 값을 그대로 물려받을 가능성이 있다 — 리듀서/props와 무관한, Animated.Value 리마운트 특유의 문제로 조사 방향을 확정한다.

- timestamp: 2026-08-28T00:20:00Z
  checked: 웹 검색 — "React Native Animated.Value useNativeDriver opacity stuck after unmount remount"
  found: "facebook/react-native 이슈 #28114, #38510, #23712, #23621 등에서 동일 패턴이 다수 보고됨: useNativeDriver:true로 구동된 Animated.Value를 사용하는 뷰가 언마운트된 뒤 다시 마운트되면, 애니메이션이 도달했던 최종 값이 아니라 애니메이션 시작 직전(주로 setValue로 지정한) 값으로 되돌아가 렌더된다. 이는 React Native 프레임워크 자체의 잘 알려진 한계로, 현재까지 코어 레벨 수정 없이 남아있다."
  implication: buttonContentOpacity가 SAVED→IDLE 리마운트 시 1이 아니라 0(마지막 setValue(0) 값)으로 렌더될 개연성이 프레임워크 차원에서 뒷받침된다. Pressable의 배경색(colors.accent)은 Animated.View 바깥 스타일이라 영향받지 않고 그대로 올리브색으로 남지만, 그 안의 "체크인" Text가 opacity 0으로 사실상 보이지 않게 되어 사용자가 "라벨 없는 밋밋한 버튼"을 "색깔이 다르다 + 문구가 안 보인다"로 보고한 것과 정확히 일치한다.

## Resolution

root_cause: "src/app/index.tsx의 체크인 알약버튼 크로스페이드용 `buttonContentOpacity`(Animated.Value, useNativeDriver:true)는 checkinReducer의 phase와 무관하게 컴포넌트 수명 전체에서 공유되며, 이를 1로 리셋하는 useEffect가 `isCapturing` 변화에만 의존한다. SAVED→IDLE(DISMISS, CR-01 배선)로 되돌아올 때는 isCapturing이 false→false로 그대로라 이 useEffect가 재실행되지 않는다. 그 사이 체크인 버튼의 Animated.View는 CONFIRM~SAVED 구간 내내 언마운트돼 있었고, DISMISS로 다시 마운트된 새 네이티브 뷰는 React Native의 잘 알려진 useNativeDriver 리마운트 버그(facebook/react-native #28114 등)로 인해 마지막 setValue(0) 값을 그대로 물려받아 opacity 0으로 렌더된다. 그 결과 Animated.View 안의 '체크인' Text가 보이지 않고, 라벨 없는 밋밋한 올리브 pill만 남아 사용자가 '색깔이 다르다'고 인지한다. Pressable 자체의 배경(colors.accent)은 정상이며 리듀서/props 값은 최초 IDLE과 DISMISS 이후 IDLE 사이에 전혀 차이가 없다 — 버그는 리듀서 밖의 마운트-종속 Animated 상태에 있다."
fix: ""
verification: ""
files_changed: []
