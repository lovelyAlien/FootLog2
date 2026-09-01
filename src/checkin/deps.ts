// src/checkin/deps.ts
// 계약: 이 파일이 src/checkin/ 안에서 'expo-location'/'expo-image-picker'/
// 'expo-file-system'/'expo-crypto'/'expo-image-manipulator'를 런타임 import 하는
// 유일한 파일이다. 다른 체크인 모듈은 절대 이 패키지들을 직접 import 하지 않는다 —
// 이후 Plan(위치 캡처, 사진, 리포지토리, 화면)이 지켜야 할 규칙이며, config.ts는
// 타입 전용 import만 허용된다.
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type {
  LocationDeps,
  ImagePickerDeps,
  CryptoDeps,
  PhotoStorageDeps,
  ResizeDeps,
} from './config';
import { LOCATION_ACCURACY_BALANCED } from './config';
import { resolveResizeTarget } from './photoResize';

// 리뷰 발견 — index.tsx의 resolveInstantPosition(재센터/초기 진입)과 location.ts의
// captureWithTimeout(체크인 캡처)이 서로 조율 없이 각자 독립적으로
// getCurrentPositionAsync를 부를 수 있다(예: 콜드 부팅 직후 초기 위치 정렬이 아직
// GPS를 기다리는 중에 사용자가 "체크인"을 탭하는 경우) — 두 GPS 요청이 동시에 뜨는
// 것을 막기 위해 여기서 동일 옵션의 동시 호출을 하나의 네이티브 호출로 합친다
// (in-flight 요청 coalescing). 옵션 조합별로 캐시 키를 나눠 서로 다른 accuracy
// 요청까지 잘못 합치지 않는다.
const inFlightPositionRequests = new Map<
  string,
  ReturnType<typeof Location.getCurrentPositionAsync>
>();

function getCurrentPositionAsyncDeduped(
  ...args: Parameters<typeof Location.getCurrentPositionAsync>
): ReturnType<typeof Location.getCurrentPositionAsync> {
  const key = JSON.stringify(args[0] ?? null);
  const inFlight = inFlightPositionRequests.get(key);
  if (inFlight) return inFlight;

  const promise = Location.getCurrentPositionAsync(...args).finally(() => {
    inFlightPositionRequests.delete(key);
  });
  inFlightPositionRequests.set(key, promise);
  return promise;
}

export const defaultLocationDeps: LocationDeps = {
  getForegroundPermissionsAsync: Location.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync,
  getCurrentPositionAsync: getCurrentPositionAsyncDeduped,
  getLastKnownPositionAsync: Location.getLastKnownPositionAsync,
  watchHeadingAsync: Location.watchHeadingAsync,
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

// 구 버전의 단일 호출형 리사이즈 함수(deprecated, 04-RESEARCH.md Pitfall 2)는 쓰지 않는다
// — 새 컨텍스트 기반 API(`manipulate().resize().renderAsync().saveAsync()`)만 사용한다.
// 절차: 1) 원본 치수를 얻기 위해 액션 없이 한 번 렌더한다(ImageRef가 width/height를
// 노출). 2) resolveResizeTarget(순수 함수, photoResize.ts)로 방향에 따라 어느 치수를
// 제약할지 판단한다. 3) null이면 리사이징 없이 원본 uri를 그대로 반환한다(이미 충분히
// 작음). 4) null이 아니면 그 인자로 다시 리사이즈 → 렌더 → JPEG 저장한 결과 uri를
// 반환한다. saveAsync()의 기본 출력 위치는 cacheDirectory이므로, 이 결과는 반드시
// 호출자(photos.ts)가 copyIntoDocumentDirectory에 한 번 더 통과시켜야 한다.
export const defaultResizeDeps: ResizeDeps = {
  async resizeToMaxDimension(uri, maxDimensionPx) {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const target = resolveResizeTarget(original.width, original.height, maxDimensionPx);
    if (target === null) {
      return uri;
    }
    const resized = await ImageManipulator.manipulate(uri).resize(target).renderAsync();
    const saved = await resized.saveAsync({ format: SaveFormat.JPEG });
    return saved.uri;
  },
};

// 컴파일타임 정합성 단언: LOCATION_ACCURACY_BALANCED 리터럴이 실제 SDK enum과 일치하는지
// 강제한다. 유닛 테스트는 네이티브 모듈을 로드하지 않으므로(config.ts는 타입 전용 import)
// 런타임 검증 경로가 없다 — SDK가 이 값을 바꾸면 아래 대입이 타입 에러를 내며
// `tsc --noEmit`이 깨지게 만든다(src/notifications/deps.ts의
// _calendarTriggerTypeAssertion과 동일한 규율).
const _accuracyAssertion: typeof LOCATION_ACCURACY_BALANCED = Location.Accuracy.Balanced;
void _accuracyAssertion;
