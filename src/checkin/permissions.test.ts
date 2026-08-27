/**
 * @jest-environment node
 */
// src/checkin/permissions.test.ts
// Plan 03-05 Task 1 (RED) — 위치 권한 판정/요청/배너 판정/포그라운드 재확인 계약 테스트.
//
// `AppStateLike` 페이크는 src/notifications/permissions.test.ts와 동일하게 이 파일
// 안에 인라인으로 정의한다. 실제 `react-native`의 `AppState`를 여기서 import하지
// 않는다 — `@jest-environment node`에서 RN 코어를 로드하면 테스트 환경이 깨진다.
//
// `jest.mock()`을 쓰지 않는다 — 모든 의존성이 파라미터 주입(LocationDeps, AppStateLike)이다.
import { createFakeLocation } from './testing/fakeLocation';
import {
  fetchLocationPermission,
  requestLocationPermission,
  shouldShowLocationDeniedBanner,
  subscribeToForegroundActive,
  type AppStateLike,
} from './permissions';

// 최소 AppStateLike 페이크: addEventListener('change', h)가 핸들러를 배열에 담고
// { remove() }를 반환하며, emit(state)로 등록된 핸들러 전체를 호출한다.
function createFakeAppState(): AppStateLike & { emit(state: string): void } {
  const handlers: Array<(state: string) => void> = [];
  return {
    addEventListener(type, handler) {
      handlers.push(handler);
      return {
        remove() {
          const idx = handlers.indexOf(handler);
          if (idx !== -1) {
            handlers.splice(idx, 1);
          }
        },
      };
    },
    emit(state) {
      for (const handler of [...handlers]) {
        handler(state);
      }
    },
  };
}

describe('checkin/permissions', () => {
  describe('fetch', () => {
    it('Test 1: [fetch] fetchLocationPermission(fake)이 SDK 응답에서 status/granted/canAskAgain 3필드만 뽑은 새 객체를 반환한다', async () => {
      const fake = createFakeLocation();
      fake.__setPermission('denied');

      const result = await fetchLocationPermission(fake);

      expect(result).toEqual({ status: 'denied', granted: false, canAskAgain: false });
      expect(Object.keys(result).sort()).toEqual(['canAskAgain', 'granted', 'status']);
    });
  });

  describe('request', () => {
    it("Test 2: [request] __setPermission('undetermined') 상태에서 requestLocationPermission(fake)를 호출하면 requestForegroundPermissionsAsync가 정확히 1회 호출된다", async () => {
      const fake = createFakeLocation();
      fake.__setPermission('undetermined');

      await requestLocationPermission(fake);

      expect(fake.__requestCallCount()).toBe(1);
    });

    it("Test 3: [request] __setPermission('denied') 상태에서 requestLocationPermission(fake)를 호출하면 requestForegroundPermissionsAsync가 0회 호출되고 현재 스냅샷이 그대로 반환된다", async () => {
      const fake = createFakeLocation();
      fake.__setPermission('denied');

      const result = await requestLocationPermission(fake);

      expect(fake.__requestCallCount()).toBe(0);
      expect(result).toEqual({ status: 'denied', granted: false, canAskAgain: false });
    });
  });

  describe('bannerVisibility', () => {
    it('Test 4: [bannerVisibility] shouldShowLocationDeniedBanner(null)이 false를 반환한다 (초기 프레임 깜빡임 방지)', () => {
      expect(shouldShowLocationDeniedBanner(null)).toBe(false);
    });

    it("Test 5: [bannerVisibility] shouldShowLocationDeniedBanner({status:'undetermined',...})이 false, {status:'denied',...}이 true를 반환한다", () => {
      expect(
        shouldShowLocationDeniedBanner({ status: 'undetermined', granted: false, canAskAgain: true })
      ).toBe(false);
      expect(
        shouldShowLocationDeniedBanner({ status: 'denied', granted: false, canAskAgain: false })
      ).toBe(true);
    });
  });

  describe('appStateRecheck', () => {
    it("Test 6: [appStateRecheck] subscribeToForegroundActive(handler, fakeAppState) 후 fakeAppState가 'active'를 emit하면 handler가 호출되고, 'background'에서는 호출되지 않으며, 반환된 unsubscribe 호출 후에는 더 이상 호출되지 않는다", () => {
      const fakeAppState = createFakeAppState();
      const handler = jest.fn();
      const unsubscribe = subscribeToForegroundActive(handler, fakeAppState);

      fakeAppState.emit('active');
      expect(handler).toHaveBeenCalledTimes(1);

      fakeAppState.emit('background');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      fakeAppState.emit('active');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
