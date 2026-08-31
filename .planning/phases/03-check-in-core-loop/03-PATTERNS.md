# Phase 3: Check-in Core Loop - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 20 (신규 16, 기존 확장 4)
**Analogs found:** 20 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/checkin/config.ts` | config | request-response | `src/notifications/config.ts` | exact |
| `src/checkin/deps.ts` | provider (DI) | request-response | `src/notifications/deps.ts` | exact |
| `src/checkin/location.ts` | service | event-driven (race/timeout) | `src/notifications/scheduling.ts` (구조) + RESEARCH.md Pattern 2 (신규 로직) | role-match |
| `src/checkin/permissions.ts` | service/hook | request-response | `src/notifications/permissions.ts` | exact |
| `src/checkin/photos.ts` | service | file-I/O | RESEARCH.md Code Examples (신규 로직, 직접 analog 없음) | no-analog |
| `src/checkin/checkinRepo.ts` | model/repository | CRUD (insert + retry) | `src/notifications/scheduling.ts`(`applyNotificationSettings`의 "읽고→델타→적용" 구조) + `src/db/migrations.ts`(가드절 스타일) | role-match |
| `src/checkin/draftRepo.ts` | model/repository | CRUD (single-row upsert) | `src/db/migrations.ts` (SQL 실행 관례) + RESEARCH.md Pattern 4 (스키마안) | role-match |
| `src/checkin/testing/fakeLocation.ts` | test double | request-response | `src/notifications/testing/fakeNotifications.ts` | exact |
| `src/checkin/testing/fakeImagePicker.ts` | test double | file-I/O | `src/notifications/testing/fakeNotifications.ts` | role-match |
| `src/checkin/location.test.ts` | test | unit | `src/notifications/permissions.test.ts` | exact |
| `src/checkin/checkinRepo.test.ts` | test | unit (node:sqlite) | `src/db/migrations.test.ts` | exact |
| `src/checkin/draftRepo.test.ts` | test | unit (node:sqlite) | `src/db/migrations.test.ts` | exact |
| `src/checkin/permissions.test.ts` | test | unit | `src/notifications/permissions.test.ts` | exact |
| `src/components/LocationDeniedBanner.tsx` | component | request-response | `src/components/NotificationDeniedBanner.tsx` | exact |
| `src/db/schema.ts` (확장 — `CREATE_DRAFTS_TABLE_SQL`) | model/DDL | CRUD | 기존 `src/db/schema.ts`의 `CREATE_CHECKINS_TABLE_SQL` | exact |
| `src/db/migrations.ts` (확장 — `currentDbVersion === 1` 분기) | migration | batch | 기존 `src/db/migrations.ts`의 `currentDbVersion === 0` 분기 | exact |
| `src/db/migrations.test.ts` (확장) | test | unit | 기존 파일의 Test 1/2 패턴 | exact |
| `src/app/_layout.tsx` (수정 없음 또는 최소 수정) | provider/root | request-response | 기존 `SQLiteProvider onInit={migrateDbIfNeeded}` 배선 | exact (재사용, 변경 불필요) |
| `src/app/index.tsx` 또는 신규 체크인 화면 (D-06 최소 지도 화면) | screen/component | event-driven | `src/app/index.tsx` (배너 배치, isMounted 가드) + `src/app/priming.tsx` (버튼/상태 전이) | role-match |
| 확인 핀 액션 카드 컴포넌트(SAVING/SAVED/SAVE_FAILED) | component | event-driven (state machine) | `src/app/priming.tsx` (버튼 스타일/accent 미사용 규약) | role-match |

## Pattern Assignments

### `src/checkin/config.ts` (config, request-response)

**Analog:** `src/notifications/config.ts`

**Full pattern to copy verbatim (구조만, 값은 신규):**
```typescript
// src/notifications/config.ts:1-27
// 런타임 import를 두지 않는다 — expo-notifications는 타입 전용 import로만 참조한다.
import type * as Notifications from 'expo-notifications';

export type NotificationDeps = Pick<
  typeof Notifications,
  | 'scheduleNotificationAsync'
  | 'cancelScheduledNotificationAsync'
  | 'getAllScheduledNotificationsAsync'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
