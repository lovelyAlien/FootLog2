// src/checkin/config.ts
// Phase 3 체크인 코어 루프 — 타입/상수 단일 출처. 여기서 값을 발명하지 않는다
// (src/notifications/config.ts / src/theme/tokens.ts와 동일 규약) — 값이 바뀌면
// 출처 문서를 먼저 갱신하고 이 파일에 반영한다.
//
// 런타임 import를 두지 않는다 — expo-location/expo-image-picker/expo-crypto는 타입
// 전용 import로만 참조한다. 타입 import는 컴파일 시 지워지므로 `@jest-environment node`
// 테스트가 네이티브 모듈을 로드하지 않는다(03-RESEARCH.md Architecture Patterns Pattern 1).
import type * as Location from 'expo-location';
import type * as ImagePicker from 'expo-image-picker';
import type * as Crypto from 'expo-crypto';

// src/db/migrations.ts의 MigratableDb 패턴과 동일 — 프로덕션이 실제로 쓰는 메서드만
// 좁혀서 노출한다. 테스트 더블(testing/fakeLocation.ts)이 이 타입을 그대로 만족시켜야 한다.
export type LocationDeps = Pick<
  typeof Location,
  | 'getForegroundPermissionsAsync'
  | 'requestForegroundPermissionsAsync'
  | 'getCurrentPositionAsync'
  | 'getLastKnownPositionAsync'
  | 'watchHeadingAsync'
>;

export type ImagePickerDeps = Pick<
  typeof ImagePicker,
  | 'launchCameraAsync'
  | 'launchImageLibraryAsync'
  | 'requestCameraPermissionsAsync'
  | 'requestMediaLibraryPermissionsAsync'
>;

export type CryptoDeps = Pick<typeof Crypto, 'randomUUID'>;

// expo-file-system SDK 54+ 새 API는 클래스 생성자(`new File(...)`)라
// `Pick<typeof FileSystem, 'File' | 'Paths'>` 형태의 더블이 생성자 형태를 흉내 내야 해
// 테스트 더블이 불필요하게 복잡해진다(03-RESEARCH.md Pitfall 2). 대신 프로덕션이 실제로
// 필요로 하는 동작(사진 원본을 documentDirectory로 복사) 하나만 함수 포트로 좁힌다.
// 반환값은 복사된 목적지 파일의 uri 문자열.
export type PhotoStorageDeps = {
  copyIntoDocumentDirectory(sourceUri: string, fileName: string): Promise<string>;
};

// expo-image-manipulator SDK 57 새 API는 체이닝 컨텍스트 객체
// (`manipulate().resize().renderAsync().saveAsync()`)라 `Pick<typeof SDK, ...>` 더블이
// 과도하게 복잡해지므로(위 PhotoStorageDeps와 동일한 이유), 프로덕션이 실제로 필요로 하는
// 동작 하나("긴 변을 maxDimensionPx 이하로 줄인 뒤 저장한 결과 uri를 반환") 만 좁힌 함수
// 포트로 노출한다.
export type ResizeDeps = {
  resizeToMaxDimension(uri: string, maxDimensionPx: number): Promise<string>;
};

// 5000 = docs/designs/footlog-product-design.md T5 확정값(실측 근거 없는 초기 추정치로
// 문서에 명시돼 있음, 03-RESEARCH.md Pattern 2). getCurrentPositionAsync에는 신뢰 가능한
// timeout 옵션이 없어 Promise.race로 직접 구현해야 한다.
export const CAPTURE_TIMEOUT_MS = 5000;

// OS 캐시 위치(getLastKnownPositionAsync)를 신선하다고 볼 최대 나이. 5분 = 자체 추정치.
export const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

// 03-CONTEXT.md D-04: drafts 테이블은 단일 row만 유지하는 고정 PK를 쓴다(화면 이탈/강제
// 종료 후에도 드래프트가 생존해야 하므로 사용자별/세션별 PK가 아니라 상수 하나로 고정).
export const DRAFT_ROW_ID = 'draft';

// REQ-photo-resize 확정값, 다른 곳에서 1600을 재선언하지 않는다(04-02-PLAN.md).
export const MAX_PHOTO_DIMENSION_PX = 1600;

// deps.ts의 `Location.Accuracy.Balanced`(nominal enum) 값과 반드시 일치해야 한다 —
// 정합성 단언은 deps.ts에 있다(유닛 테스트가 네이티브 모듈을 로드하지 않으므로 런타임
// 검증 경로가 없음). 03-RESEARCH.md Standard Stack 기준 expo-location@~57.0.14의
// LocationAccuracy.Balanced = 3.
export const LOCATION_ACCURACY_BALANCED = 3 as const;
