---
title: 재센터 버튼에서 animateToRegion + animateCamera 연속 호출이 iOS 네이티브 카메라 애니메이션 경합을 일으키던 버그
date: 2026-08-28
category: ui-bugs
module: check-in-map-view
problem_type: ui_bug
component: frontend_stimulus
severity: medium
symptoms:
  - "재센터(내 위치로 이동) 버튼을 누르면 지도 위치는 거의 이동하지 않고 나침반/북쪽 각도(heading·pitch)만 바뀐 것처럼 보임"
  - "handleRecenterPress에서 mapRef.current?.animateToRegion(...) 호출 직후 지연 없이 mapRef.current?.animateCamera(...)를 호출하면 재현됨"
  - "iOS MKMapView가 진행 중이던 region 기반 애니메이션을 중간 보간 지점에서 취소하고 camera 기반 애니메이션으로 즉시 갈아탐"
  - "'재센터를 눌렀는데 지도는 그대로인데 각도만 바뀐다'는 형태의 사용자 체감 버그로 보고됨"
  - "지도가 이미 onMapReady를 지나 준비된 상태에서도 재현됨 (map-imperative-calls-before-ready.md의 '아직 준비 안 됨' 케이스와는 무관)"
root_cause: async_timing
resolution_type: code_fix
related_components: [react_native_maps]
tags: [react-native-maps, ios, mkmapview, animatetoregion, animatecamera, animation-race, recenter-button, camera-animation]
---

# 재센터 버튼에서 animateToRegion + animateCamera 연속 호출이 iOS 네이티브 카메라 애니메이션 경합을 일으키던 버그

## Problem

`src/app/index.tsx`의 `handleRecenterPress`("내 위치로 이동" 재센터 버튼 핸들러, 구글맵
스타일의 north-up ↔ compass 모드 토글의 일부)는 같은 네이티브 `MapView` 카메라를
지연 없이 연달아 두 개의 서로 다른 imperative react-native-maps API로 조작한다
(`src/app/index.tsx:453-497`):

1. `mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta, longitudeDelta }, RECENTER_ANIMATION_MS)`
   (`src/app/index.tsx:453-461`) — 카메라 위치/줌을 사용자 위치로 이동.
2. 곧바로 이어서(수정 전에는 두 호출 사이에 `await`가 전혀 없었음) `mapRef.current?.animateCamera({ pitch: COMPASS_PITCH_DEGREES })`
   (`src/app/index.tsx:489`, 나침반 모드 진입) 또는 `mapRef.current?.animateCamera({ heading: 0, pitch: 0 })`
   (`src/app/index.tsx:497`, 북쪽 고정 복귀) — heading/pitch 설정.

iOS에서 react-native-maps의 `MapView`는 `MKMapView`를 감싸고, `animateToRegion`과
`animateCamera`는 서로 독립적인 네이티브 커맨드다(`node_modules/react-native-maps/dist/src/MapView.types.d.ts:160`의
`NativeCommandName` 유니온에 `'animateCamera'`와 `'animateToRegion'`이 별도 항목으로
존재) — 둘 다 같은 카메라 상태를 조작한다. `animateToRegion`의 애니메이션이 아직
진행 중인데 `animateCamera`가 발사되면, 네이티브 지도는 진행 중이던 region
애니메이션을 그 순간의 중간 보간 지점에서 중단시키고 새 camera 애니메이션을
그 지점부터 즉시 시작한다 — JS 쪽에는 에러 하나 없이 조용히.

## Symptoms

- 사용자가 재센터 버튼을 누르면 지도 위치는 거의 그대로인 것처럼 보이고(원래 있던
  곳 근처에 "얼어붙은" 것처럼) heading/pitch 기울임만 눈에 띄게 애니메이션된다.
  "재센터를 눌렀는데 지도 위치는 그대로인데 각도만 바뀐다"는 정확히 이 증상이다.
- **동일한 탭을 반복해도 비결정적으로** 재현된다 — iOS Simulator에서 같은
  팬-후-재센터 사이클을 반복하면 어떤 회차는 정확한 위치로 스냅되고, 어떤 회차는
  아무 일도 안 일어난 것처럼 보였다. 순전히 두 번째 호출이 첫 번째 애니메이션이
  이미 시각적으로 정착된 후에 도착하느냐, 그 전에 도착하느냐의 타이밍 운에 달려
  있었다.
- 에러도, reject된 프로미스도 없다 — 코드 경로는 매번 정확히 도달하고 있었고,
  눈에 보이는 카메라 동작만 잘못됐다.

## What Didn't Work / Investigation Path