>;
```

**Phase 3 적용 (03-RESEARCH.md Pattern 1이 이미 지정한 형태):**
```typescript
// src/checkin/config.ts
import type * as Location from 'expo-location';
import type * as ImagePicker from 'expo-image-picker';

export type LocationDeps = Pick<
  typeof Location,
  | 'getForegroundPermissionsAsync'
  | 'requestForegroundPermissionsAsync'
  | 'getCurrentPositionAsync'
  | 'getLastKnownPositionAsync'
>;

export type ImagePickerDeps = Pick<
  typeof ImagePicker,
  'launchCameraAsync' | 'launchImageLibraryAsync' | 'requestCameraPermissionsAsync' | 'requestMediaLibraryPermissionsAsync'
>;
```
`expo-file-system`(`File`/`Directory`/`Paths`)과 `expo-crypto`(`randomUUID`)도 동일하게 `Pick`/타입 전용 형태로 `config.ts`에 추가한다 — RESEARCH.md Pattern 1의 "새 패턴을 발명하지 말 것" 지시를 그대로 따른다.

---

### `src/checkin/deps.ts` (provider/DI, request-response)

**Analog:** `src/notifications/deps.ts`

**Core pattern (lines 1-15, 그대로 복제할 구조):**
```typescript
// src/notifications/deps.ts
// 계약: 이 파일이 src/notifications/ 안에서 'expo-notifications'를 런타임 import 하는
// 유일한 파일이다.
import * as Notifications from 'expo-notifications';
import type { NotificationDeps } from './config';

export const defaultNotificationDeps: NotificationDeps = {
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync,
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: Notifications.getAllScheduledNotificationsAsync,
  getPermissionsAsync: Notifications.getPermissionsAsync,
  requestPermissionsAsync: Notifications.requestPermissionsAsync,
};
```
**적용 규칙:** `src/checkin/deps.ts`가 `expo-location`/`expo-image-picker`/`expo-file-system`/`expo-crypto`를 런타임 import하는 **유일한 파일**이 된다. `location.ts`/`photos.ts`/`checkinRepo.ts`/`draftRepo.ts`는 절대 이 4개 패키지를 직접 import하지 않는다 — `deps.ts`가 조립한 `defaultLocationDeps`/`defaultImagePickerDeps` 등을 함수 인자 기본값으로만 받는다.

---

### `src/checkin/location.ts` (service, event-driven)

**Analog:** RESEARCH.md Code Examples(신규 설계) — `src/notifications/permissions.ts`의 가드절/early-return 스타일과 `src/db/migrations.ts`의 "현재 상태 먼저 읽고 → 델타 계산 → 적용" 순서 원칙을 참고.

**Core pattern (5초 race + OS 캐시 + 자체 폴백 체인, 03-RESEARCH.md Code Examples에서 그대로 가져옴):**
```typescript
// src/checkin/location.ts
import type { LocationDeps } from './config';

type CaptureResult =
  | { kind: 'auto'; lat: number; lng: number; accuracyMeters: number | null }
  | { kind: 'timeout_os_cache'; lat: number; lng: number; accuracyMeters: number | null }
  | { kind: 'need_fallback_chain' };

