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
import { captureWithTimeout } from './location';
import type { LocationDeps } from './config';
import { LOCATION_ACCURACY_BALANCED } from './config';

const TEST_TIMEOUT_MS = 30;
const TEST_DELAY_MS = 100;

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
