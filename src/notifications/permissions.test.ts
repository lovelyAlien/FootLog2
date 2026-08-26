/**
 * @jest-environment node
 */
// src/notifications/permissions.test.ts
// Plan 02-04 Task 1 (RED) — 권한 판정/재확인/priming 세션 로직 계약 테스트.
//
// `AppStateLike` 페이크는 이 파일 안에 인라인으로 정의한다. 실제 `react-native`의
// `AppState`를 여기서 import하지 않는다 — `@jest-environment node`에서 RN 코어를
// 로드하면(네이티브 바인딩 의존) 테스트 환경 자체가 깨진다.
//
// `jest.mock()`을 쓰지 않는다 — 모든 의존성이 파라미터 주입(NotificationDeps,
// AppStateLike)이다.
//
// `useNotificationPermissionBanner` 훅 자체는 이 파일에서 테스트하지 않는다 — React
// 렌더러가 필요해 `node` 환경과 충돌한다. 훅은 여기서 검증하는 함수들을 조립만 하는
// 얇은 껍데기로 유지하며, 그 배선 검증은 Plan 07의 정적 회귀 테스트와 Plan 08의 실기기
// 검증이 담당한다.
import { createFakeNotifications } from './testing/fakeNotifications';
import {
  fetchNotificationPermission,
  markPrimingDismissed,
  requestNotificationPermission,
  resetPrimingSession,
  shouldShowDeniedBanner,
  shouldShowPriming,
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

describe('permissions', () => {
  // priming 세션 플래그가 모듈 레벨 상태이므로, 테스트 간 격리를 위해 매 테스트 전에
  // 반드시 초기화한다 — 그렇지 않으면 이전 테스트의 markPrimingDismissed() 호출이
  // 다음 테스트에 새어 들어간다.
  beforeEach(() => {
    resetPrimingSession();
  });

  describe('bannerVisibility', () => {
    it('Test 1: [bannerVisibility] shouldShowDeniedBanner({status:\'denied\',...})가 true', () => {
      expect(
        shouldShowDeniedBanner({ status: 'denied', granted: false, canAskAgain: false })
      ).toBe(true);
    });

    it('Test 2: [bannerVisibility] shouldShowDeniedBanner({status:\'granted\',...})가 false', () => {
      expect(
        shouldShowDeniedBanner({ status: 'granted', granted: true, canAskAgain: false })
      ).toBe(false);
    });

    it('Test 3: [bannerVisibility] shouldShowDeniedBanner({status:\'undetermined\',...})가 false — 아직 물어보지도 않은 상태는 배너 대상이 아니다', () => {
      expect(
        shouldShowDeniedBanner({ status: 'undetermined', granted: false, canAskAgain: true })
      ).toBe(false);
    });

    it('Test 4: [bannerVisibility] shouldShowDeniedBanner(null)이 false — 초기 프레임에 배너가 깜빡이지 않는다', () => {
      expect(shouldShowDeniedBanner(null)).toBe(false);
    });
  });

  describe('fetch', () => {
    it('Test 5: [fetch] __setPermission(\'denied\') 상태에서 fetchNotificationPermission(fake)이 표준 3필드를 반환한다', async () => {
      const fake = createFakeNotifications();
      fake.__setPermission('denied');

      const result = await fetchNotificationPermission(fake);

      expect(result).toEqual({ status: 'denied', granted: false, canAskAgain: false });
    });

    it('Test 6: [fetch] 반환 객체가 ios 키를 포함하지 않는다 — 표준 필드만 사용한다', async () => {
      const fake = createFakeNotifications();
      fake.__setPermission('denied');

      const result = await fetchNotificationPermission(fake);

      expect('ios' in result).toBe(false);
    });
  });

  describe('request', () => {
    // fakeNotifications.ts(Plan 01 산출물)에는 requestPermissionsAsync 전용 호출
    // 카운터가 없다 — migrations.test.ts Test 6과 동일한 패턴(jest.fn으로 감싼 스파이를
    // 얕은 복사 deps 객체에 주입)으로 호출 횟수를 관찰한다. fakeNotifications.ts 자체는
    // 이 plan의 files_modified 범위 밖이라 수정하지 않는다.
    it('Test 7: [request] __setPermission(\'undetermined\') 상태에서 requestNotificationPermission(fake)이 requestPermissionsAsync를 1회 호출하고 granted:true를 반환한다', async () => {
      const fake = createFakeNotifications();
      fake.__setPermission('undetermined');
      const requestSpy = jest.fn(fake.requestPermissionsAsync);
      const spiedDeps = { ...fake, requestPermissionsAsync: requestSpy };

      const result = await requestNotificationPermission(spiedDeps);

      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(result.granted).toBe(true);
    });

    it('Test 8: [request] __setPermission(\'denied\') 상태에서 requestNotificationPermission(fake)이 requestPermissionsAsync를 0회 호출하고 현재 상태를 그대로 반환한다', async () => {
      const fake = createFakeNotifications();
      fake.__setPermission('denied');
      const requestSpy = jest.fn(fake.requestPermissionsAsync);
      const spiedDeps = { ...fake, requestPermissionsAsync: requestSpy };

      const result = await requestNotificationPermission(spiedDeps);

      expect(requestSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'denied', granted: false, canAskAgain: false });
    });

    it('Test 9: [request] __setPermission(\'granted\') 상태에서도 requestPermissionsAsync가 0회 호출된다', async () => {
      const fake = createFakeNotifications();
      fake.__setPermission('granted');
      const requestSpy = jest.fn(fake.requestPermissionsAsync);
      const spiedDeps = { ...fake, requestPermissionsAsync: requestSpy };

      await requestNotificationPermission(spiedDeps);

      expect(requestSpy).not.toHaveBeenCalled();
    });
  });

  describe('appStateRecheck', () => {
    it('Test 10: [appStateRecheck] subscribeToForegroundActive(handler, fakeAppState) 후 \'active\' 방출 시 handler가 1회 호출된다', () => {
      const fakeAppState = createFakeAppState();
      const handler = jest.fn();
      subscribeToForegroundActive(handler, fakeAppState);

      fakeAppState.emit('active');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('Test 11: [appStateRecheck] \'background\'/\'inactive\' 방출로는 handler가 호출되지 않는다', () => {
      const fakeAppState = createFakeAppState();
      const handler = jest.fn();
      subscribeToForegroundActive(handler, fakeAppState);

      fakeAppState.emit('background');
      fakeAppState.emit('inactive');

      expect(handler).not.toHaveBeenCalled();
    });

    it('Test 12: [appStateRecheck] 반환된 unsubscribe 호출 뒤 active를 방출하면 handler가 더 이상 호출되지 않는다 (리스너 누수 방지)', () => {
      const fakeAppState = createFakeAppState();
      const handler = jest.fn();
      const unsubscribe = subscribeToForegroundActive(handler, fakeAppState);

      unsubscribe();
      fakeAppState.emit('active');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('primingSession', () => {
    it('Test 13: [primingSession] resetPrimingSession() 직후 shouldShowPriming({status:\'undetermined\',...})가 true', () => {
      resetPrimingSession();

      expect(
        shouldShowPriming({ status: 'undetermined', granted: false, canAskAgain: true })
      ).toBe(true);
    });

    it('Test 14: [primingSession] markPrimingDismissed() 후 같은 인자로 shouldShowPriming이 false — 무한 리다이렉트 루프를 막는다', () => {
      markPrimingDismissed();

      expect(
        shouldShowPriming({ status: 'undetermined', granted: false, canAskAgain: true })
      ).toBe(false);
    });

    it('Test 15: [primingSession] shouldShowPriming({status:\'denied\',...})와 shouldShowPriming({status:\'granted\',...})가 항상 false — priming은 undetermined일 때만 의미가 있다', () => {
      expect(
        shouldShowPriming({ status: 'denied', granted: false, canAskAgain: false })
      ).toBe(false);
      expect(
        shouldShowPriming({ status: 'granted', granted: true, canAskAgain: false })
      ).toBe(false);
    });

    it('Test 16: [primingSession] shouldShowPriming(null)이 false', () => {
      expect(shouldShowPriming(null)).toBe(false);
    });
  });
});
