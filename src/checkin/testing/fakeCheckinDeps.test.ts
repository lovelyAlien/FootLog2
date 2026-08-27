/**
 * @jest-environment node
 */
// src/checkin/testing/fakeCheckinDeps.test.ts
// 03-01-PLAN.md Task 3 계약 테스트 — 체크인 테스트 더블 3종(fakeLocation/fakeImagePicker/
// fakePhotoStorage)의 behavior를 검증한다. src/notifications/testing/fakeNotifications.test.ts와
// 동일 패턴: 이 파일은 네이티브 패키지를 전혀 import하지 않는다 — 더블이 config.ts(타입
// 전용)에서 유도한 타입만 만족하면 되기 때문이다.
import { createFakeLocation } from './fakeLocation';
import { createFakeImagePicker } from './fakeImagePicker';
import { createFakePhotoStorage } from './fakePhotoStorage';
import type { LocationDeps, ImagePickerDeps, PhotoStorageDeps } from '../config';

describe('createFakeLocation', () => {
  it('Test 1: 반환된 객체를 LocationDeps에 대입해도 타입 에러가 없다 (컴파일타임 계약)', () => {
    const deps: LocationDeps = createFakeLocation();
    expect(deps).toBeDefined();
  });

  it("Test 2: __setPermission('denied') 후 getForegroundPermissionsAsync()가 status: 'denied', granted: false를 반환한다", async () => {
    const fake = createFakeLocation();
    fake.__setPermission('denied');

    const status = await fake.getForegroundPermissionsAsync();

    expect(status.status).toBe('denied');
    expect(status.granted).toBe(false);
  });

  it('Test 3: __setDelayMs(6000) 후 getCurrentPositionAsync()는 6초가 지나기 전에는 resolve되지 않고 6초가 지나면 resolve된다', async () => {
    jest.useFakeTimers();
    try {
      const fake = createFakeLocation();
      fake.__setDelayMs(6000);
      fake.__setPosition({ lat: 37.5, lng: 127.0, accuracyMeters: 10 });

      let resolved = false;
      fake.getCurrentPositionAsync().then(() => {
        resolved = true;
      });

      await jest.advanceTimersByTimeAsync(5999);
      expect(resolved).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(resolved).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('Test 4: __setLastKnown(null) 후 getLastKnownPositionAsync()가 null을 반환한다', async () => {
    const fake = createFakeLocation();
    fake.__setLastKnown(null);

    const result = await fake.getLastKnownPositionAsync();

    expect(result).toBeNull();
  });
});

describe('createFakeImagePicker', () => {
  it('Test 5: 반환된 객체를 ImagePickerDeps에 대입해도 타입 에러가 없다 (컴파일타임 계약)', () => {
    const deps: ImagePickerDeps = createFakeImagePicker();
    expect(deps).toBeDefined();
  });

  it("Test 6: __setNextResult({ canceled: true }) 후 launchCameraAsync()가 canceled: true를 반환한다", async () => {
    const fake = createFakeImagePicker();
    fake.__setNextResult({ canceled: true, assets: null });

    const result = await fake.launchCameraAsync();

    expect(result.canceled).toBe(true);
  });
});

describe('createFakePhotoStorage', () => {
  it('Test 7: 반환된 객체를 PhotoStorageDeps에 대입해도 타입 에러가 없다 (컴파일타임 계약)', () => {
    const deps: PhotoStorageDeps = createFakePhotoStorage();
    expect(deps).toBeDefined();
  });

  it("Test 8: copyIntoDocumentDirectory('file:///tmp/a.jpg', 'camera-x.jpg')가 document 접두사가 붙은 목적지 uri를 반환하고 __copies()에 (source, fileName) 쌍이 기록된다", async () => {
    const fake = createFakePhotoStorage();

    const resultUri = await fake.copyIntoDocumentDirectory('file:///tmp/a.jpg', 'camera-x.jpg');

    expect(resultUri).toMatch(/document/);
    expect(resultUri).toMatch(/camera-x\.jpg$/);
    expect(fake.__copies()).toEqual([{ source: 'file:///tmp/a.jpg', fileName: 'camera-x.jpg' }]);
  });
});
