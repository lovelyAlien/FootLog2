// src/notifications/permissions.ts
// Plan 02-04 — 알림 권한 상태 판정/요청, 거부 배너 판정, 포그라운드 재확인 구독,
// priming 세션 플래그, 그리고 이 조각들을 조립만 하는 얇은 훅.
//
// priming 세션 플래그(아래 primingDismissedThisSession)는 의도적으로 영속화하지
// 않는다 — 02-RESEARCH.md Architectural Responsibility Map이 "Phase 2는 하드코딩
// 상수, 영속화는 Phase 6/7"으로 못박았고 02-CONTEXT.md D-01이 설정 영속화를 Phase 6로
// 연기했다. 플래그의 1차 목적은 UX 선호가 아니라 정확성이다: 이게 없으면 "나중에"
// 탭 후 index → priming 리다이렉트가 무한 루프를 돈다. 앱을 완전히 종료했다 다시
// 켜면 권한이 여전히 undetermined인 한 priming이 다시 노출되며, 이 동작을 영속
// 플래그로 바꿀지는 Phase 4(REQ-onboarding-empty-state)에서 재검토한다.
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { NotificationDeps } from './config';
import { defaultNotificationDeps } from './deps';

export type PermissionSnapshot = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

// react-native의 AppState 전체 타입을 쓰지 않는다 — 필요한 메서드만 구조적으로
// 선언해 테스트(@jest-environment node)가 react-native를 타입으로라도 끌어오지
// 않게 한다. subscribeToForegroundActive 기본 인자에서만 실제 AppState를 import한다.
export type AppStateLike = {
  addEventListener(type: 'change', handler: (state: string) => void): { remove(): void };
};

// getPermissionsAsync()가 반환하는 PermissionResponse에서 크로스플랫폼 표준 3필드만
// 뽑아 새 객체로 반환한다 — ios 등 플랫폼 전용 필드를 통과시키지 않는다.
// 02-RESEARCH.md Anti-Patterns: ios.status(IosAuthorizationStatus enum) 기준 분기를
// 하지 않는다. PROVISIONAL/EPHEMERAL 등은 이 앱이 요청하지 않는 옵션이라 등장하지
// 않으므로 표준 필드만으로 충분하다.
export async function fetchNotificationPermission(
  deps: NotificationDeps = defaultNotificationDeps
): Promise<PermissionSnapshot> {
  const response = await deps.getPermissionsAsync();
  return {
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
  };
}

// iOS는 undetermined 상태에서만 실제 시스템 프롬프트를 띄운다 — 이미 거부된 뒤
// 재호출해도 프롬프트가 다시 뜨지 않고 현재 상태만 반환한다(재요청 불가, priming
// 화면이 먼저 필요한 이유). 이 가드절(early-return, migrations.ts와 동일한 형태)이
// 없으면 requestPermissionsAsync를 호출할 이유가 없는데도 반복 호출해 prompt fatigue
// 압박 경로가 생긴다(threat T-02-10).
export async function requestNotificationPermission(
  deps: NotificationDeps = defaultNotificationDeps
): Promise<PermissionSnapshot> {
  const current = await fetchNotificationPermission(deps);
  if (current.status !== 'undetermined') {
    return current;
  }
  const response = await deps.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return {
    status: response.status,
    granted: response.granted,
    canAskAgain: response.canAskAgain,
  };
}

// granted === false가 아니라 status === 'denied'로 판정한다 — undetermined도
// granted: false지만 아직 물어보지도 않은 상태라 배너 대상이 아니다(priming 화면이
// 담당). 초기 프레임(permission === null)에서도 배너가 깜빡이지 않도록 null을
// 명시적으로 false 처리한다.
export function shouldShowDeniedBanner(permission: PermissionSnapshot | null): boolean {
  return permission !== null && permission.status === 'denied';
}

// 모듈 레벨 세션 플래그 — 위 헤더 주석 참고(의도적으로 영속화하지 않음).
let primingDismissedThisSession = false;

export function markPrimingDismissed(): void {
  primingDismissedThisSession = true;
}

// 테스트 전용 리셋 — 모듈 레벨 상태이므로 테스트 간 격리를 위해 반드시 호출한다.
export function resetPrimingSession(): void {
  primingDismissedThisSession = false;
}

// priming은 undetermined일 때만 의미가 있다 — denied는 배너/설정 딥링크로,
// granted는 아무 UI도 필요 없다.
export function shouldShowPriming(permission: PermissionSnapshot | null): boolean {
  return (
    permission !== null &&
    permission.status === 'undetermined' &&
    !primingDismissedThisSession
  );
}

// react-native의 AppState는 이 파일에서만(기본 인자로) import한다.
export function subscribeToForegroundActive(
  handler: () => void,
  appState: AppStateLike = AppState
): () => void {
  const sub = appState.addEventListener('change', (state) => {
    if (state === 'active') {
      handler();
    }
  });
  return () => sub.remove();
}

// 조립만 하는 얇은 훅 — src/app/index.tsx와 동일한 isMounted 마운트 가드 +
// .catch(console.error) 규약(프로미스를 조용히 삼키지 않는 repo 규약)을 따른다.
export function useNotificationPermissionBanner(): {
  showBanner: boolean;
  openSettings: () => void;
} {
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);

  const recheck = useCallback((isMounted: () => boolean) => {
    fetchNotificationPermission(defaultNotificationDeps)
      .then((snapshot) => {
        if (isMounted()) {
          setPermission(snapshot);
        }
      })
      .catch((error) => {
        if (isMounted()) {
          console.error('Failed to fetch notification permission', error);
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
    showBanner: shouldShowDeniedBanner(permission),
    openSettings: () => Linking.openSettings(),
  };
}
