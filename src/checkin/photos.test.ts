/**
 * @jest-environment node
 */
// src/checkin/photos.test.ts
// 03-06-PLAN.md Task 1/2 — 사진 첨부 액션시트 옵션/파일명 규약/권한 요청 +
// pickAndCopyPhoto(선택 + documentDirectory 복사 + 출처 보존) behavior 검증.
// src/checkin/fallbackLocation.test.ts와 동일 패턴: 이 파일은 네이티브 패키지를
// 전혀 import하지 않는다 — deps.ts가 만든 더블(../testing/fakeImagePicker.ts,
// fakePhotoStorage.ts)만 사용한다.
import {
  PHOTO_ACTION_SHEET_OPTIONS,
  PHOTO_ACTION_SHEET_CANCEL_INDEX,
  PHOTO_SOURCE_BY_ACTION_SHEET_INDEX,
  buildPhotoFileName,
  ensurePhotoPermission,
  pickAndCopyPhoto,
} from './photos';
import { createFakeImagePicker } from './testing/fakeImagePicker';
import { createFakePhotoStorage } from './testing/fakePhotoStorage';
import { createFakeImageResizer } from './testing/fakeImageResizer';
import { MAX_PHOTO_DIMENSION_PX } from './config';

describe('PHOTO_ACTION_SHEET_OPTIONS / PHOTO_ACTION_SHEET_CANCEL_INDEX (03-UI-SPEC.md §Copywriting Contract)', () => {
  it('옵션이 정확히 [사진 촬영, 앨범에서 선택, 취소] 순서다', () => {
    expect(PHOTO_ACTION_SHEET_OPTIONS).toEqual(['사진 촬영', '앨범에서 선택', '취소']);
  });

  it('취소 인덱스가 2다', () => {
    expect(PHOTO_ACTION_SHEET_CANCEL_INDEX).toBe(2);
  });

  it('PHOTO_SOURCE_BY_ACTION_SHEET_INDEX가 인덱스 0→camera, 1→library, 2→null로 매핑된다', () => {
    expect(PHOTO_SOURCE_BY_ACTION_SHEET_INDEX).toEqual(['camera', 'library', null]);
  });
});

describe('buildPhotoFileName', () => {
  it("buildPhotoFileName('camera', 'abc-123')이 'camera-abc-123.jpg'를 반환한다", () => {
    expect(buildPhotoFileName('camera', 'abc-123')).toBe('camera-abc-123.jpg');
  });

  it("buildPhotoFileName('library', 'abc-123')이 'library-abc-123.jpg'를 반환한다", () => {
    expect(buildPhotoFileName('library', 'abc-123')).toBe('library-abc-123.jpg');
  });
});

describe('ensurePhotoPermission', () => {
  it("카메라 권한이 granted면 true를 반환하고 requestCameraPermissionsAsync를 호출한다", async () => {
    const fake = createFakeImagePicker();
    fake.__setPermission('camera', 'undetermined');

    const granted = await ensurePhotoPermission('camera', fake);

    expect(granted).toBe(true);
  });

  it('카메라 권한이 denied면 false를 반환한다', async () => {
    const fake = createFakeImagePicker();
    fake.__setPermission('camera', 'denied');

    const granted = await ensurePhotoPermission('camera', fake);

    expect(granted).toBe(false);
  });

  it("'library' 소스는 requestMediaLibraryPermissionsAsync만 호출하고 카메라 권한 함수는 호출하지 않는다", async () => {
    const fake = createFakeImagePicker();
    let cameraCalled = false;
    const originalRequestCamera = fake.requestCameraPermissionsAsync;
    fake.requestCameraPermissionsAsync = (async (...args: Parameters<typeof originalRequestCamera>) => {
      cameraCalled = true;
      return originalRequestCamera(...args);
    }) as typeof originalRequestCamera;

    await ensurePhotoPermission('library', fake);

    expect(cameraCalled).toBe(false);
  });
});

