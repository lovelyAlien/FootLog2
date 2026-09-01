// src/checkin/testing/fakePhotoStorage.ts
// 테스트 전용 인메모리 사진 복사 더블 — fakeNotifications.ts와 같은 위치 규약
// (`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입 `PhotoStorageDeps`를
// 그대로 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-file-system'을 전혀 import 하지 않는다 — deps.ts가 그 런타임 import를
// 유일하게 소유한다(config.ts 헤더 규약). 실제 파일시스템에 아무것도 쓰지 않고, 호출
// 기록만 메모리에 남긴다.
//
// 실제 네이티브 모듈과 다르게 동작하는 지점:
// 1. 이 더블은 실제 파일을 디스크에 복사하지 않는다 — 반환되는 uri는 실제로 존재하는
//    파일을 가리키지 않는다(`file:///fake-document/<fileName>` 고정 형태).
// 2. 이 더블은 디스크 공간 부족/권한 오류 등 실제 파일시스템 실패 모드를 재현하지 않는다 —
//    실패 시나리오는 __setShouldThrow(true)로만 흉내 낸다.
// 3. deleteFile은 존재하지 않는 파일을 삭제하려 할 때 실제 모듈의 동작(예외 발생 여부)을
//    재현하지 않는다 — 이 더블은 삭제 호출 기록만 메모리에 남기고 항상 성공한다
//    (__setShouldThrow(true)일 때만 예외).
import type { PhotoStorageDeps } from '../config';

export type FakePhotoStorage = PhotoStorageDeps & {
  __copies(): Array<{ source: string; fileName: string }>;
  __deletions(): string[];
  __setShouldThrow(shouldThrow: boolean): void;
};

export function createFakePhotoStorage(): FakePhotoStorage {
  const copies: Array<{ source: string; fileName: string }> = [];
  const deletions: string[] = [];
  let shouldThrow = false;

  const copyIntoDocumentDirectory: PhotoStorageDeps['copyIntoDocumentDirectory'] = async (
    sourceUri,
    fileName
  ) => {
    if (shouldThrow) {
      throw new Error('fake-photo-storage: simulated copy failure');
    }
    copies.push({ source: sourceUri, fileName });
    return `file:///fake-document/${fileName}`;
  };

  const deleteFile: PhotoStorageDeps['deleteFile'] = async (uri) => {
    if (shouldThrow) {
      throw new Error('fake-photo-storage: simulated delete failure');
    }
    deletions.push(uri);
  };

  return {
    copyIntoDocumentDirectory,
    deleteFile,
    __copies() {
      return copies;
    },
    __deletions() {
      return deletions;
    },
    __setShouldThrow(value) {
      shouldThrow = value;
    },
  };
}
