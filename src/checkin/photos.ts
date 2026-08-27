// src/checkin/photos.ts
// 03-CONTEXT.md D-01(사진 첨부 UI + 카메라/사진 라이브러리 권한 요청)과 D-02(원본을
// `documentDirectory`에 복사)를 데이터/서비스 계층으로 구현한다. 리사이징(최대 1600px)과
// 최종 저장 규약은 Phase 4(REQ-photo-resize) 몫이므로 여기서 건드리지 않는다.
//
// 이 파일은 'expo-image-picker'/'expo-file-system'/'expo-crypto'를 직접 import하지
// 않는다 — deps.ts가 조립한 기본 구현을 인자 기본값으로만 받는다(config.ts 헤더 규약,
// 03-01이 세운 격리 회귀 가드).
import type { ImagePickerDeps } from './config';
import { defaultImagePickerDeps } from './deps';

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