- "재센터는 팬/줌 상태와 무관하게 항상 내 위치 기준으로 재확대돼야 한다"는 요구사항
  (`src/app/__tests__/checkin-wiring.test.ts:442-448`의 Test 63이 검증하는
  `MAP_REGION_DELTA` 고정 재확대 동작)을 검증하려고 iOS Simulator에서 팬-후-재센터
  사이클을 여러 차례 반복 실행했다. 어떤 사이클은 됐고 어떤 사이클은 조용히
  실패했다.
- 이 비결정성 자체가 결정적 단서였다 — 순수 로직 버그(잘못된 좌표, 잘못된 delta,
  잘못된 분기)라면 매번 똑같이 실패해야 한다. 입력이 동일한데 어떤 탭은 되고
  어떤 탭은 안 되며 에러도 없다는 건 타이밍/애니메이션 경합을 가리켰다.
- react-native-maps의 JS 쪽 타입 정의와 네이티브 커맨드 표면
  (`node_modules/react-native-maps/dist/src/MapView.d.ts:643-647`,
  `node_modules/react-native-maps/dist/src/MapView.types.d.ts:160`)을 조사해,
  `animateToRegion`과 `animateCamera`가 한쪽이 다른 쪽을 내부적으로 순차 실행하는
  상위 래퍼가 아니라 서로 독립적으로 상대를 중단시킬 수 있는 진짜 별개의 네이티브
  커맨드임을 확인했다.

## Solution

재센터 애니메이션의 길이를 명시적 상수로 두고, `handleRecenterPress`가
`animateToRegion`을 쏜 뒤 정확히 그 길이만큼 기다린 다음에야 후속
`animateCamera`를 호출하도록 바꿨다 — 두 커맨드가 절대 동시에 비행 중이지 않게
만든다.

파일 상단에 선언된 상수(`src/app/index.tsx:86-90`):

```ts
// 재센터 버튼의 animateToRegion(위치+줌) 애니메이션 길이. handleRecenterPress가
// 이 시간만큼 기다린 뒤에야 후속 animateCamera(heading/pitch)를 보낸다 —
// react-native-maps 기본값(500ms)과 동일하게 맞춰 iOS 네이티브 카메라 애니메이션
// 경합을 피한다(아래 handleRecenterPress 주석 참고).
const RECENTER_ANIMATION_MS = 500;
```

**Before** (개념적 — 수정 전 형태, `animateToRegion`에 명시적 duration이 없고
다음 `animateCamera` 전에 대기가 없었다):

```ts
mapRef.current?.animateToRegion({
  latitude: coords.latitude,
  longitude: coords.longitude,
  latitudeDelta: MAP_REGION_DELTA,
  longitudeDelta: MAP_REGION_DELTA,
});
// ...모드 토글 로직이 곧바로 실행됨...
mapRef.current?.animateCamera({ heading: 0, pitch: 0 });
```

**After** (현재 트리 기준, `src/app/index.tsx:453-468`):

```ts
mapRef.current?.animateToRegion(
  {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: MAP_REGION_DELTA,
    longitudeDelta: MAP_REGION_DELTA,
  },
  RECENTER_ANIMATION_MS
);
// 위치 이동 애니메이션이 끝나기 전에 아래에서 곧바로 animateCamera(heading/pitch)를
// 호출하면, iOS MKMapView가 진행 중이던 region 애니메이션을 그 순간의 중간값에서
// 취소하고 새 애니메이션으로 갈아타 버려 재센터가 목표 좌표에 도달하지 못한 채
// 각도만 바뀐 것처럼 보이는 문제가 있었다(region 기반 애니메이션과 camera 기반
// 애니메이션이 같은 네이티브 카메라 상태를 동시에 건드리며 경합). animateToRegion에
// 준 duration만큼 기다린 뒤에야 다음 카메라 명령을 보낸다.
await new Promise((resolve) => setTimeout(resolve, RECENTER_ANIMATION_MS));
```

이 `await` 이후에야 `nextMode`를 계산하고 후속 `animateCamera({ pitch:
COMPASS_PITCH_DEGREES })`(`src/app/index.tsx:489`) 또는 `animateCamera({ heading:
0, pitch: 0 })`(`src/app/index.tsx:497`)를 호출한다.

회귀 테스트 `Test 67`(`src/app/__tests__/checkin-wiring.test.ts:450-465`)이
`handleRecenterPress`의 소스를 정적으로 검사해 다음을 강제한다:
- `animateToRegion(...)`이 `RECENTER_ANIMATION_MS`를 명시적 두 번째 인자로 받는지
  (정규식: `/animateToRegion\(\s*\{[\s\S]*?\},\s*\n\s*RECENTER_ANIMATION_MS\s*\n\s*\);/`)
- `await new Promise((resolve) => setTimeout(resolve, RECENTER_ANIMATION_MS));`가
  존재하는지
