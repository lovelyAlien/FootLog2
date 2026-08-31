---
title: 콜드 부팅 직후 재센터/체크인/드래프트 복구 버튼이 무반응이던 버그
date: 2026-08-28
category: runtime-errors
module: check-in-map-view
problem_type: runtime_error
component: frontend_stimulus
severity: high
symptoms:
  - "재센터(내 위치로) 버튼의 첫 탭이 콜드 부팅 직후 아무 반응이 없음"
  - "체크인 버튼을 눌렀을 때의 지도 카메라 팬 이동이 첫 실행 시 동작하지 않음"
  - "드래프트 복구 이펙트의 카메라 이동도 콜드 부팅 후 첫 시도에서 무시됨"
  - "MapView.animateToRegion() 호출이 에러 없이 조용히 무시됨(no-op)"
  - "JS-only Fast Refresh 리로드에서는 재현되지 않고, 진짜 콜드 앱 실행에서만 재현됨"
root_cause: async_timing
resolution_type: code_fix
related_components:
  - react_native_maps
tags: [react-native-maps, ios, mapview, async-timing, cold-launch, animate-to-region, imperative-api, map-ready]
---

# 콜드 부팅 직후 재센터/체크인/드래프트 복구 버튼이 무반응이던 버그

## Problem

`src/app/index.tsx`의 지도 화면에는 카메라를 이동시키는 imperative 호출 지점이 여러 곳
있다 — 앱 부팅 시 드래프트 복구 effect, "내 위치로 이동"(재센터) 버튼, 체크인 캡처
플로우. 모두 `MapView`(react-native-maps, provider 미지정 = 애플 지도)의 ref를 통해
`mapRef.current?.animateToRegion(...)`를 직접 호출하는 구조였다.

iOS에서 `MKMapView`(react-native-maps가 감싸는 네이티브 뷰)는 자신의 내부 초기화가
끝나기 전에 `animateToRegion` 등 imperative 메서드가 호출되면 에러나 예외 없이 그
호출을 조용히 무시한다. 이 창(window)은 "진짜 콜드 프로세스 실행"(네이티브 뷰
인스턴스가 새로 생성되는 시점)에만 존재하고, Metro Fast Refresh/Hot Reload로는
재현되지 않는다 — Fast Refresh는 JS 컴포넌트 상태만 리셋할 뿐, 직전 JS 인스턴스가 이미
초기화해둔 네이티브 `MapView` 인스턴스를 그대로 재사용하기 때문이다. 그 결과 Fast
Refresh만으로 검증하면 "카메라 이동이 항상 잘 동작한다"는 잘못된 확신을 얻게 된다 —
콜드 부팅 시나리오 자체가 테스트 루프에서 빠져 있었던 셈이다.

## Symptoms

- 앱을 완전히 새로 실행한 직후, "내 위치로 이동"(재센터) 버튼을 처음 눌러도 지도
  카메라가 전혀 움직이지 않는다. 잠시 후 같은 버튼을 다시 누르면 정상 동작한다.
- 같은 콜드 부팅 창에서 "체크인" 버튼을 탭해 확인 핀을 찍어도, 핀 위치로 카메라가
  이동하지 않을 수 있다(핀 자체와 드래프트 저장은 정상 진행됨 — 시각 효과만 누락).
- 미저장 드래프트가 있는 상태로 앱을 재시작하면, 드래프트 복구는 되지만(확인 핀은
  뜸) 지도가 그 좌표로 자동 스크롤되지 않을 수 있다.
- 세 증상 모두 콘솔에 에러나 경고를 남기지 않는다 — 호출은 실행되지만 네이티브 쪽에서
  아무 일도 일어나지 않을 뿐이라 디버깅 신호가 없다.
- Metro Fast Refresh로 화면을 리셋해서 재현을 시도하면 매번 정상 동작해, 재현 자체가
  간헐적/불가능한 것처럼 보인다.

## What Didn't Work

