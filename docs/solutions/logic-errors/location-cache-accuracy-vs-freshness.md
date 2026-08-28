---
title: 재센터 버튼이 OS 캐시 위치를 정확도 검증 없이 신뢰해 여러 번 눌러야 정확한 위치로 수렴하던 버그
date: 2026-08-28
category: logic-errors
module: check-in-map-view
problem_type: logic_error
component: frontend_stimulus
severity: medium
symptoms:
  - "재센터(내 위치로 이동) 버튼을 여러 번 눌러야 지도가 실제 GPS 위치로 수렴함"
  - "resolveInstantPosition()이 getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })로 얻은 OS 캐시 위치를 정확도 검증 없이 즉시 신뢰함"
  - "앱을 막 실행했거나 GPS 신호를 막 재획득한 시점에는 캐시된 위치가 Wi-Fi/기지국 기반의 부정확한 추정치일 수 있음"
  - "매 탭마다 iOS가 백그라운드에서 정제한 더 정확한 캐시 값을 읽어오면서 점점 실제 위치로 수렴하는 것처럼 보임(회귀로 오인되기 쉬움)"
  - "초기 실행 시 '내 위치로 자동 이동' 이펙트에서도 동일하게 부정확한 첫 좌표가 사용됨"
root_cause: logic_error
resolution_type: code_fix
related_components: [react_native_maps]
tags: [expo-location, getlastknownpositionasync, getcurrentpositionasync, location-accuracy, recenter-button, gps-cache, maxage, onrefine]
---

# 재센터 버튼이 OS 캐시 위치를 정확도 검증 없이 신뢰해 여러 번 눌러야 정확한 위치로 수렴하던 버그

## Problem