export async function captureWithTimeout(deps: LocationDeps): Promise<CaptureResult> {
  const racePromise = deps.getCurrentPositionAsync({ accuracy: 3 });
  const winner = await Promise.race([
    racePromise.then((pos) => ({ tag: 'gps' as const, pos })),
    new Promise<{ tag: 'timeout' }>((resolve) => setTimeout(() => resolve({ tag: 'timeout' }), 5000)),
  ]);

  if (winner.tag === 'gps') {
    return {
      kind: 'auto',
      lat: winner.pos.coords.latitude,
      lng: winner.pos.coords.longitude,
      accuracyMeters: winner.pos.coords.accuracy,
    };
  }

  racePromise.catch(() => {}); // 지연 응답 흡수 — Pitfall 없는 정리(repo 규약: 프로미스 미삼킴이지만 여기선 의도된 폐기)
  const cached = await deps.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
  if (cached) {
    return {
      kind: 'timeout_os_cache',
      lat: cached.coords.latitude,
      lng: cached.coords.longitude,
      accuracyMeters: cached.coords.accuracy,
    };
  }
  return { kind: 'need_fallback_chain' };
}
```

**중요 — 하지 말 것 (analog에서 배운 반례, Common Pitfall 1):** `getCurrentPositionAsync({ timeout: 5000 })`처럼 SDK에 없는 `timeout` 옵션을 넣지 않는다 — `Promise.race`로 직접 구현.

**Error handling / early-return 패턴 (permissions.ts:47-58 스타일 차용):**
```typescript
// src/notifications/permissions.ts:52-58 — "권한이 undetermined일 때만 실제로 요청한다"는
// 가드절 스타일. location.ts의 "권한 거부 시 OS API를 아예 호출하지 않는다"(Pitfall 3)에
// 동일하게 적용한다.
export async function requestNotificationPermission(deps = defaultNotificationDeps) {
  const current = await fetchNotificationPermission(deps);
  if (current.status !== 'undetermined') {
    return current;
  }
  // ... 실제 요청은 undetermined일 때만
}
```

---

### `src/checkin/permissions.ts` (service/hook, request-response)

**Analog:** `src/notifications/permissions.ts` — **거의 통째로 복제**(위치 권한으로 치환)

**Imports pattern (lines 12-16):**
```typescript
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { LocationDeps } from './config';
import { defaultLocationDeps } from './deps';
```

**PermissionSnapshot + AppStateLike 타입 (lines 18-29, 그대로 재사용):**
```typescript
export type PermissionSnapshot = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

export type AppStateLike = {
  addEventListener(type: 'change', handler: (state: string) => void): { remove(): void };
};
```

**배너 판정 함수 (lines 69-75, 이름만 위치용으로):**
```typescript
// notifications/permissions.ts:73-75
export function shouldShowDeniedBanner(permission: PermissionSnapshot | null): boolean {
  return permission !== null && permission.status === 'denied';
}
```
**차이점 주의(03-RESEARCH.md Pattern 3):** 위치 권한은 iOS에서 "Location Services 전역 꺼짐"과 "앱별 거부"를 구분하지 않는다 — 판정 함수 로직 자체는 그대로 재사용 가능, 배너 문구만 다르다.

**포그라운드 재확인 훅 (lines 100-149, 통째로 복제 + `useLocationPermissionBanner`로 개명):**
```typescript
export function subscribeToForegroundActive(
  handler: () => void,
  appState: AppStateLike = AppState
): () => void {
  const sub = appState.addEventListener('change', (state) => {
    if (state === 'active') handler();
  });
  return () => sub.remove();
}