- **좌표 계산 의심(막다른 길)**: 시뮬레이터 자동화 탭이 "아무 반응이 없는" 것처럼
  보이는 현상 때문에, 처음에는 iOS Simulator 자동화 도구가 잘못된 좌표를 탭하고
  있다고 의심했다. 탭 좌표 계산을 여러 차례 다시 시도하며 시간을 들였지만, 실제
  원인(지도가 아직 준비되지 않음)과는 무관한 방향이었고 결국 폐기했다.
- **Fast Refresh 기반 재현 시도**: Metro Fast Refresh로 화면을 리셋한 뒤 버튼을
  눌러 재현을 시도했으나 매번 정상 동작했다 — 위 Problem 절에서 설명한 대로 Fast
  Refresh가 이미 준비된 네이티브 `MapView` 인스턴스를 재사용하기 때문에, 이 경로로는
  "콜드 부팅 시에만 존재하는 창"을 애초에 재현할 수 없었다. 이 사실을 깨닫기 전까지는
  "재현이 안 되니 버그가 아닐 수도 있다"는 잘못된 판단으로 이어질 뻔했다.
- **진짜 콜드 부팅으로 재현 확인**: `xcrun simctl terminate`로 앱 프로세스를 완전히
  종료한 뒤 재실행하고, 재센터 버튼을 즉시 첫 탭했더니 카메라가 전혀 움직이지 않는
  것을 확인했다. 곧이어 두 번째 탭에서는 정상 동작 — 그 사이에 네이티브 지도가 준비를
  마쳤다는 뜻이었다. 이 관찰이 "좌표 문제"가 아니라 "네이티브 뷰 준비 시점 문제"라는
  실제 원인을 가리켰다.
- **단계별 `console.log` 계측**: 재센터 핸들러의 각 단계(권한 확인 → 위치 조회 →
  이후 `waitForMapReady` 도입 지점 → `animateToRegion` 호출)마다 임시 로그를 넣어,
  JS 로직은 매번 정확히 `animateToRegion` 호출까지 도달하고 있으며 문제가 그 호출
  *자체*(네이티브 쪽 무시)에 있다는 것을 확인했다. 로그는 검증 후 제거했다.

## Solution

`src/app/index.tsx`에 "지도 준비 여부"를 추적하는 ref 기반 게이트를 추가하고, 카메라를
움직이는 모든 호출 지점 앞에서 그 게이트를 `await`하도록 바꿨다.

**Before** (커밋 `821bc48`의 부모 상태 — 재센터 버튼 예시, `MapView`에는 `onMapReady`
prop 자체가 없었다):

```tsx
// handleRecenterPress 내부
const position = await defaultLocationDeps.getCurrentPositionAsync({
  accuracy: LOCATION_ACCURACY_BALANCED,
});
mapRef.current?.animateToRegion({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  latitudeDelta: MAP_REGION_DELTA,
  longitudeDelta: MAP_REGION_DELTA,
});
```

```tsx
<MapView
  ref={mapRef}
  style={StyleSheet.absoluteFill}
  showsUserLocation
  onRegionChangeComplete={handleRegionChangeComplete}
  onPress={handleFinishCheckin}
>
```

**After** (`src/app/index.tsx:365-380`에 게이트 정의, `:786`에 배선, 4개 호출 지점에
`await waitForMapReady();` 삽입):

```tsx
// src/app/index.tsx:365-380
const isMapReadyRef = useRef(false);
const mapReadyWaitersRef = useRef<Array<() => void>>([]);

const handleMapReady = useCallback(() => {
  isMapReadyRef.current = true;
  const waiters = mapReadyWaitersRef.current;
  mapReadyWaitersRef.current = [];
  waiters.forEach((resolve) => resolve());
}, []);

const waitForMapReady = useCallback(() => {
  if (isMapReadyRef.current) return Promise.resolve();
  return new Promise<void>((resolve) => {
    mapReadyWaitersRef.current.push(resolve);
  });
}, []);
```

```tsx
// src/app/index.tsx:780-788
<MapView
  ref={mapRef}
  style={StyleSheet.absoluteFill}
  showsUserLocation
  onRegionChangeComplete={handleRegionChangeComplete}
  onPanDrag={handlePanDrag}
  onMapReady={handleMapReady}
  onPress={handleFinishCheckin}
>
```

