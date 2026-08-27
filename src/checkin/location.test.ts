/**
 * @jest-environment node
 */
// src/checkin/location.test.ts
// 03-07-PLAN.md Task 1 — captureWithTimeout: 5초 Promise.race + OS 캐시 폴백.
//
// 결정적 테스트를 위해 captureWithTimeout(deps, timeoutMs)의 두 번째 선택 인자로
// 실제 CAPTURE_TIMEOUT_MS(5000ms)보다 훨씬 짧은 타임아웃을 주입한다 — jest fake timer +
// Promise 조합보다 단순하고, 개별 파일 실행 시간을 5초 미만으로 유지할 수 있다
// (03-07-PLAN.md Task 1 action 문단이 명시적으로 권장한 방식).
import { createFakeLocation } from './testing/fakeLocation';
import {
  captureWithTimeout,
  resolveCheckinLocation,
  resolveFallbackChain,
  applyDraggedSource,
  LOCATION_SOURCE_MAPPING_NOTE,
  type ResolvedLocation,
  type FallbackSources,
} from './location';
import type { LocationDeps } from './config';
import { LOCATION_ACCURACY_BALANCED } from './config';
import { FALLBACK_COORDINATE } from './fallbackLocation';
import { requestLocationPermission, type PermissionSnapshot } from './permissions';

const TEST_TIMEOUT_MS = 30;
const TEST_DELAY_MS = 100;

const GRANTED: PermissionSnapshot = { status: 'granted', granted: true, canAskAgain: true };
const DENIED: PermissionSnapshot = { status: 'denied', granted: false, canAskAgain: false };

const EMPTY_SOURCES: FallbackSources = {
  latestCheckinCoordinate: null,
  lastMapCoordinate: null,
};

describe('captureWithTimeout', () => {
  it('fake가 즉시 좌표를 반환하면 kind: auto를 반환한다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

    const result = await captureWithTimeout(fake, TEST_TIMEOUT_MS);

    expect(result).toEqual({ kind: 'auto', lat: 37.5, lng: 127.0, accuracyMeters: 10 });
  });

  it('타임아웃 시점에 OS 캐시가 있으면 kind: timeout_os_cache를 반환한다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });
    fake.__setDelayMs(TEST_DELAY_MS);
    fake.__setLastKnown({ lat: 37.6, lng: 127.1, accuracyMeters: 50 });

    const result = await captureWithTimeout(fake, TEST_TIMEOUT_MS);

    expect(result).toEqual({
      kind: 'timeout_os_cache',
      lat: 37.6,
      lng: 127.1,
      accuracyMeters: 50,
    });
  });

  it('타임아웃 시점에 OS 캐시도 없으면 kind: need_fallback_chain을 반환한다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });
    fake.__setDelayMs(TEST_DELAY_MS);
    fake.__setLastKnown(null);

    const result = await captureWithTimeout(fake, TEST_TIMEOUT_MS);

    expect(result).toEqual({ kind: 'need_fallback_chain' });
  });

  it('getCurrentPositionAsync가 reject해도 throw하지 않고 OS 캐시 경로로 넘어간다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    // __setPosition을 호출하지 않으면 fake의 getCurrentPositionAsync가 즉시 reject한다.
    fake.__setLastKnown({ lat: 37.6, lng: 127.1, accuracyMeters: 50 });

    const result = await captureWithTimeout(fake, TEST_TIMEOUT_MS);

    expect(result).toEqual({
      kind: 'timeout_os_cache',
      lat: 37.6,
      lng: 127.1,
      accuracyMeters: 50,
    });
  });

  it('타임아웃 이후 늦게 resolve되는 원본 프로미스가 unhandled rejection을 만들지 않는다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    // __setPosition을 호출하지 않아 늦게(딜레이 이후) reject되도록 만든다.
    fake.__setDelayMs(TEST_DELAY_MS);
    fake.__setLastKnown(null);

    let unhandledCount = 0;
    const onUnhandledRejection = () => {
      unhandledCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const result = await captureWithTimeout(fake, TEST_TIMEOUT_MS);
      expect(result).toEqual({ kind: 'need_fallback_chain' });
      // 원본 getCurrentPositionAsync가 딜레이 이후 reject를 마칠 시간을 준다.
      await new Promise((resolve) => setTimeout(resolve, TEST_DELAY_MS + 20));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }

    expect(unhandledCount).toBe(0);
  });

  it('getCurrentPositionAsync 호출 시 accuracy 옵션만 전달되고 timeout 프로퍼티는 전달되지 않는다', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('granted');
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

    const calls: unknown[] = [];
    const spyDeps: LocationDeps = {
      ...fake,
      getCurrentPositionAsync: ((...args: unknown[]) => {
        calls.push(args[0]);
        return fake.getCurrentPositionAsync(
          ...(args as Parameters<LocationDeps['getCurrentPositionAsync']>)
        );
      }) as LocationDeps['getCurrentPositionAsync'],
    };

    await captureWithTimeout(spyDeps, TEST_TIMEOUT_MS);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ accuracy: LOCATION_ACCURACY_BALANCED });
    expect(calls[0]).not.toHaveProperty('timeout');
  });
});

