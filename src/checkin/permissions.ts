// src/checkin/permissions.ts
// Plan 03-05 — 위치 권한 조회/요청/거부 배너 판정, 포그라운드 재확인 훅.
// src/notifications/permissions.ts(Phase 2)와 동일한 계약으로 만들되 위치 SDK로 치환한다.
//
// (1) 권한 요청 책임 경계 확정 — `requestForegroundPermissionsAsync()` 호출은
// Phase 3가 소유한다. Phase 4(REQ-onboarding-empty-state)는 이 위에 온보딩
// 문구/empty state만 얹으며 요청 호출을 다시 만들지 않는다(03-RESEARCH.md
// Open Questions #2 해소 — "Phase 3가 소유한다").
//
// (2) iOS 단순화 — 위치 권한은 "Location Services 전역 꺼짐"과 "앱별 거부"를
// 구분하지 않기로 의도적으로 단순화했다(PROJECT.md Context, product-design.md).
// 따라서 배너 판정은 알림과 동일하게 status === 'denied' 하나만 본다.
//
// priming 세션 플래그(notifications/permissions.ts가 갖고 있는 세션 표시/리셋
// 함수들)는 복제하지 않는다 — 위치 권한에는 별도 priming 화면이 없고, 권한 요청은
// "체크인" 첫 탭 시점의 맥락적 요청이다(REQ-onboarding-empty-state와 일치,
// 03-UI-SPEC.md Scope Boundary).
import { useCallback, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import type { LocationDeps } from './config';
import { defaultLocationDeps } from './deps';
// subscribeToForegroundActive는 재구현하지 않고 notifications/permissions.ts에서
// 재사용한다 — 동일한 AppState 래퍼를 두 벌 만들 이유가 없다(알림 배너와 위치
// 배너 모두 "포그라운드 복귀 시 재확인"이라는 동일한 관심사를 공유한다).
import { subscribeToForegroundActive, type AppStateLike } from '../notifications/permissions';

export type { AppStateLike };
export { subscribeToForegroundActive };

export type PermissionSnapshot = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

// getForegroundPermissionsAsync()가 반환하는 응답에서 크로스플랫폼 표준 3필드만
// 뽑아 새 객체로 반환한다 — 플랫폼 전용 필드를 통과시키지 않는다.
export async function fetchLocationPermission(
  deps: LocationDeps = defaultLocationDeps
): Promise<PermissionSnapshot> {
  const response = await deps.getForegroundPermissionsAsync();
  return {
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
  };
}

// iOS는 undetermined 상태에서만 실제 시스템 프롬프트를 띄운다 — 이미 거부된 뒤
// 재호출해도 프롬프트가 다시 뜨지 않고 현재 상태만 반환한다. 이 가드절이 없으면
// requestForegroundPermissionsAsync를 호출할 이유가 없는데도 반복 호출해 prompt
// fatigue 압박 경로가 생긴다(threat T-3-15).
export async function requestLocationPermission(
  deps: LocationDeps = defaultLocationDeps
): Promise<PermissionSnapshot> {
  const current = await fetchLocationPermission(deps);
  if (current.status !== 'undetermined') {
    return current;
  }
  const response = await deps.requestForegroundPermissionsAsync();
  return {
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
  };
}

// granted === false가 아니라 status === 'denied'로 판정한다 — undetermined도
// granted: false지만 아직 물어보지도 않은 상태라 배너 대상이 아니다. 초기 프레임
// (permission === null)에서도 배너가 깜빡이지 않도록 null을 명시적으로 false 처리한다.
export function shouldShowLocationDeniedBanner(permission: PermissionSnapshot | null): boolean {
  return permission !== null && permission.status === 'denied';
}

// 조립만 하는 얇은 훅 — notifications/permissions.ts의 useNotificationPermissionBanner와
// 동일하게 isMounted 마운트 가드 + .catch(console.error) 규약(프로미스를 조용히
// 삼키지 않는 repo 규약)을 따른다.
export function useLocationPermissionBanner(): {
  showBanner: boolean;
  openSettings: () => void;
} {
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);

  const recheck = useCallback((isMounted: () => boolean) => {
    fetchLocationPermission(defaultLocationDeps)
      .then((snapshot) => {
        if (isMounted()) {
          setPermission(snapshot);
        }
      })
      .catch((error) => {
        if (isMounted()) {
          console.error('Failed to fetch location permission', error);
        }
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const isMountedFn = () => isMounted;
    recheck(isMountedFn);
    const unsubscribe = subscribeToForegroundActive(() => recheck(isMountedFn));
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [recheck]);

  return {
    showBanner: shouldShowLocationDeniedBanner(permission),
    openSettings: () => Linking.openSettings(),
  };
}