`await waitForMapReady();`는 카메라를 옮기는 4개 지점 모두에 삽입됐다(모두
`mapRef.current?.animateToRegion(...)` 직전):

1. `src/app/index.tsx:278` — 드래프트 복구 effect, 기존 드래프트가 있는 분기
   (`draft !== null`)
2. `src/app/index.tsx:305` — 같은 드래프트 복구 effect, 드래프트가 없어 "내 위치
   기준으로 최초 확대"를 수행하는 분기
3. `src/app/index.tsx:452` — `handleRecenterPress`(재센터 버튼)
4. `src/app/index.tsx:559` — `handleCheckinPress`(체크인 캡처 플로우)

이 4개 지점 모두 커밋 `821bc48`에서 한 번에 도입됐다 — "드래프트 없을 때 내 위치로
최초 확대" 기능 자체도 같은 커밋에서 처음 추가된 것이라, `onMapReady` 게이팅이 이
기능의 첫 구현 시점부터 이미 적용돼 있었다(별도 후속 커밋에서 뒤늦게 게이팅을
추가한 것이 아니다). 이 커밋 이전에는 게이팅 없는 `animateToRegion` 호출 지점이
드래프트 복구(단일 분기)·재센터·체크인 캡처 3곳이었다.

`resolveInstantPosition`의 `onRefine` 콜백(캐시 값을 먼저 보여준 뒤 백그라운드 GPS로
재보정하는 경로, `src/app/index.tsx:292-303`, `438-449`)이 호출하는 `animateToRegion`은
이 게이트를 거치지 않는다. 다만 이건 코드가 강제하는 불변식은 아니다 —
`getCurrentPositionAsync().then(onRefine)`이 백그라운드에서 비동기로 실행되는 동안,
`onRefine`이 호출 지점의 `await waitForMapReady()`보다 먼저 fire되는 걸 코드 상 막는
장치는 없다. 실제로 가드가 없어도 문제가 되지 않는 이유는 순전히 타이밍상의 경험적
사실 때문이다 — 네이티브 `onMapReady`는 보통 실제 GPS fix보다 훨씬 먼저 끝나므로,
`onRefine`이 호출되는 시점엔 이미 지도가 준비돼 있는 경우가 사실상 전부다. 이 지점의
타이밍 가정이 실제로 깨지는 사례가 나오면(예: 매우 느린 콜드 부팅과 매우 빠른 GPS
캐시 응답이 겹치는 기기), 여기에도 별도로 `await waitForMapReady()`를 추가하는 게
맞다.

## Why This Works

`onMapReady`는 react-native-maps가 노출하는, 네이티브 `MapView`(iOS에서는
`MKMapView`)의 초기화가 완료된 시점에 정확히 1회 fire되는 콜백이다. `isMapReadyRef`와
`mapReadyWaitersRef` + `waitForMapReady`는 이 1회성 이벤트를 "이미 지났으면 즉시
resolve, 아직이면 큐에 넣고 나중에 resolve"하는 형태의 간단한 준비-완료 래치(latch)로
바꾼다. 카메라를 움직이는 모든 imperative 호출이 이 래치를 통과하도록 강제하면,
콜드 부팅 직후처럼 JS 코드가 네이티브 뷰 초기화보다 먼저 실행되는 레이스가 발생해도
`animateToRegion` 호출이 지도가 준비된 뒤로 자연히 미뤄진다 — 네이티브 쪽이 조용히
무시해버리는 대신, 그 호출 자체가 준비될 때까지 기다리게 되는 것이다.

## Prevention

