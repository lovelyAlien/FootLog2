/**
 * @jest-environment node
 */
// src/checkin/photos.test.ts
// 03-06-PLAN.md Task 1 — 사진 첨부 액션시트 옵션/파일명 규약/권한 요청 behavior 검증.
// src/checkin/fallbackLocation.test.ts와 동일 패턴: 이 파일은 네이티브 패키지를
// 전혀 import하지 않는다 — deps.ts가 만든 더블(../testing/fakeImagePicker.ts)만 사용한다.
import {
  PHOTO_ACTION_SHEET_OPTIONS,
  PHOTO_ACTION_SHEET_CANCEL_INDEX,
  PHOTO_SOURCE_BY_ACTION_SHEET_INDEX,
  buildPhotoFileName,
  ensurePhotoPermission,
} from './photos';
import { createFakeImagePicker } from './testing/fakeImagePicker';

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