describe('resolveFallbackChain', () => {
  it('최근 체크인 좌표가 있으면 그 좌표를 최우선으로 쓴다', () => {
    const sources: FallbackSources = {
      latestCheckinCoordinate: { lat: 37.1, lng: 127.2 },
      lastMapCoordinate: { lat: 37.9, lng: 127.9 },
    };

    expect(resolveFallbackChain(sources)).toEqual({ lat: 37.1, lng: 127.2 });
  });

  it('최근 체크인 좌표가 유효하지 않으면(범위 밖) 지도 마지막 좌표로 넘어간다', () => {
    const sources: FallbackSources = {
      latestCheckinCoordinate: { lat: 999, lng: 127.2 },
      lastMapCoordinate: { lat: 37.9, lng: 127.9 },
    };

    expect(resolveFallbackChain(sources)).toEqual({ lat: 37.9, lng: 127.9 });
  });

  it('둘 다 없으면 FALLBACK_COORDINATE를 쓴다', () => {
    expect(resolveFallbackChain(EMPTY_SOURCES)).toEqual({
      lat: FALLBACK_COORDINATE.lat,
      lng: FALLBACK_COORDINATE.lng,
    });
  });
});

describe('resolveCheckinLocation', () => {
  it('권한 granted + GPS 즉시 성공 → locationSource: gps_auto', async () => {
    const fake = createFakeLocation();
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

    const result = await resolveCheckinLocation({
      permission: GRANTED,
      deps: fake,
      fallbackSources: EMPTY_SOURCES,
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result).toEqual({
      lat: 37.5,
      lng: 127.0,
      accuracyMeters: 10,
      locationSource: 'gps_auto',
    });
  });

  it('권한 granted + 타임아웃 + OS 캐시 있음 → locationSource: gps_low_accuracy_fallback', async () => {
    const fake = createFakeLocation();
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });
    fake.__setDelayMs(TEST_DELAY_MS);
    fake.__setLastKnown({ lat: 37.6, lng: 127.1, accuracyMeters: 50 });

    const result = await resolveCheckinLocation({
      permission: GRANTED,
      deps: fake,
      fallbackSources: EMPTY_SOURCES,
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result).toEqual({
      lat: 37.6,
      lng: 127.1,
      accuracyMeters: 50,
      locationSource: 'gps_low_accuracy_fallback',
    });
  });

  it('권한 granted + 타임아웃 + OS 캐시 없음 + 최근 체크인 있음 → manual_no_signal, 최근 체크인 좌표 사용', async () => {
    const fake = createFakeLocation();
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });
    fake.__setDelayMs(TEST_DELAY_MS);
    fake.__setLastKnown(null);

    const result = await resolveCheckinLocation({
      permission: GRANTED,
      deps: fake,
      fallbackSources: { latestCheckinCoordinate: { lat: 37.3, lng: 127.3 }, lastMapCoordinate: null },
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result).toEqual({
      lat: 37.3,
      lng: 127.3,
      accuracyMeters: null,
      locationSource: 'manual_no_signal',
    });
  });

  it('권한 denied → locationSource: manual_denied, getCurrentPositionAsync/getLastKnownPositionAsync 호출 0회', async () => {
    const fake = createFakeLocation();
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

    const result = await resolveCheckinLocation({
      permission: DENIED,
      deps: fake,
      fallbackSources: EMPTY_SOURCES,
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result.locationSource).toBe('manual_denied');
    expect(result).toEqual({
      lat: FALLBACK_COORDINATE.lat,
      lng: FALLBACK_COORDINATE.lng,
      accuracyMeters: null,
      locationSource: 'manual_denied',
    });
    expect(fake.__currentPositionCallCount()).toBe(0);
  });

  it('권한 denied + 최근 체크인 없음 + 지도 마지막 좌표 있음 → 지도 마지막 좌표를 쓴다', async () => {
    const fake = createFakeLocation();

    const result = await resolveCheckinLocation({
      permission: DENIED,
      deps: fake,
      fallbackSources: { latestCheckinCoordinate: null, lastMapCoordinate: { lat: 37.7, lng: 127.7 } },
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result).toEqual({
      lat: 37.7,
      lng: 127.7,
      accuracyMeters: null,
      locationSource: 'manual_denied',
    });
  });

  it('권한 denied + 최근 체크인 없음 + 지도 마지막 좌표 없음 → FALLBACK_COORDINATE를 쓴다', async () => {
    const fake = createFakeLocation();

    const result = await resolveCheckinLocation({
      permission: DENIED,
      deps: fake,
      fallbackSources: EMPTY_SOURCES,
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result).toEqual({
      lat: FALLBACK_COORDINATE.lat,
      lng: FALLBACK_COORDINATE.lng,
      accuracyMeters: null,
      locationSource: 'manual_denied',
    });
  });

  it('권한 undetermined → requestLocationPermission 호출 후 승인되면 GPS 경로로 간다(화면 계약 통합 검증)', async () => {
    const fake = createFakeLocation();
    fake.__setPermission('undetermined');
    fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

    const requested = await requestLocationPermission(fake);
    expect(requested.granted).toBe(true);
    expect(fake.__requestCallCount()).toBe(1);

    const result = await resolveCheckinLocation({
      permission: requested,
      deps: fake,
      fallbackSources: EMPTY_SOURCES,
      timeoutMs: TEST_TIMEOUT_MS,
    });

    expect(result.locationSource).toBe('gps_auto');
  });

  it('applyDraggedSource는 원 소스와 무관하게 locationSource를 gps_dragged로 바꾸고 accuracyMeters를 null로 초기화한다', () => {
    const current: ResolvedLocation = {
      lat: 37.5,
      lng: 127.0,
      accuracyMeters: 10,
      locationSource: 'gps_auto',
    };

    const dragged = applyDraggedSource(current, { lat: 37.9, lng: 127.9 });

    expect(dragged).toEqual({
      lat: 37.9,
      lng: 127.9,
      accuracyMeters: null,
      locationSource: 'gps_dragged',
    });
  });

  it('applyDraggedSource는 manual_denied 소스에도 동일하게 적용된다', () => {
    const current: ResolvedLocation = {
      lat: FALLBACK_COORDINATE.lat,
      lng: FALLBACK_COORDINATE.lng,
      accuracyMeters: null,
      locationSource: 'manual_denied',
    };

    const dragged = applyDraggedSource(current, { lat: 1, lng: 2 });

    expect(dragged.locationSource).toBe('gps_dragged');
    expect(dragged).toEqual({ lat: 1, lng: 2, accuracyMeters: null, locationSource: 'gps_dragged' });
  });
});

describe('LOCATION_SOURCE_MAPPING_NOTE', () => {
  it('확정 매핑 표를 문자열 상수로 노출한다', () => {
    expect(typeof LOCATION_SOURCE_MAPPING_NOTE).toBe('string');
    expect(LOCATION_SOURCE_MAPPING_NOTE.length).toBeGreaterThan(0);
  });
});