- **imperative 카메라 API를 다루는 새 코드는 반드시 `await waitForMapReady()`를 거친
  뒤 `mapRef.current?.animateToRegion(...)` / `animateCamera(...)` / `setCamera(...)`를
  호출한다.** 이 계약은 `src/app/__tests__/checkin-wiring.test.ts`의
  "지도 준비 대기 배선 계약 (콜드 부팅 첫 탭 무반응 회귀 가드)" describe 블록(파일
  라인 344)이 정적 소스 분석으로 강제한다:
  - Test 51(라인 348): `<MapView>`에 `onMapReady={handleMapReady}`가 배선돼 있는지
  - Test 52(라인 352): `handleMapReady`가 `isMapReadyRef.current = true`를 설정하고
    대기 중인 콜백들을 모두 `resolve`하는지
  - Test 53(라인 360, 회귀 가드로 명시): `await waitForMapReady();` 바로 뒤에
    `mapRef.current?.animateToRegion(`이 오는 지점이 정확히 4개인지 정규식으로 카운트
  - Test 54(라인 365): `waitForMapReady`가 이미 준비된 경우 즉시 resolve하고, 아니면
    `mapReadyWaitersRef`에 큐잉하는지
  - 새로운 카메라 이동 호출 지점을 추가할 때 Test 53의 카운트(4)가 자동으로
    깨지므로, 게이트 없이 지나가는 새 호출 지점을 추가하면 테스트가 실패한다.
- **"Fast Refresh로 확인했다"는 이 클래스의 버그(네이티브 뷰 준비 타이밍)에 대해서는
  검증으로 인정하지 않는다.** Fast Refresh는 JS 상태만 리셋하고 이미 초기화된 네이티브
  `MapView` 인스턴스를 재사용하므로, 콜드 부팅에서만 존재하는 "네이티브 뷰가 아직
  준비되지 않은 창"을 원천적으로 재현하지 못한다. 이 `MapView`(또는 유사하게 무거운
  네이티브 초기화를 갖는 컴포넌트)의 부팅 시점 동작을 바꾸는 변경은, 반드시
  `xcrun simctl terminate` 후 재실행(또는 실기기 강제종료 후 재실행) — 즉 네이티브
  뷰 인스턴스가 실제로 새로 생성되는 진짜 콜드 부팅 — 으로 첫 상호작용을 검증한다.
  이번 수정도 이 방식(시뮬레이터 `terminate` + 재실행 직후 재센터 버튼 첫 탭)으로
  카메라가 첫 탭에 바로 움직이는 것을 확인했다.
- 이 프로젝트의 표준 검증 게이트인 `npm test`(`package.json`의 `test` 스크립트,
  `NODE_OPTIONS=--experimental-sqlite jest`)와 `npx tsc --noEmit`도 함께 통과시킨다.

## Related Issues

- 이 저장소에 관련 GitHub 이슈 없음(`gh issue list` 검색 결과 없음).
- [`docs/solutions/ui-bugs/map-camera-animation-race.md`](../ui-bugs/map-camera-animation-race.md) —
  같은 파일(`src/app/index.tsx`), 같은 컴포넌트(`MapView`)에서 발생한 **다른** 버그.
  이 문서는 "네이티브 뷰가 아직 준비되지 않은 시점"의 imperative 호출 무시를
  다루지만, 그 문서는 "이미 준비된 뷰에서 두 imperative 애니메이션 호출
  (`animateToRegion`, `animateCamera`)이 서로 경합"하는 문제를 다룬다 — 아래
  Prevention 규칙 1번은 "최초 준비 대기"만 다룰 뿐 "이미 준비된 뒤의 연속 호출
  간 순서"는 다루지 않으므로, 그 커버리지가 필요하면 해당 문서를 참고한다.
- [`docs/solutions/logic-errors/location-cache-accuracy-vs-freshness.md`](../logic-errors/location-cache-accuracy-vs-freshness.md) —
  이 문서의 Solution 절이 `onRefine` 콜백은 `waitForMapReady` 게이트를 거치지 않으며
  이것이 "코드로 강제된 불변식이 아니라 순전히 타이밍상의 경험적 사실"이라고 지적해뒀는데,
  그 `onRefine` 자체가 겪은 별도의 버그(OS 캐시 위치의 정확도 미검증)를 다루는 문서다.
  같은 콜백을 만질 때는 두 문서를 함께 참고한다.

---

*참고: 위 코드 변경은 브랜치 `gsd/phase-03-check-in-core-loop`의 커밋
`821bc48`(로컬, 이 문서 작성 시점 기준 미푸시 상태)에 반영되어 있다. 이 브랜치는
로컬에만 존재하며 리베이스 등으로 SHA가 바뀔 수 있으므로, 이 커밋 해시는 "이 문서
작성 시점" 기준 참조로만 취급한다.*
