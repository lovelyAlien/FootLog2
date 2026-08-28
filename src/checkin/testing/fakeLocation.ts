// src/checkin/testing/fakeLocation.ts
// 테스트 전용 인메모리 위치 더블 — src/notifications/testing/fakeNotifications.ts와 같은
// 위치 규약(`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입 `LocationDeps`를
// 그대로 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-location'을 전혀 import 하지 않는다 — deps.ts가 그 런타임 import를
// 유일하게 소유한다(config.ts 헤더 규약). 대신 `LocationDeps`(타입 전용, ../config.ts)에서
// `Awaited`/`ReturnType`으로 필요한 SDK 타입을 전부 유도한다.
//
// 실제 네이티브 모듈과 다르게 동작하는 지점(fakeNotifications.ts 규율과 동일하게 명시):
// 1. 이 더블은 iOS 설정 앱의 "위치 서비스" 전역 꺼짐 상태를 재현하지 않는다 — 앱별 권한
//    상태(__setPermission)만 흉내 낸다.
// 2. 이 더블은 실내/실외, GPS 신호 세기에 따른 실제 정확도 변화를 시뮬레이션하지 않는다 —
//    accuracyMeters는 테스트가 __setPosition/__setLastKnown으로 지정한 값이 그대로 반환된다.
// 3. requestForegroundPermissionsAsync는 iOS 실제 시스템 프롬프트 UI 없이 즉시 resolve된다
//    (권한 전이 규칙 자체는 iOS와 동일하게 undetermined일 때만 granted로 바뀐다).
import type { LocationDeps } from '../config';

type PermissionsStatus = Awaited<ReturnType<LocationDeps['getForegroundPermissionsAsync']>>;
type CurrentPosition = Awaited<ReturnType<LocationDeps['getCurrentPositionAsync']>>;
type LastKnownPosition = Awaited<ReturnType<LocationDeps['getLastKnownPositionAsync']>>;
type HeadingCallback = Parameters<LocationDeps['watchHeadingAsync']>[0];
type HeadingSubscription = Awaited<ReturnType<LocationDeps['watchHeadingAsync']>>;

type FakePermissionStatus = 'granted' | 'denied' | 'undetermined';

type FakeCoords = { lat: number; lng: number; accuracyMeters: number | null };

export type FakeLocation = LocationDeps & {
  __setPermission(status: FakePermissionStatus): void;
  __setPosition(position: FakeCoords | null): void;
  __setLastKnown(position: FakeCoords | null): void;
  __setDelayMs(ms: number): void;
  __currentPositionCallCount(): number;
  __requestCallCount(): number;
  __emitHeading(trueHeading: number): void;
  __activeHeadingWatcherCount(): number;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createFakeLocation(): FakeLocation {
  let permissionStatus: FakePermissionStatus = 'undetermined';
  let currentPosition: FakeCoords | null = null;
  let lastKnownPosition: FakeCoords | null = null;
  let delayMs = 0;
  let currentPositionCallCount = 0;
  let requestCallCount = 0;
  const headingWatchers = new Set<HeadingCallback>();

  // PermissionStatus(expo-modules-core)는 nominal string enum이라 리터럴
  // 'granted'/'denied'/'undetermined'가 구조적으로 호환돼 보여도 캐스트 없이는 대입되지
  // 않는다(fakeNotifications.ts buildPermissionsStatus와 동일한 이유) — 이 함수 한 곳에서만
  // 캐스트한다.
  function buildPermissionsStatus(status: FakePermissionStatus): PermissionsStatus {
    return {
      status,
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
      expires: 'never',
    } as unknown as PermissionsStatus;
  }

  // LocationObject/LocationObjectCoords의 나머지 필드(altitude, heading, speed 등)는 이
  // 더블의 테스트 목적과 무관하므로 null/0으로 채운다 — 조회 경계 한 곳에서만 캐스트한다
  // (fakeNotifications.ts와 동일한 "단일 캐스트, export 경계 밖으로 새어 나가지 않음" 규율).
  function buildLocationObject(coords: FakeCoords): CurrentPosition {
    return {
      coords: {
        latitude: coords.lat,
        longitude: coords.lng,
        altitude: null,
        accuracy: coords.accuracyMeters,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as unknown as CurrentPosition;
  }

  const getForegroundPermissionsAsync: LocationDeps['getForegroundPermissionsAsync'] =
    async () => {
      return buildPermissionsStatus(permissionStatus);
    };

  const requestForegroundPermissionsAsync: LocationDeps['requestForegroundPermissionsAsync'] =
    async () => {
      requestCallCount += 1;
      // iOS는 undetermined 상태에서만 실제 프롬프트를 띄운다 — 이미 거부된 뒤에는 재호출해도
      // 상태가 바뀌지 않는다(fakeNotifications.ts와 동일한 규칙).
      if (permissionStatus === 'undetermined') {
        permissionStatus = 'granted';
      }
      return buildPermissionsStatus(permissionStatus);
    };

  const getCurrentPositionAsync: LocationDeps['getCurrentPositionAsync'] = async () => {
    currentPositionCallCount += 1;
    if (delayMs > 0) {
      await delay(delayMs);
    }
    if (currentPosition === null) {
      // 실제 SDK는 위치를 얻지 못하면 reject한다 — 이 더블도 동일하게 흉내 낸다.
      throw new Error('fake-location: no position set (call __setPosition first)');
    }
    return buildLocationObject(currentPosition);
  };

  const getLastKnownPositionAsync: LocationDeps['getLastKnownPositionAsync'] = async () => {
    if (lastKnownPosition === null) {
      return null as unknown as LastKnownPosition;
    }
    return buildLocationObject(lastKnownPosition) as unknown as LastKnownPosition;
  };

  // 실제 SDK와 다르게 동작하는 지점(파일 상단 규율 4번째 항목): 나침반 이벤트를 실제
  // 자력계로 생성하지 않는다 — 테스트가 __emitHeading으로 원하는 각도를 직접 밀어 넣는다.
  const watchHeadingAsync: LocationDeps['watchHeadingAsync'] = async (callback) => {
    headingWatchers.add(callback);
    const subscription: HeadingSubscription = {
      remove() {
        headingWatchers.delete(callback);
      },
    };
    return subscription;
  };

  return {
    getForegroundPermissionsAsync,
    requestForegroundPermissionsAsync,
    getCurrentPositionAsync,
    getLastKnownPositionAsync,
    watchHeadingAsync,
    __setPermission(status) {
      permissionStatus = status;
    },
    __setPosition(position) {
      currentPosition = position;
    },
    __setLastKnown(position) {
      lastKnownPosition = position;
    },
    __setDelayMs(ms) {
      delayMs = ms;
    },
    __currentPositionCallCount() {
      return currentPositionCallCount;
    },
    __requestCallCount() {
      return requestCallCount;
    },
    __emitHeading(trueHeading) {
      headingWatchers.forEach((callback) => {
        callback({ trueHeading, magHeading: trueHeading, accuracy: 3 });
      });
    },
    __activeHeadingWatcherCount() {
      return headingWatchers.size;
    },
  };
}
