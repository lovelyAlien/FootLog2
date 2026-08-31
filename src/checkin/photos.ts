// src/checkin/photos.ts
// 03-CONTEXT.md D-01(사진 첨부 UI + 카메라/사진 라이브러리 권한 요청)과 D-02(원본을
// `documentDirectory`에 복사)를 데이터/서비스 계층으로 구현한다. Phase 4(REQ-photo-resize)에서
// 리사이징 단계가 추가됐다 — 진행 순서는 픽커 원본 → resize(최대 MAX_PHOTO_DIMENSION_PX) →
// documentDirectory 복사다. 리사이즈 라이브러리의 saveAsync() 기본 출력 위치가
// cacheDirectory라서(04-RESEARCH.md), 리사이징 결과를 그대로 photo_path로 쓰면 OS가
// 저장공간 압박 시 지울 수 있다(threat T-4-05) — 그래서 리사이징 결과를 반드시 기존
// copyIntoDocumentDirectory 포트에 한 번 더 통과시킨다.
//
// 이 파일은 카메라/사진 라이브러리/암호/리사이즈용 네이티브 패키지를 어느 것도 직접
// import하지 않는다 — deps.ts가 조립한 기본 구현을 인자 기본값으로만 받는다(config.ts
// 헤더 규약, 03-01이 세운 격리 회귀 가드).
import type { ImagePickerDeps, CryptoDeps, PhotoStorageDeps, ResizeDeps } from './config';
import { MAX_PHOTO_DIMENSION_PX } from './config';
import {
  defaultImagePickerDeps,
  defaultCryptoDeps,
  defaultPhotoStorageDeps,
  defaultResizeDeps,
} from './deps';

export type PhotoSource = 'camera' | 'library';

// 문구 출처: 03-UI-SPEC.md §Copywriting Contract "사진 액션시트 옵션" 행 — 여기서
// 문구를 발명하지 않고 승인된 문서에서 그대로 전사한다(src/notifications/content.ts와
// 동일 규약). `ActionSheetIOS`는 OS 네이티브 컴포넌트라 커스텀 리테마하지 않는다는
// 계약도 이 상수 정의에 귀속된다 — 실제 `ActionSheetIOS.showActionSheetWithOptions`
// 호출은 화면(03-08 액션 카드)이 담당하고, 이 모듈은 옵션 정의만 소유한다.
export const PHOTO_ACTION_SHEET_OPTIONS = ['사진 촬영', '앨범에서 선택', '취소'] as const;
export const PHOTO_ACTION_SHEET_CANCEL_INDEX = 2;

// 화면이 액션시트 인덱스를 직접 하드코딩하지 않도록 인덱스→출처 매핑을 이 모듈이 소유한다.
export const PHOTO_SOURCE_BY_ACTION_SHEET_INDEX: readonly (PhotoSource | null)[] = [
  'camera',
  'library',
  null,
];

// 출처 접두사를 파일명에 남기는 이유: Phase 4 REQ-exif-geotag가 카메라 사진에만 GPS를
// 주입해야 하므로, 이 시점에 출처 정보를 조용히 버리면 Phase 4가 구분할 방법을 잃는다
// (03-RESEARCH.md Common Pitfalls Pitfall 6).
export function buildPhotoFileName(source: PhotoSource, uuid: string): string {
  return `${source}-${uuid}.jpg`;
}

export async function ensurePhotoPermission(
  source: PhotoSource,
  deps: ImagePickerDeps = defaultImagePickerDeps
): Promise<boolean> {
  const response =
    source === 'camera'
      ? await deps.requestCameraPermissionsAsync()
      : await deps.requestMediaLibraryPermissionsAsync();
  return response.granted;
}

export type PickedPhoto = { uri: string; source: PhotoSource; fileName: string };
export type PickPhotoResult =
  | PickedPhoto
  | null
  | { error: 'permission_denied' | 'copy_failed' | 'resize_failed' };

export async function pickAndCopyPhoto(
  source: PhotoSource,
  deps: {
    picker?: ImagePickerDeps;
    storage?: PhotoStorageDeps;
    crypto?: CryptoDeps;
    resize?: ResizeDeps;
  } = {}
): Promise<PickPhotoResult> {
  const picker = deps.picker ?? defaultImagePickerDeps;
  const storage = deps.storage ?? defaultPhotoStorageDeps;
  const crypto = deps.crypto ?? defaultCryptoDeps;
  const resize = deps.resize ?? defaultResizeDeps;

  const granted = await ensurePhotoPermission(source, picker);
  if (!granted) {
    return { error: 'permission_denied' };
  }

  // 이미지 전용 필터 옵션을 반드시 명시한다 — 미지정 시 기본값이 동영상까지 포함할 수
  // 있어 REQ 스코프(사진만) 밖 파일이 documentDirectory에 복사될 위험이 있다
  // (03-RESEARCH.md Assumptions Log A5). deprecated된 열거형 옵션(구 SDK 방식)은 쓰지 않는다.
  const result =
    source === 'camera'
      ? await picker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  // 목적지 파일명은 항상 UUID 기반이며 picker가 반환한 assets[0].uri/fileName을
  // 목적지 경로에 절대 쓰지 않는다 — 경로 조작 방어(03-RESEARCH.md Security Domain
  // "사진 파일 경로 조작" 완화, threat T-3-04).
  const uuid = crypto.randomUUID();
  const fileName = buildPhotoFileName(source, uuid);

  // 리사이징을 documentDirectory 복사보다 먼저 수행한다 — resize 결과 uri를 복사 단계에
  // 넘겨야 최종 photo_path가 리사이징된 파일을 가리킨다(threat T-4-05).
  let resizedUri: string;
  try {
    resizedUri = await resize.resizeToMaxDimension(asset.uri, MAX_PHOTO_DIMENSION_PX);
  } catch (error) {
    // 예외를 밖으로 던지지 않되 로그는 남긴다(프로미스/에러 미삼킴 규약).
    console.error('Failed to resize photo', error);
    return { error: 'resize_failed' };
  }

  try {
    const destinationUri = await storage.copyIntoDocumentDirectory(resizedUri, fileName);
    return { uri: destinationUri, source, fileName };
  } catch (error) {
    // 예외를 밖으로 던지지 않되 로그는 남긴다(프로미스/에러 미삼킴 규약).
    console.error('Failed to copy photo into documentDirectory', error);
    return { error: 'copy_failed' };
  }
}