- 그 위치가 `animateToRegion(` 호출 뒤, `const nextMode: 'north' | 'compass'` 줄
  앞인지(문자열 인덱스 비교로 확인) — 향후 리팩터링이 대기 위치를 순서 밖으로
  옮기지 못하도록 가드한다.

이 문서 작성 시점 기준, 브랜치 `gsd/phase-03-check-in-core-loop`(리모트 트래킹
브랜치 없음 — 로컬/미푸시)에서 이 수정은 커밋 `821bc48`("feat(03): 내 위치 재센터
버튼을 구글맵 동작에 맞춰 개선")에 반영됐다 — 같은 세션에서 나온 재센터 버튼 관련
다른 변경들과 함께 묶여 있으며, 커밋 메시지가 이 수정을 명시적으로 언급한다
("animateToRegion과 animateCamera를 연달아 호출할 때 iOS가 위치 이동 애니메이션을
중간에 취소하던 네이티브 경합 수정"). 별도의 단독 수정 커밋이 아니다 —
`RECENTER_ANIMATION_MS`와 `await` 기반 순서 제어는 나침반 모드 토글 기능 자체가
처음 도입된 그 커밋에서 함께 들어갔으므로, 대조할 만한 "버그 있던" 이전 커밋이
따로 없다 — 두 호출 시퀀스가 처음 도입된 시점부터 이 경합을 염두에 두고 설계됐다.

## Why This Works

`animateToRegion`과 `animateCamera`는 네이티브 커맨드 표면(`MapView.types.d.ts:160`의
`NativeCommandName` 유니온)에서 서로 독립적인 두 커맨드이며, 각각 단독으로 하부
`MKMapView`의 카메라 애니메이션을 장악할 수 있다. 첫 번째가 아직 진행 중일 때
두 번째를 호출하는 건 JS 쪽에 이를 막을 동기화 수단이 전혀 없는 네이티브 레벨
경합이다 — react-native-maps의 JS 레이어는 네이티브 커맨드를 발사하고 즉시
반환한다(`void`); 네이티브 애니메이션이 끝날 때 resolve되는 프로미스를 돌려주지
않는다. `RECENTER_ANIMATION_MS = 500`은 react-native-maps의 `animateToRegion`
기본 duration과 같은 값이므로, 이 값을 `animateToRegion`의 두 번째 인자로 명시
전달하고(`src/app/index.tsx:453-461`) 같은 길이만큼 `setTimeout`을
`await`하면(`src/app/index.tsx:468`) 두 번째 네이티브 애니메이션이 발사되는
시점엔 첫 번째가 이미 끝나 있음을 보장한다 — 경합 구간을 줄이는 게 아니라
아예 없애는 방식이다.

## Alternative Considered — 단일 `animateCamera` 호출로 합치기

react-native-maps의 `Camera` 타입(`node_modules/react-native-maps/dist/src/MapView.types.d.ts:3-14`)은:

```ts
export type Camera = {
    altitude?: number;   // Apple Maps
    center: LatLng;
    heading: number;
    pitch: number;
    zoom?: number;        // Google Maps
};
```

이고, `animateCamera(camera: Partial<Camera>, opts?: { duration?: number })`는
`heading`/`pitch`와 함께 `center` 필드도 받는다
(`node_modules/react-native-maps/dist/src/MapView.d.ts:643-645`). 원리적으로는
위치 이동과 heading/pitch 변경을 `animateCamera({ center: { latitude, longitude },
heading, pitch }, { duration: RECENTER_ANIMATION_MS })` 하나의 네이티브 호출로
합쳐서, 타이밍이 아니라 애초에 호출 자체를 하나로 만들어 경합을 원천 차단할 수도
있었다.

이 방식을 채택하지 않은 이유는, 이 앱의 줌 제어가 `Region`의
`latitudeDelta`/`longitudeDelta`(`MAP_REGION_DELTA`, `src/app/index.tsx:80`)로
표현돼 있고, 파일 안의 모든 `animateToRegion` 호출 지점(예:
`src/app/index.tsx:280-285`, `294-302`, `307-312`, `440-448`, `453-461`,
`560-...`)이 이 방식을 쓰기 때문이다. 반면 `Camera.zoom`은 구글맵 전용 필드로,
이 앱이 쓰는 애플 지도 provider(파일에 `provider` prop 자체가 없음 — 파일 헤더
주석 `src/app/index.tsx:12-16`에 애플 지도를 기본값으로 채택한 근거가 있음)에는
delta에 대응하는 동등한 필드가 없다. 위치 설정 호출을 `animateCamera`로 바꾸려면
파일 전역에서 쓰는 `latitudeDelta`/`longitudeDelta` 기반 줌 모델을 포기하거나
두 가지 줌 표현을 병행 유지해야 했을 것 — 이미 `Region`에 합의된 두 호출의 순서만
조정하는 것보다 훨씬 크고 위험한 변경이다. 최소 범위의 `await` 기반 순서 제어를
채택했고, 파일의 줌 모델이 `Region` delta에서 벗어나게 된다면 합친 호출 방식을
후속 개선으로 재검토할 수 있다.

## Prevention

같은 네이티브 뷰 위에서 서로 다른 imperative "카메라"/애니메이션 API를 여러 개
노출하는 컴포넌트(region 기반 vs camera 기반, 또는 같은 네이티브 애니메이션
상태를 각자 독립적으로 조작할 수 있는 임의의 두 API)를 다룰 때, 첫 번째가 아직
애니메이션 중인데 두 번째를 호출하면 네이티브 레이어가 첫 번째를 JS 쪽에 아무
신호도 없이 조용히 중단/취소할 수 있다. 이런 버그는 보통 **일관되게가 아니라
간헐적으로** 나타난다 — 두 번째 호출이 첫 번째가 시각적으로 정착되기 전에
도착하느냐 후에 도착하느냐가 실제 벽시계 애니메이션 타이밍, JS 스레드 스케줄링,
기기 속도에 달려 있기 때문이다. **동일한 조작을 반복해도 비결정적으로 실패하는
UI 오동작**은 로직 버그가 아니라 정확히 이런 종류의 애니메이션 경합을 의심할
신호로 취급한다.

수정 패턴은 둘 중 하나다:
- **(a) 순서 제어**: 첫 애니메이션의 duration만큼 명시적으로 `await`한다(이번에
  채택한 방식 — `src/app/index.tsx:90`의 `RECENTER_ANIMATION_MS`와 `:468`의
  `await new Promise((resolve) => setTimeout(resolve, RECENTER_ANIMATION_MS))`).
- **(b) 단일 호출로 합치기**: API가 두 효과를 한 번에 표현할 수 있다면 그렇게
  한다(react-native-maps의 `animateCamera`는 `MapView.types.d.ts:3-14`의 `Camera`
  타입대로 `center` + `heading` + `pitch`를 함께 받을 수 있다 — 이 특정 사례에서
  왜 채택하지 않았는지는 위 "Alternative Considered" 참고, 이 파일의 줌 모델이
  바뀌면 재검토).

이 종류의 버그에 회귀 테스트를 추가할 때는, 대기가 실제로 트리거 호출과
의존 호출 사이라는 **순서 자체**를 단언해야 한다(`Test 67`이
`src/app/__tests__/checkin-wiring.test.ts:459-464`에서 문자열 인덱스 비교로
하는 것처럼) — duration 상수와 `setTimeout`이 함수 어딘가에 존재하기만 하는지만
체크하는 정적 테스트는, 향후 리팩터링이 `await`를 순서 밖으로 옮겨도 잡아내지
못한다.

## Related Issues

- [`docs/solutions/runtime-errors/map-imperative-calls-before-ready.md`](../runtime-errors/map-imperative-calls-before-ready.md) —
  같은 파일(`src/app/index.tsx`), 같은 컴포넌트(`MapView`)에서 발생한 **다른**
  버그. 그 문서는 "네이티브 뷰가 아직 준비되지 않은 시점"(`onMapReady` 이전)의
  imperative 호출 무시를 다루고, 이 문서는 "이미 준비된 뷰에서 두 imperative
  호출이 서로 경합"하는 문제를 다룬다 — root cause와 해법(이벤트 기반 1회성 래치
  vs 고정 duration 기반 순서 제어)이 서로 다르므로 병합하지 않고 교차 참조로
  남긴다. 그 문서의 Prevention 규칙 1번("반드시 `await waitForMapReady()`를 거친
  뒤 호출")은 "최초 준비 대기"만 다루며 "이미 준비된 뒤의 연속 호출 간 순서"는
  다루지 않는다는 점에서 커버리지가 보완적이다.
- [`docs/solutions/logic-errors/location-cache-accuracy-vs-freshness.md`](../logic-errors/location-cache-accuracy-vs-freshness.md) —
  같은 파일·같은 `handleRecenterPress`에서 발생한 또 다른 독립적 버그(네이티브 카메라
  애니메이션 경합이 아니라 OS 위치 캐시의 정확도 미검증). `handleRecenterPress`를
  만지는 개발자는 이 문서를 포함해 세 문서를 함께 참고한다.

---

*참고: 위 코드 변경은 브랜치 `gsd/phase-03-check-in-core-loop`의 커밋
`821bc48`(로컬, 이 문서 작성 시점 기준 미푸시 상태)에 반영되어 있다. 이 브랜치는
로컬에만 존재하며 리베이스 등으로 SHA가 바뀔 수 있으므로, 이 커밋 해시는 "이 문서
작성 시점" 기준 참조로만 취급한다.*