`src/app/index.tsx`의 `resolveInstantPosition()`(재센터 버튼과 앱 최초 진입 시 "내 위치로
확대" effect가 공유하는 모듈 레벨 함수, `src/app/index.tsx:113-147`)는 구글맵처럼 즉시
반응하도록 설계돼 있다. 먼저 `expo-location`의 `getLastKnownPositionAsync({ maxAge:
LAST_KNOWN_MAX_AGE_MS })` — OS가 들고 있는 최근 캐시 위치 — 를 시도하고, 신선한 캐시가
있으면 새 GPS fix를 기다리지 않고 그 값을 즉시 반환한다(`src/app/index.tsx:116-126`).

문제는 `getLastKnownPositionAsync`가 받는 옵션 타입 `LocationLastKnownOptions`
(`node_modules/expo-location/build/Location.types.d.ts:125-136`)에 서로 독립된 필터가
두 개 있다는 점이다.

```ts
export type LocationLastKnownOptions = {
    /**
     * A number of milliseconds after which the last known location starts to be invalid and thus
     * `null` is returned.
     */
    maxAge?: number;
    /**
     * The maximum radius of uncertainty for the location, measured in meters. If the last known
     * location's accuracy radius is bigger (less accurate) then `null` is returned.
     */
    requiredAccuracy?: number;
};
```

- `maxAge` — 캐시가 **얼마나 오래됐는지**(신선도)만 검사한다.
- `requiredAccuracy` — 캐시의 **정확도 반경이 얼마나 나쁜지**는 별도로 검사한다. 이 필드를
  주지 않으면 정확도는 전혀 걸러지지 않는다.

수정 전 코드는 `maxAge`만 넘기고 `requiredAccuracy`는 아예 쓰지 않았다. 그 결과 "10초 이내에
캐시된 값"이기만 하면, 그 값이 GPS 실측이든 Wi-Fi/기지국 기반의 거친 추정치든 구분 없이 그대로
화면에 반영됐다.

## Symptoms

- 재센터 버튼을 한 번 눌렀을 때 지도가 실제 위치가 아닌 다른 지점으로 먼저 이동하고, 버튼을
  연달아 누르면 그때마다 점점 실제 위치에 가까워진다.
- 앱을 막 켰을 때(드래프트가 없어 최초 진입 시 "내 위치로 확대" effect가 도는 경우,
  `src/app/index.tsx:264-318`)도 동일한 패턴이 나타난다.
- GPS 신호를 막 다시 잡은 직후(예: 실내에서 나온 직후)일수록 더 잘 재현되고, 이미 GPS가
  안정적으로 오래 잡혀 있던 상태에서는 첫 탭부터 정확해 재현되지 않는다 — "일관되게 재현되는
  버그"가 아니라 "타이밍에 따라 확률적으로 나타나는 증상"이었다.

## Investigation

사용자가 다음과 같이 직접 보고했다: "맵을 내 위치에서 벗어나서 이동하고 내 위치 버튼을
누르면 한번에 내 위치가 화면에 보이도록 이동하지 않고 다른 곳에 이동하다가 계속 누르다보면
내 위치가 중심에 있는 화면으로 이동하는데 왜 그런지 확인해줘".

`handleRecenterPress`(`src/app/index.tsx:431-449`)와 `resolveInstantPosition`을 먼저 훑었을
때는 흔히 의심할 만한 원인들 — 애니메이션 타이밍 경합, 오래된 클로저, region 계산 실수 —
이 눈에 띄지 않았다. 실제 원인은 시행착오식 디버깅이 아니라 `expo-location`의
`LocationLastKnownOptions` 타입 정의(`node_modules/expo-location/build/Location.types.d.ts:125-136`)를
직접 읽는 과정에서 드러났다: `requiredAccuracy` 필드가 존재하는데 코드에서 전혀 쓰이지
않고 있었다. 이 필드의 존재 자체가 "반복해서 누를수록 나아진다"는 증상을 곧바로 설명했다 —
버튼 클릭 순서나 앱 로직에는 문제가 없고, iOS가 `MapView`의 `showsUserLocation`으로 인해
CoreLocation을 계속 활성 상태로 유지하면서 백그라운드에서 캐시된 위치를 스스로 계속
정제(refine)하고 있었을 뿐이었다. 매 탭마다 그 순간 OS가 들고 있던 캐시를 그대로 읽었을
뿐이고, OS 쪽 데이터 자체가 시간이 지나며 수렴해가고 있었던 것이다.

이 버그는 같은 화면 영역에서 이전에 고쳤던 다른 두 MapView 버그(콜드 부팅 직후 imperative
호출 무시, `animateToRegion`과 `animateCamera` 네이티브 카메라 경합)와 원인의 성격이
정반대다. 그 둘은 네이티브 카메라 API를 **언제** 부르느냐(준비 상태, 애니메이션 순서)의
문제였던 반면, 이번 버그는 이미 타이밍이 올바른 호출에 **어떤 입력 데이터**를 먹였느냐의
문제였다 — 캐시 조회 자체는 제때 이뤄졌지만, 그 캐시가 정확한 값이라는 보장이 없었다.

## What Didn't Work

이번 사이클에서는 잘못된 방향으로 흘렀던 별도의 수정 시도는 없었다 — 타입 정의를 먼저
읽어 근본 원인을 특정한 뒤 바로 올바른 수정으로 이어졌다. 다만 고려했다가 채택하지 않은
대안이 하나 있다: `getLastKnownPositionAsync`에 `requiredAccuracy`를 추가로 넘겨 애초에
부정확한 캐시를 걸러내는 방법. 이 방법은 캐시가 그 기준을 통과하지 못하면 매번
`getCurrentPositionAsync`의 새 GPS fix를 기다려야 해, 이 함수가 원래 얻으려던 "즉시 반응"
이점을 반납하게 된다. 채택한 해법은 캐시값으로 일단 즉시 반응하되, 백그라운드에서 GPS로
조용히 재보정하는 쪽이다(아래 Solution 참고).

## Solution

`resolveInstantPosition`에 `onRefine` 콜백 파라미터를 추가했다(`src/app/index.tsx:113-115`).
신선한 캐시를 반환하는 분기에서만, 캐시값을 그대로 즉시 반환하는 것과 별개로(await하지 않음)
백그라운드에서 `getCurrentPositionAsync`를 한 번 더 띄우고, 그 결과가 오면 `onRefine`으로
넘긴다.

Before (`git show 0d91ec0^:src/app/index.tsx`, 즉 수정 전):

```ts
async function resolveInstantPosition(): Promise<{ latitude: number; longitude: number } | null> {
  const freshCache = await defaultLocationDeps
    .getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })
    .catch(() => null);
  if (freshCache) return freshCache.coords;
  // ... GPS-vs-timeout race, stale cache fallback
}
```

After (`src/app/index.tsx:113-147`):

```ts
async function resolveInstantPosition(
  onRefine?: (coords: { latitude: number; longitude: number }) => void
): Promise<{ latitude: number; longitude: number } | null> {
  const freshCache = await defaultLocationDeps
    .getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })
    .catch(() => null);
  if (freshCache) {
    if (onRefine) {
      defaultLocationDeps
        .getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY_BALANCED })
        .then((position) => onRefine(position.coords))
        .catch(() => {});
    }
    return freshCache.coords;
  }
  // ... GPS-vs-timeout race, stale cache fallback (unchanged)
}
```

호출부 두 곳 모두 `onRefine`을 넘기고, 콜백 안에서 "이 요청이 여전히 최신 요청인가"를
`recenterRequestIdRef`(`src/app/index.tsx:181`) 세대 카운터로 확인한 뒤에만 지도를
재애니메이션한다.

- `handleRecenterPress`(`src/app/index.tsx:431-449`): 탭마다 `requestId =
  ++recenterRequestIdRef.current`로 새 세대를 발급하고, `onRefine` 콜백 안에서
  `recenterRequestIdRef.current !== requestId`면 조용히 무시한다.
- 최초 진입 "내 위치로 확대" effect(`src/app/index.tsx:290-303`, `draft === null` 분기):
  `initialRequestId = recenterRequestIdRef.current`를 캡처해 두고 동일한 방식으로
  가드한다.
- `handlePanDrag`(`src/app/index.tsx:389-393`): 사용자가 지도를 손으로 옮기면
  `recenterRequestIdRef.current += 1`로 세대를 무효화한다 — 아직 안 끝난 백그라운드
  GPS 보정이 나중에 도착해도, 사용자가 방금 옮긴 화면을 도로 잡아채지 않는다.

이 가드가 없으면, 보정 GPS 결과가 도착하기 전에 사용자가 다시 탭하거나 지도를 손으로
옮겼을 때 뒤늦게 도착한 이전 탭의 보정값이 화면을 덮어써버리는 새로운 경합 버그가 생겼을
것이다.

## Why This Works

- 사용자 체감 반응성은 그대로 유지된다 — 캐시가 있으면 여전히 기다림 없이 즉시 화면이
  움직인다.
- 정확도는 이제 백그라운드에서 한 번 더 확보된다 — 캐시가 부정확했더라도, 잠시 후 실제
  GPS fix로 조용히 스냅된다. 사용자 입장에서는 "누를 때마다 나아지던" 경험이 "한 번만
  눌러도 잠시 후 저절로 정확해지는" 경험으로 바뀐다(구글맵과 동일한 체감).
- 세대 카운터(`recenterRequestIdRef`)가 stale closure 문제를 막는다 — `onRefine`은
  `resolveInstantPosition`이 시작될 때 캡처된 클로저이므로, 그 사이에 사용자가 다시
  탭하거나 지도를 손으로 옮기면 이 콜백은 더 이상 "최신 사용자 의도"를 대표하지 않는다.
  세대 번호 비교로 그 콜백을 무해한 no-op으로 만든다.
- 캐시가 없어 fresh GPS 경로(`getCurrentPositionAsync` 직접 호출, `src/app/index.tsx:129-146`)를
  탄 경우는 `onRefine`을 아예 부르지 않는다 — 이미 실측 GPS fix를 썼으므로 다시 보정할
  대상이 없다.

## Prevention

**일반 교훈**: OS나 라이브러리 API가 "느리지만 확실한 조회"의 빠른 대안으로 캐시/마지막
알려진 값을 제공할 때는, 그 API가 신선도(freshness)와 정확도/품질(accuracy/quality)
필터를 **둘 다** 노출하는지 반드시 확인한다. 신선도 필터만 쓰면, 최근 값이기만 하면
아무리 부정확해도 그대로 통과시켜버린다. "여러 번 시도할수록 결과가 나아진다"는 증상은
바로 이 실수의 특징적인 시그니처다 — 앱 로직이 아니라 캐시 뒤편의 시스템이 시간이 지나며
스스로 수렴해가고 있다는 신호로 읽어야 한다. 이번 경우처럼 옵션 타입 정의를 직접 읽는 것이
trial-and-error 디버깅보다 빨랐다 — 타입에 이미 정답이 있었다.

**검증 한계 — 시뮬레이터로 원천 재현 불가능**: 이 버그의 핵심 메커니즘(OS 위치 캐시의
정확도가 실제 wall-clock 시간이 지나며 수렴하는 현상)은 iOS Simulator로 재현할 수 없다.
`simctl location set`은 이미 최대 정확도로 고정된 좌표를 즉시 제공할 뿐, 정확도가
점진적으로 나빠졌다가 좋아지는 과정을 시뮬레이션하지 않는다. 실제로 이번 수정은
`npm test`와 `npx tsc --noEmit` 통과, 그리고 코드/타입 리뷰로 검증했다 — 재센터 버튼과
최초 진입 확대가 시뮬레이터에서 여전히 정상 동작하는지(회귀 없음)는 확인했지만, 원래
증상이었던 "캐시 정확도가 시간에 따라 수렴하는 현상" 자체는 시뮬레이터로 재현·검증하지
않았다(할 수 없다). 이런 종류의 버그는 앞으로도 (a) API 시맨틱스를 코드/타입 정의
수준에서 꼼꼼히 검토하거나, (b) 실기기에서 시간 경과를 두고 테스트하는 방법으로만 검증할
수 있다는 점을 프로세스로 남겨둔다.

## Related Issues

- [`docs/solutions/runtime-errors/map-imperative-calls-before-ready.md`](../runtime-errors/map-imperative-calls-before-ready.md) —
  같은 파일·같은 `onRefine` 경로를 다루는 문서. 그 문서는 이미 "`onRefine`이 `waitForMapReady`
  게이트를 거치지 않으며, 이는 코드로 강제된 불변식이 아니라 순전히 타이밍상의 경험적
  사실에 의존한다"고 지적해뒀다 — 이 문서가 다루는 문제(캐시 데이터의 정확도)는 그 지적과
  다른 축이지만 같은 콜백을 다루므로, `onRefine`을 수정할 때는 두 문서를 함께 참고한다.
- [`docs/solutions/ui-bugs/map-camera-animation-race.md`](../ui-bugs/map-camera-animation-race.md) —
  같은 파일·같은 `handleRecenterPress`에서 발생한 또 다른 독립적 버그(네이티브 카메라
  애니메이션 경합, 이 문서의 위치 데이터 정확도 문제와는 무관). `handleRecenterPress`를
  만지는 개발자는 이 세 문서를 함께 참고한다.

---

*참고: 위 코드 변경은 브랜치 `gsd/phase-03-check-in-core-loop`의 커밋
`0d91ec0`(로컬, 이 문서 작성 시점 기준 미푸시 상태, `origin/main`에 아직 반영되지 않음)에
반영되어 있다. 이 브랜치는 로컬에만 존재하며 리베이스 등으로 SHA가 바뀔 수 있으므로, 이
커밋 해시는 "이 문서 작성 시점" 기준 참조로만 취급한다.*
