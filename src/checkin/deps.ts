// src/checkin/deps.ts
// 계약: 이 파일이 src/checkin/ 안에서 'expo-location'/'expo-image-picker'/
// 'expo-file-system'/'expo-crypto'를 런타임 import 하는 유일한 파일이다. 다른 체크인
// 모듈은 절대 이 패키지들을 직접 import 하지 않는다 — 이후 Plan(위치 캡처, 사진,
// 리포지토리, 화면)이 지켜야 할 규칙이며, config.ts는 타입 전용 import만 허용된다.
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import type { LocationDeps, ImagePickerDeps, CryptoDeps, PhotoStorageDeps } from './config';
import { LOCATION_ACCURACY_BALANCED } from './config';

export const defaultLocationDeps: LocationDeps = {
  getForegroundPermissionsAsync: Location.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync,
  getCurrentPositionAsync: Location.getCurrentPositionAsync,
  getLastKnownPositionAsync: Location.getLastKnownPositionAsync,
};

export const defaultImagePickerDeps: ImagePickerDeps = {
  launchCameraAsync: ImagePicker.launchCameraAsync,
  launchImageLibraryAsync: ImagePicker.launchImageLibraryAsync,
  requestCameraPermissionsAsync: ImagePicker.requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync: ImagePicker.requestMediaLibraryPermissionsAsync,
};

export const defaultCryptoDeps: CryptoDeps = {
  randomUUID: Crypto.randomUUID,
};

// 새 클래스 기반 expo-file-system API(03-RESEARCH.md Pitfall 2) — 문자열 경로 접합이나
// expo-file-system/legacy import를 쓰지 않는다. `Paths.document`(Directory 객체)를
// 목적지로 삼아 `new File(...).copy(...)`로 복사한 뒤 목적지 uri를 반환한다.
export const defaultPhotoStorageDeps: PhotoStorageDeps = {
  async copyIntoDocumentDirectory(sourceUri, fileName) {
    const sourceFile = new File(sourceUri);
    const destinationFile = new File(Paths.document, fileName);
    await sourceFile.copy(destinationFile);
    return destinationFile.uri;
  },
};

// 컴파일타임 정합성 단언: LOCATION_ACCURACY_BALANCED 리터럴이 실제 SDK enum과 일치하는지
// 강제한다. 유닛 테스트는 네이티브 모듈을 로드하지 않으므로(config.ts는 타입 전용 import)
// 런타임 검증 경로가 없다 — SDK가 이 값을 바꾸면 아래 대입이 타입 에러를 내며
// `tsc --noEmit`이 깨지게 만든다(src/notifications/deps.ts의
// _calendarTriggerTypeAssertion과 동일한 규율).
const _accuracyAssertion: typeof LOCATION_ACCURACY_BALANCED = Location.Accuracy.Balanced;
void _accuracyAssertion;