export function useLocationPermissionBanner(): { showBanner: boolean; openSettings: () => void } {
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const recheck = useCallback((isMounted: () => boolean) => {
    fetchLocationPermission(defaultLocationDeps)
      .then((snapshot) => { if (isMounted()) setPermission(snapshot); })
      .catch((error) => { if (isMounted()) console.error('Failed to fetch location permission', error); });
  }, []);
  useEffect(() => {
    let isMounted = true;
    const isMountedFn = () => isMounted;
    recheck(isMountedFn);
    const unsubscribe = subscribeToForegroundActive(() => recheck(isMountedFn));
    return () => { isMounted = false; unsubscribe(); };
  }, [recheck]);
  return { showBanner: shouldShowDeniedBanner(permission), openSettings: () => Linking.openSettings() };
}
```

---

### `src/checkin/checkinRepo.ts` (model/repository, CRUD + retry)

**Analog:** 직접적 CRUD-insert analog는 코드베이스에 없음(Phase 1/2엔 insert 로직 자체가 없었음) — 구조적 패턴은 `src/notifications/scheduling.ts`의 "읽고 → 델타 계산 → 적용"과 `src/db/migrations.ts`의 가드절 스타일에서 차용. **Common Pitfall 4**(RESEARCH.md)가 이 파일의 설계 계약을 명시적으로 규정함.

**설계 계약(반드시 이 형태를 따를 것, Pitfall 4 원문):**
```typescript
// src/checkin/checkinRepo.ts
// SQL문은 이 파일에만 존재한다 — 화면 컴포넌트에 절대 등장하지 않는다(Pitfall 4).
// 재시도 카운터도 useState가 아니라 이 함수 내부 지역 변수로만 존재한다.
export async function insertCheckinWithRetry(
  db: MigratableDb,
  params: NewCheckinParams
): Promise<{ ok: true; id: string } | { ok: false }> {
  const attempt = () =>
    db.runAsync(
      `INSERT INTO checkins (id, timestamp_utc, local_date_key, timezone_at_capture, lat, lng, accuracy_meters, location_source, created_at, updated_at, schema_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params.id, params.timestampUtc, params.localDateKey, params.timezoneAtCapture,
      params.lat, params.lng, params.accuracyMeters, params.locationSource,
      params.createdAt, params.updatedAt, 1
    );
  try {
    await attempt();
    return { ok: true, id: params.id };
  } catch {
    try {
      await attempt(); // 정확히 1회 자동 재시도 — 범용 backoff 라이브러리 도입 안 함(Don't Hand-Roll)
      return { ok: true, id: params.id };
    } catch {
      return { ok: false };
    }
  }
}
```
**Parameter binding 규칙 (src/db/migrations.ts:41-45 규약 그대로):**
```typescript
// PRAGMA 한 줄만 예외 — 그 외 모든 DML은 반드시 `?` 플레이스홀더 + 파라미터 바인딩.
await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`); // 유일한 문자열 보간 허용 지점
```
**드래프트 삭제 순서 계약 (Pitfall 5 — 절대 순서 위반 금지):** `INSERT INTO checkins`가 성공한 **이후에만** `draftRepo.deleteDraft()`를 호출한다. 두 문장을 한 트랜잭션(`BEGIN`/`COMMIT`)으로 묶는 것을 권장(RESEARCH.md Pitfall 5).

---

### `src/checkin/draftRepo.ts` (model/repository, CRUD single-row)

**Analog:** `src/db/schema.ts`(DDL 스타일) + `src/db/migrations.ts`(SQL 실행 관례) + RESEARCH.md Pattern 4(스키마 설계안, 이 phase의 1차 소스)

**DDL pattern (schema.ts:43-59 구조 그대로, drafts로 치환):**
```sql
-- src/db/schema.ts에 추가할 CREATE_DRAFTS_TABLE_SQL
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY NOT NULL,        -- 항상 'draft' 고정값 (D-04)
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy_meters REAL,
  location_source TEXT NOT NULL,
  local_date_key TEXT NOT NULL,
  timezone_at_capture TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```
**Upsert/delete 규약 (RESEARCH.md Pattern 4):**
```typescript
// INSERT OR REPLACE로 "항상 최대 1개" 시맨틱을 자연스럽게 충족(D-04)
await db.runAsync(
  `INSERT OR REPLACE INTO drafts (id, lat, lng, accuracy_meters, location_source, local_date_key, timezone_at_capture, created_at, updated_at)
   VALUES ('draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
  lat, lng, accuracyMeters, locationSource, localDateKey, timezoneAtCapture, createdAt, updatedAt
);

// 삭제는 반드시 checkins insert 성공 "직후에만"(D-05, Pitfall 5)
await db.runAsync(`DELETE FROM drafts WHERE id = 'draft'`);
```
**만료 판정 (RESEARCH.md Pattern 4, Don't Hand-Roll 표):**
```typescript
// 수동 UTC 오프셋 계산 금지 — Intl 사용
const todayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}).format(new Date());
if (draft.local_date_key !== todayKey) {
  await db.runAsync(`DELETE FROM drafts WHERE id = 'draft'`); // 조용히 버림, 복구 프롬프트 없음
}
```

---

### `src/db/schema.ts` (확장 — model/DDL)

**Analog:** 같은 파일의 기존 `CREATE_CHECKINS_TABLE_SQL`(lines 43-59)

**적용:** `CREATE_DRAFTS_TABLE_SQL` 상수를 같은 파일 하단에 추가(위 draftRepo.ts 섹션 SQL 그대로). `LocationSource` 타입(lines 9-14)을 그대로 재수출해 `drafts.location_source` 컬럼 타입에도 재사용한다 — 새 enum을 발명하지 않는다.

---

### `src/db/migrations.ts` (확장 — migration)

**Analog:** 같은 파일의 기존 `if (currentDbVersion === 0)` 블록(lines 28-34)과 그 아래 확장 안내 주석(lines 36-39)

**Core pattern (RESEARCH.md Code Examples에서 확정된 형태, 그대로 삽입):**
```typescript
// src/db/migrations.ts
if (currentDbVersion === 1) {
  await db.execAsync(CREATE_DRAFTS_TABLE_SQL);
  currentDbVersion = 2;
}
// 기존 `if (currentDbVersion === 0)` 블록은 절대 사후 수정하지 않는다(migration_discipline #2).
```
`DATABASE_VERSION`을 `1` → `2`로 올린다(migrations.ts:16). `CREATE_DRAFTS_TABLE_SQL` import를 파일 상단 import 목록(lines 9-13)에 추가.

---

### `src/db/migrations.test.ts` (확장 — test)

**Analog:** 같은 파일의 Test 1(lines 40-60)/Test 2(lines 62-70) — 테이블 존재 확인 + 컬럼 계약 검증 패턴을 `drafts` 테이블에 복제. `DATABASE_VERSION`이 이제 2가 됨을 검증하는 테스트도 추가.

---

### `src/checkin/testing/fakeLocation.ts` / `fakeImagePicker.ts` (test double)

**Analog:** `src/notifications/testing/fakeNotifications.ts`(통째로)

**Core pattern (lines 17-32, 45-67 구조 그대로):**
```typescript
// 'expo-location'을 전혀 import하지 않는다 — deps.ts가 유일한 런타임 import 지점.
// LocationDeps(타입 전용)에서 Parameters/ReturnType으로 필요한 타입을 유도한다.
import type { LocationDeps } from '../config';

export type FakeLocation = LocationDeps & {
  __setPermission(status: 'granted' | 'denied' | 'undetermined'): void;
  __setPosition(pos: { lat: number; lng: number; accuracyMeters: number } | null): void;
  __setDelayMs(ms: number): void; // 5초 타임아웃 레이스를 테스트에서 결정적으로 재현하기 위함
};

export function createFakeLocation(): FakeLocation {
  // fakeNotifications.ts의 store/permissionStatus 클로저 패턴 그대로 복제
}
```
`fakeImagePicker.ts`는 동일 구조로 `launchCameraAsync`/`launchImageLibraryAsync` 더블을 만든다(카메라 vs 라이브러리 출처 구분 반환값 유지 — Pitfall 6).

---

### `src/checkin/location.test.ts` / `permissions.test.ts` (test, unit)

**Analog:** `src/notifications/permissions.test.ts`(통째로)

**Core pattern (lines 1-17, 32-52):**
```typescript
/**
 * @jest-environment node
 */
// AppStateLike 페이크는 이 파일 안에 인라인으로 정의 — 실제 react-native의 AppState를
// import하지 않는다(node 환경에서 네이티브 바인딩 로드 시 깨짐).
// jest.mock()을 쓰지 않는다 — 모든 의존성이 파라미터 주입.
function createFakeAppState() {
  const handlers: Array<(state: string) => void> = [];
  return {
    addEventListener(type: 'change', handler: (state: string) => void) {
      handlers.push(handler);
      return { remove() { /* ... */ } };
    },
    emit(state: string) { for (const h of [...handlers]) h(state); },
  };
}
```

---

### `src/checkin/checkinRepo.test.ts` / `draftRepo.test.ts` (test, unit — node:sqlite)

**Analog:** `src/db/migrations.test.ts`(통째로) + `src/db/testing/nodeSqliteAdapter.ts`(DB 어댑터 재사용, 신규 작성 불필요)

**Core pattern (migrations.test.ts:1-13, 39-60):**
```typescript
/**
 * @jest-environment node
 */
import { createTestDb } from '../db/testing/nodeSqliteAdapter'; // 재사용 — 새 어댑터 만들지 않음
import { migrateDbIfNeeded } from '../db/migrations';
import { insertCheckinWithRetry } from './checkinRepo';

describe('insertCheckinWithRetry', () => {
  it('성공 시 ok:true와 id를 반환한다', async () => {
    const { db, raw, close } = createTestDb();
    try {
      await migrateDbIfNeeded(db); // drafts/checkins 테이블 모두 이 한 줄로 생성됨
      const result = await insertCheckinWithRetry(db, { /* ... */ });
      expect(result.ok).toBe(true);
    } finally {
      close();
    }
  });
});
```
실패 강제(재시도 검증)에는 `MigratableDb`를 만족하는 fake db 더블(runAsync가 N번째 호출까지 throw)을 인라인으로 만든다 — `createTestDb`의 실제 SQLite는 디스크 풀 등 실패를 인위로 재현하기 어려우므로, 이 테스트만 예외적으로 커스텀 fake를 쓴다.

---

### `src/components/LocationDeniedBanner.tsx` (component, request-response)

**Analog:** `src/components/NotificationDeniedBanner.tsx` (통째로 복제, 문구/훅만 치환)

**Full pattern to copy verbatim (구조):**
```typescript
// src/components/NotificationDeniedBanner.tsx:1-49
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import * as permissions from '../checkin/permissions'; // 치환: ../notifications/permissions → ../checkin/permissions

export function LocationDeniedBanner() {
  const { showBanner, openSettings } = permissions.useLocationPermissionBanner();
  if (!showBanner) return null;
  return (
    <Pressable
      onPress={openSettings}
      accessibilityRole="button"
      accessibilityLabel="위치 권한이 꺼져있어요. 설정에서 켜기"
      style={styles.banner}
    >
      <Text style={[typography.helperText, styles.text]}>위치 권한이 꺼져있어요 · 설정에서 켜기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface, // 불투명 배경 필수 — 지도 위 오버레이라도 opacity/rgba 금지
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  text: { color: colors.textMuted },
});
```
**계약 그대로 계승:** "화면별 로직/위치 지정(absolute positioning)을 내부에 갖지 않는다 — 배치는 항상 부모가 결정한다"(원본 파일 헤더 주석). UI-SPEC이 정한 배치는 `NotificationDeniedBanner` 바로 아래 스택.

---

### 최소 지도 화면 (D-06, `src/app/index.tsx` 대체 또는 신규 라우트)

**Analog:** `src/app/index.tsx`(배너 배치·isMounted 가드·화면 골격) + `src/app/priming.tsx`(버튼 스타일·accent 미사용 규약·상태 전이)

**배너 스택 + isMounted 가드 패턴 (index.tsx:16-48, 77-80):**
```typescript
import { useEffect, useState } from 'react';
import { NotificationDeniedBanner } from '../components/NotificationDeniedBanner';
import { LocationDeniedBanner } from '../components/LocationDeniedBanner';

// ... useEffect로 permission fetch할 때 반드시 isMounted 가드 + .catch(console.error) 규약 유지

return (
  <View style={styles.screen}>
    <NotificationDeniedBanner />
    <LocationDeniedBanner />
    {/* MapView는 이 아래, 전체화면 */}
  </View>
);
```

**버튼 색상/accent 규약 (priming.tsx:11-14 그대로 적용):**
```typescript
// colors.accent는 DESIGN.md가 정확히 6개 용도로 제한 — "확인"/"다시 시도" 버튼은
// accent를 쓰지 않는다(priming.tsx의 "허용하기" 버튼 선례와 동일하게 colors.textPrimary
// 필 버튼 채택). 체크인 알약버튼(진입)만 colors.accent 사용(03-UI-SPEC.md §Color).
const styles = StyleSheet.create({
  confirmButton: {
    minHeight: 44,
    borderRadius: radius.full,
    backgroundColor: colors.textPrimary, // priming.tsx:108과 동일
  },
  confirmButtonLabel: { color: colors.surface },
});
```

**MapView + draggable Marker (RESEARCH.md Pattern 5, 신규 도입 — 코드베이스에 analog 없음):**
```jsx
<MapView style={styles.map} showsUserLocation>
  <Marker
    coordinate={pinCoordinate}
    draggable
    onDragEnd={(e) => {
      setPinCoordinate(e.nativeEvent.coordinate);
      // draftRepo.updateDraftLocation({ ...e.nativeEvent.coordinate, location_source: 'gps_dragged' })
    }}
  />
</MapView>
```
`customMapStyle`(`colors.mapLand/mapRoad/mapWater`)은 Apple Maps(provider 미지정)에서 미지원 — UI-SPEC이 명시적으로 "지도 베이스에 적용하지 말 것"을 확정했으므로 이 3개 토큰은 이 phase에서 사용하지 않는다.

---

## Shared Patterns

### DI 3파일 분리 (config.ts / deps.ts / testing/fake*.ts)
**Source:** `src/notifications/config.ts` + `src/notifications/deps.ts` + `src/notifications/testing/fakeNotifications.ts`
**Apply to:** `src/checkin/config.ts`, `deps.ts`, `location.ts`, `photos.ts`, `permissions.ts`, `checkinRepo.ts`, `draftRepo.ts` 전체
```typescript
// 규칙: config.ts는 타입 전용 import만, deps.ts만 런타임 import, 로직 함수는
// `deps: XxxDeps = defaultXxxDeps` 형태로 주입받는다. 이 규칙을 어기면 @jest-environment
// node 유닛 테스트가 네이티브 모듈을 로드해 깨진다.
```

### 프로미스 미삼킴 규약 (isMounted 가드 + .catch(console.error))
**Source:** `src/app/index.tsx:30-48`, `src/notifications/permissions.ts:120-132`
**Apply to:** 모든 화면 컴포넌트의 useEffect, 모든 서비스 함수의 fire-and-forget 호출부
```typescript
useEffect(() => {
  let isMounted = true;
  someAsyncCall()
    .then((result) => { if (isMounted) setState(result); })
    .catch((error) => { if (isMounted) console.error('...', error); });
  return () => { isMounted = false; };
}, []);
```

### SQL 파라미터 바인딩 (인젝션 방어)
**Source:** `src/db/migrations.ts:41-45` 주석 + `runAsync` 사용 관례
**Apply to:** `checkinRepo.ts`, `draftRepo.ts`의 모든 INSERT/UPDATE/DELETE
```typescript
// PRAGMA user_version 한 줄만 문자열 보간 예외. 그 외 전부 `?` 플레이스홀더 + 바인딩.
await db.runAsync('INSERT INTO checkins (id, lat, lng) VALUES (?, ?, ?)', id, lat, lng);
```

### 마이그레이션 가드절 (기존 버전 블록 불변)
**Source:** `src/db/migrations.ts:24-39`
**Apply to:** `drafts` 테이블 추가 시 반드시 새 `if (currentDbVersion === 1)` 블록만 추가, 기존 `=== 0` 블록 수정 금지

### accent 색상 예산 제한 (6개 승인 용도, 확장 금지)
**Source:** `src/app/priming.tsx:11-14` 주석 + `src/theme/tokens.ts:17`
**Apply to:** 확인/다시 시도 버튼(→ `colors.textPrimary` 필 버튼), 체크인 알약버튼만 accent 사용

### 배너 컴포넌트 계약 (배치는 부모 결정, 내부 위치 지정 없음)
**Source:** `src/components/NotificationDeniedBanner.tsx:4-9`
**Apply to:** `LocationDeniedBanner.tsx`

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/checkin/photos.ts` | service | file-I/O | 코드베이스에 파일 I/O(`documentDirectory` 복사) 선례가 없음 — RESEARCH.md Code Examples(§사진 액션시트 → documentDirectory 복사)의 `pickAndCopyPhoto` 예시를 1차 소스로 사용할 것. DI 3파일 분리 패턴(config/deps)은 여전히 적용 |
| MapView/Marker 렌더링 및 핀 시각 상태 전이 로직 | component | event-driven | `react-native-maps`가 이 phase에서 처음 도입되는 라이브러리라 코드베이스에 지도 렌더링 analog가 전혀 없음 — RESEARCH.md Pattern 5 + 03-UI-SPEC.md "Pin Visual States" 섹션이 1차 소스 |
| 확인 핀 → 저장 상태 전이 카드(CAPTURING/CONFIRM/SAVING/SAVED/SAVE_FAILED state machine) | component | event-driven | 코드베이스에 다단계 상태 카드 UI 선례 없음(priming.tsx는 단일 상태) — 03-UI-SPEC.md "Screen & Component Notes" 상태 전이 표가 1차 소스, 크로스페이드 타이밍은 `motion.saveStateCrossfadeMs`(tokens.ts) 재사용 |

## Metadata

**Analog search scope:** `src/notifications/`, `src/db/`, `src/components/`, `src/app/`, `src/theme/`
**Files scanned:** 20개 소스 파일 + 3개 상위 문서(03-CONTEXT.md, 03-RESEARCH.md, 03-UI-SPEC.md)
**Pattern extraction date:** 2026-08-27
