// src/notifications/testing/fakeNotifications.ts
// 테스트 전용 인메모리 알림 더블 — nodeSqliteAdapter.ts와 같은 위치 규약
// (`src/<도메인>/testing/`)과 같은 형태(프로덕션이 쓰는 좁힌 타입 `NotificationDeps`를
// 그대로 만족시키는 더블)를 따른다.
//
// 이 파일은 'expo-notifications'를 전혀 import 하지 않는다 — deps.ts가 그 런타임 import를
// 유일하게 소유한다(config.ts 헤더 규약). 대신 `NotificationDeps`(타입 전용, ../config.ts)에서
// `Parameters`/`ReturnType`으로 필요한 타입을 전부 유도한다.
//
// 실제 네이티브 모듈과 다르게 동작하는 지점(nodeSqliteAdapter.ts 규율과 동일하게 주석으로
// 명시):
// 1. 이 더블은 "iOS가 며칠 뒤 트리거를 조용히 드롭하는" 실패 모드(02-RESEARCH.md
//    Pitfall 1)를 재현하지 않는다 — 테스트는 `cancelScheduledNotificationAsync`를 수동
//    호출해 그 상태를 흉내 낸다.
// 2. 이 더블은 iOS 64개 pending 알림 한도를 강제하지 않는다 — 몇 개를 스케줄하든 전부
//    저장된다.
import type { NotificationDeps } from '../config';

type ScheduleFn = NotificationDeps['scheduleNotificationAsync'];
type ScheduleRequest = Parameters<ScheduleFn>[0];
type ScheduledNotification = Awaited<ReturnType<NotificationDeps['getAllScheduledNotificationsAsync']>>[number];
type PermissionsStatus = Awaited<ReturnType<NotificationDeps['getPermissionsAsync']>>;

type FakePermissionStatus = 'granted' | 'denied' | 'undetermined';

export type FakeNotifications = NotificationDeps & {
  __setPermission(status: FakePermissionStatus): void;
  __seed(identifiers: string[]): void;
  __ids(): string[];
  __scheduleCallCount(): number;
  __cancelCallCount(): number;
};

// 저장소 내부 항목 형태는 스케줄 입력(content/trigger)을 그대로 보존한다. 실제 SDK의
// 출력 타입(NotificationRequest.content/.trigger)은 입력 타입보다 필드가 더 엄격/많다
// (예: iOS 전용 필수 필드) — 이 더블은 라운드트립 값 보존만 검증하면 충분하므로, 조회
// 경계(getAllScheduledNotificationsAsync) 한 곳에서만 캐스트한다(nodeSqliteAdapter.ts와
// 동일한 "단일 캐스트, export 경계 밖으로 새어 나가지 않음" 규율).
type StoredNotification = {
  identifier: string;
  content: ScheduleRequest['content'];
  trigger: ScheduleRequest['trigger'];
};

export function createFakeNotifications(): FakeNotifications {
  const store = new Map<string, StoredNotification>();
  let scheduleCallCount = 0;
  let cancelCallCount = 0;
  let permissionStatus: FakePermissionStatus = 'undetermined';
  let autoIdCounter = 0;

  function generateId(): string {
    autoIdCounter += 1;
    return `fake-notification-${autoIdCounter}`;
  }

  // PermissionStatus는 nominal string enum이라 리터럴 'granted'/'denied'/'undetermined'가
  // 구조적으로 호환돼 보여도 캐스트 없이는 대입되지 않는다(migrations.ts의 PRAGMA 캐스트와
  // 같은 이유의 nominal-typing 우회) — 이 함수 한 곳에서만 캐스트한다.
  function buildPermissionsStatus(status: FakePermissionStatus): PermissionsStatus {
    return {
      status,
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
      expires: 'never',
    } as unknown as PermissionsStatus;
  }

  const scheduleNotificationAsync: NotificationDeps['scheduleNotificationAsync'] = async (
    request
  ) => {
    scheduleCallCount += 1;
    const identifier = request.identifier ?? generateId();
    store.set(identifier, {
      identifier,
      content: request.content,
      trigger: request.trigger,
    });
    return identifier;
  };

  const cancelScheduledNotificationAsync: NotificationDeps['cancelScheduledNotificationAsync'] =
    async (identifier) => {
      cancelCallCount += 1;
      // 존재하지 않는 id를 지워도 Map.delete는 false만 반환할 뿐 throw 하지 않는다 —
      // 실제 expo-notifications의 no-op 동작과 동일.
      store.delete(identifier);
    };

  const getAllScheduledNotificationsAsync: NotificationDeps['getAllScheduledNotificationsAsync'] =
    async () => {
      return Array.from(store.values()) as unknown as ScheduledNotification[];
    };

  const getPermissionsAsync: NotificationDeps['getPermissionsAsync'] = async () => {
    return buildPermissionsStatus(permissionStatus);
  };

  const requestPermissionsAsync: NotificationDeps['requestPermissionsAsync'] = async () => {
    // iOS는 undetermined 상태에서만 실제 프롬프트를 띄운다 — 이미 거부된 뒤에는 재호출해도
    // 상태가 바뀌지 않는다(02-RESEARCH.md Code Examples §권한 요청).
    if (permissionStatus === 'undetermined') {
      permissionStatus = 'granted';
    }
    return buildPermissionsStatus(permissionStatus);
  };

  return {
    scheduleNotificationAsync,
    cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    __setPermission(status) {
      permissionStatus = status;
    },
    __seed(identifiers) {
      // 자가진단 테스트가 "재생성 호출 횟수"를 정확히 셀 수 있어야 하므로, __seed는
      // scheduleCallCount를 증가시키지 않는다 — 이건 스케줄 API 호출이 아니라 테스트
      // 픽스처 준비 헬퍼다.
      for (const identifier of identifiers) {
        store.set(identifier, { identifier, content: {}, trigger: null });
      }
    },
    __ids() {
      return Array.from(store.keys());
    },
    __scheduleCallCount() {
      return scheduleCallCount;
    },
    __cancelCallCount() {
      return cancelCallCount;
    },
  };
}
