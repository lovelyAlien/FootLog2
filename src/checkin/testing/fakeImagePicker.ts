// src/checkin/testing/fakeImagePicker.ts
// 테스트 전용 인메모리 사진 선택 더블 — fakeNotifications.ts와 같은 위치 규약
// (`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입 `ImagePickerDeps`를
// 그대로 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-image-picker'를 전혀 import 하지 않는다 — deps.ts가 그 런타임 import를
// 유일하게 소유한다(config.ts 헤더 규약). 대신 `ImagePickerDeps`(타입 전용, ../config.ts)에서
// `Awaited`/`ReturnType`으로 필요한 SDK 타입을 전부 유도한다.
//
// 실제 네이티브 모듈과 다르게 동작하는 지점:
// 1. 이 더블은 iOS 액션시트 UI 자체를 렌더링하지 않는다 — 호출 즉시 __setNextResult로
//    지정된 결과를 반환한다.
// 2. 이 더블은 카메라 하드웨어 부재/시뮬레이터 제약을 재현하지 않는다.
// 3. 라이브러리 다중 선택(`allowsMultipleSelection`) 등 옵션별 분기를 흉내 내지 않는다 —
//    호출된 소스(camera/library) 구분만 __lastLaunched()로 기록한다.
import type { ImagePickerDeps } from '../config';

type LaunchResult = Awaited<ReturnType<ImagePickerDeps['launchCameraAsync']>>;
type CameraPermissionsResult = Awaited<
  ReturnType<ImagePickerDeps['requestCameraPermissionsAsync']>
>;
type MediaLibraryPermissionsResult = Awaited<
  ReturnType<ImagePickerDeps['requestMediaLibraryPermissionsAsync']>
>;

type FakePermissionStatus = 'granted' | 'denied' | 'undetermined';
type ImagePickerSource = 'camera' | 'library';

export type FakeImagePicker = ImagePickerDeps & {
  __setNextResult(result: { canceled: boolean; assets?: unknown }): void;
  __setPermission(source: ImagePickerSource, status: FakePermissionStatus): void;
  __lastLaunched(): ImagePickerSource | null;
};

export function createFakeImagePicker(): FakeImagePicker {
  // 기본값: 아직 결과를 지정하지 않은 상태에서 호출되면 취소로 간주한다 — 실제 사용자가
  // 액션시트를 그냥 닫는 것과 동등한 안전한 기본값.
  let nextResult: { canceled: boolean; assets?: unknown } = { canceled: true, assets: null };
  let cameraPermission: FakePermissionStatus = 'undetermined';
  let libraryPermission: FakePermissionStatus = 'undetermined';
  let lastLaunched: ImagePickerSource | null = null;

  // PermissionStatus(expo-modules-core)는 nominal string enum이라 리터럴이 구조적으로
  // 호환돼 보여도 캐스트 없이는 대입되지 않는다 — 이 함수 한 곳에서만 캐스트한다
  // (fakeLocation.ts buildPermissionsStatus와 동일한 규율).
  function buildPermissionsStatus(
    status: FakePermissionStatus
  ): CameraPermissionsResult | MediaLibraryPermissionsResult {
    return {
      status,
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
      expires: 'never',
    } as unknown as CameraPermissionsResult;
  }

  function requestPermission(current: FakePermissionStatus): {
    next: FakePermissionStatus;
    response: CameraPermissionsResult | MediaLibraryPermissionsResult;
  } {
    // iOS는 undetermined 상태에서만 실제 프롬프트를 띄운다 — 이미 거부된 뒤에는 재호출해도
    // 상태가 바뀌지 않는다(fakeLocation.ts와 동일한 규칙).
    const next: FakePermissionStatus = current === 'undetermined' ? 'granted' : current;
    return { next, response: buildPermissionsStatus(next) };
  }

  const launchCameraAsync: ImagePickerDeps['launchCameraAsync'] = async () => {
    lastLaunched = 'camera';
    return nextResult as unknown as LaunchResult;
  };

  const launchImageLibraryAsync: ImagePickerDeps['launchImageLibraryAsync'] = async () => {
    lastLaunched = 'library';
    return nextResult as unknown as LaunchResult;
  };

  const requestCameraPermissionsAsync: ImagePickerDeps['requestCameraPermissionsAsync'] =
    async () => {
      const { next, response } = requestPermission(cameraPermission);
      cameraPermission = next;
      return response as CameraPermissionsResult;
    };

  const requestMediaLibraryPermissionsAsync: ImagePickerDeps['requestMediaLibraryPermissionsAsync'] =
    async () => {
      const { next, response } = requestPermission(libraryPermission);
      libraryPermission = next;
      return response as MediaLibraryPermissionsResult;
    };

  return {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    requestMediaLibraryPermissionsAsync,
    __setNextResult(result) {
      nextResult = result;
    },
    __setPermission(source, status) {
      if (source === 'camera') {
        cameraPermission = status;
      } else {
        libraryPermission = status;
      }
    },
    __lastLaunched() {
      return lastLaunched;
    },
  };
}
