// src/checkin/testing/fakeImageResizer.ts
// 테스트 전용 인메모리 리사이즈 더블 — fakePhotoStorage.ts와 같은 위치 규약
// (`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입 `ResizeDeps`를 그대로
// 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-image-manipulator'를 전혀 import 하지 않는다 — deps.ts가 그 런타임
// import를 유일하게 소유한다(config.ts 헤더 규약). 실제 이미지를 리사이징하지 않고, 호출
// 기록만 메모리에 남긴다.
//
// 실제 네이티브 모듈과 다르게 동작하는 지점:
// 1. 이 더블은 실제 픽셀을 줄이지 않는다 — 반환되는 uri는 항상 고정 패턴
//    (`file:///fake-cache/resized-<n>.jpg`)이며, 원본과 반드시 다른 문자열이라는 점만
//    보장한다("복사 단계에 리사이즈 결과가 넘어갔는가"를 단언할 수 있도록).
// 2. 이 더블은 EXIF 방향(orientation) 처리를 재현하지 않는다 — 실제
//    expo-image-manipulator는 EXIF 회전을 반영해 픽셀을 리사이징하지만, 이 더블은 호출
//    인자(uri, maxDimensionPx)만 기록한다.
import type { ResizeDeps } from '../config';

export type FakeImageResizer = ResizeDeps & {
  __calls(): Array<{ uri: string; maxDimensionPx: number }>;
  __setShouldThrow(shouldThrow: boolean): void;
};

export function createFakeImageResizer(): FakeImageResizer {
  const calls: Array<{ uri: string; maxDimensionPx: number }> = [];
  let shouldThrow = false;
  let counter = 0;

  const resizeToMaxDimension: ResizeDeps['resizeToMaxDimension'] = async (
    uri,
    maxDimensionPx
  ) => {
    calls.push({ uri, maxDimensionPx });
    if (shouldThrow) {
      throw new Error('fake-image-resizer: simulated resize failure');
    }
    return `file:///fake-cache/resized-${++counter}.jpg`;
  };

  return {
    resizeToMaxDimension,
    __calls() {
      return calls;
    },
    __setShouldThrow(value) {
      shouldThrow = value;
    },
  };
}