describe('pickAndCopyPhoto', () => {
  // 인라인 fake crypto — src/notifications/permissions.test.ts의 AppStateLike 인라인
  // 페이크와 동일한 규율: 이 plan은 별도 testing/fakeCrypto.ts를 만들지 않으므로(파일
  // 목록이 photos.ts/photos.test.ts로 고정) deps.ts의 defaultCryptoDeps(실제
  // expo-crypto.randomUUID, 네이티브 바인딩이 없는 node 테스트 환경에서 결정적이지
  // 않음)를 쓰지 않고 결정적 카운터 기반 더블을 직접 주입한다.
  function createFakeCrypto() {
    let counter = 0;
    return {
      randomUUID: (): string => `fake-uuid-${++counter}`,
    };
  }

  function setupSuccess(source: 'camera' | 'library') {
    const picker = createFakeImagePicker();
    const storage = createFakePhotoStorage();
    const crypto = createFakeCrypto();
    const resize = createFakeImageResizer();
    picker.__setPermission(source, 'undetermined');
    picker.__setNextResult({
      canceled: false,
      assets: [{ uri: 'file:///original/IMG_0001.HEIC', fileName: 'IMG_0001.HEIC' }],
    });
    return { picker, storage, crypto, resize };
  }

  it("pickAndCopyPhoto('camera', deps)가 성공하면 { uri, source: 'camera', fileName }을 반환하고 fileName이 'camera-'로 시작한다", async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');

    const result = await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    expect(result).not.toBeNull();
    expect(result && 'error' in result).toBe(false);
    const picked = result as { uri: string; source: string; fileName: string };
    expect(picked.source).toBe('camera');
    expect(picked.fileName.startsWith('camera-')).toBe(true);
  });

  it("pickAndCopyPhoto('library', deps)가 성공하면 반환 객체의 source가 'library'이고 fileName이 'library-'로 시작한다", async () => {
    const { picker, storage, crypto, resize } = setupSuccess('library');

    const result = await pickAndCopyPhoto('library', { picker, storage, crypto, resize });

    const picked = result as { uri: string; source: string; fileName: string };
    expect(picked.source).toBe('library');
    expect(picked.fileName.startsWith('library-')).toBe(true);
  });

  it('picker가 { canceled: true }를 반환하면 null을 반환하고 copyIntoDocumentDirectory가 호출되지 않는다', async () => {
    const picker = createFakeImagePicker();
    const storage = createFakePhotoStorage();
    picker.__setPermission('camera', 'undetermined');
    picker.__setNextResult({ canceled: true, assets: null });

    const result = await pickAndCopyPhoto('camera', { picker, storage });

    expect(result).toBeNull();
    expect(storage.__copies()).toHaveLength(0);
  });

  it("권한이 거부되면 { error: 'permission_denied' }를 반환하고 picker launch 함수가 호출되지 않는다", async () => {
    const picker = createFakeImagePicker();
    const storage = createFakePhotoStorage();
    const resize = createFakeImageResizer();
    picker.__setPermission('camera', 'denied');
    picker.__setNextResult({
      canceled: false,
      assets: [{ uri: 'file:///original/IMG_0001.HEIC', fileName: 'IMG_0001.HEIC' }],
    });

    const result = await pickAndCopyPhoto('camera', { picker, storage, resize });

    expect(result).toEqual({ error: 'permission_denied' });
    expect(picker.__lastLaunched()).toBeNull();
    expect(resize.__calls()).toHaveLength(0);
  });

  it("copyIntoDocumentDirectory가 throw하면 { error: 'copy_failed' }를 반환하고 예외를 밖으로 던지지 않는다", async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');
    storage.__setShouldThrow(true);

    const result = await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    expect(result).toEqual({ error: 'copy_failed' });
  });

  it('copyIntoDocumentDirectory에 전달된 fileName 인자가 picker 원본 uri의 파일명과 무관한 UUID 기반 이름이다', async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');

    await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    const copies = storage.__copies();
    expect(copies).toHaveLength(1);
    expect(copies[0].fileName).not.toBe('IMG_0001.HEIC');
    expect(copies[0].fileName).toMatch(/^camera-fake-uuid-\d+\.jpg$/);
  });

  it('copy가 리사이즈 결과 uri를 받는다(픽커 원본 uri가 아니다)', async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');

    await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    const copies = storage.__copies();
    const resizeCalls = resize.__calls();
    expect(copies).toHaveLength(1);
    expect(resizeCalls).toHaveLength(1);
    expect(copies[0].source).not.toBe('file:///original/IMG_0001.HEIC');
    expect(copies[0].source).toBe(`file:///fake-cache/resized-1.jpg`);
  });

  it('resize가 MAX_PHOTO_DIMENSION_PX(1600)를 두 번째 인자로 받는다', async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');

    await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    const resizeCalls = resize.__calls();
    expect(resizeCalls).toHaveLength(1);
    expect(resizeCalls[0].uri).toBe('file:///original/IMG_0001.HEIC');
    expect(resizeCalls[0].maxDimensionPx).toBe(MAX_PHOTO_DIMENSION_PX);
  });

  it("resize가 throw하면 { error: 'resize_failed' }를 반환하고 copyIntoDocumentDirectory가 호출되지 않는다", async () => {
    const { picker, storage, crypto, resize } = setupSuccess('camera');
    resize.__setShouldThrow(true);

    const result = await pickAndCopyPhoto('camera', { picker, storage, crypto, resize });

    expect(result).toEqual({ error: 'resize_failed' });
    expect(storage.__copies()).toHaveLength(0);
  });
});
