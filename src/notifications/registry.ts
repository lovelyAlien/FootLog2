// src/notifications/registry.ts
// Plan 02-05 — 자가진단 레지스트리: [{id, kind, isEnabled, recreate}] 배열 + selfHeal +
// 포그라운드 오케스트레이터.
//
// D-07(관찰 창구 원칙): 자가진단의 관찰 창구는 개발 빌드 콘솔 로그뿐이며, 사용자 대면 UI
// 신호(배너/토스트/뱃지)를 만들지 않는다 — "조용히 재생성" 원칙. 이 함수는
// src/app/_layout.tsx의 단일 AppState 리스너에서만 호출해야 하며(Plan 07이 배선),
// migrations.ts의 "onInit에서만 호출한다"는 배선 규칙과 동일하게 다른 곳에서 중복
// 호출하면 안 된다.
import {
  ALL_MANAGED_IDS,
  CHECKIN_HOURLY_ID,
  DAILY_REFLECTION_ID,
  expectedCheckinIds,
  expectedNotificationIds,
  scheduleById,
} from './scheduling';
import { fetchNotificationPermission } from './permissions';
import { PHASE2_NOTIFICATION_SETTINGS } from './config';
import { defaultNotificationDeps } from './deps';
import type { NotificationDeps, NotificationSettings } from './config';

export type NotificationKind = 'checkin' | 'daily_reflection';

export type RegistryEntry = {
  id: string;
  kind: NotificationKind;
  isEnabled: () => boolean;
  recreate: (deps: NotificationDeps) => Promise<void>;
};

export type SelfHealReport = {
  missing: string[];
  recreated: string[];
  skippedDisabled: string[];
  orphaned: string[];
  cancelled: string[];
};

// 레지스트리는 "현재 켜져 있어야 하는 것"만이 아니라 "이 앱이 관리하는 트리거 전부"를
// 항목으로 갖고, 각 항목의 isEnabled()가 현재 설정을 보고 판정한다.
export function buildNotificationRegistry(settings: NotificationSettings): RegistryEntry[] {
  const checkinIds =
    settings.checkinFrequency === 'off'
      ? // 체크인 후보가 0개로 사라지는 대신 CHECKIN_HOURLY_ID 하나를 비활성 상태 항목으로
        // 남긴다 — 자가진단 리포트가 "체크인 알림은 꺼져 있어서 건너뜀"을 표현하려면
        // 항목이 0개가 아니라 비활성 1개여야 한다(Test 3/8 계약).
        [CHECKIN_HOURLY_ID]
      : expectedCheckinIds(settings.checkinFrequency);

  const checkinEntries: RegistryEntry[] = checkinIds.map((id) => ({
    id,
    kind: 'checkin',
    isEnabled: () => settings.checkinFrequency !== 'off',
    // recreate는 Plan 03의 scheduleById에 그대로 위임한다 — 트리거 형태/문구를 이
    // 파일에서 다시 정의하지 않는다.
    recreate: (deps: NotificationDeps) => scheduleById(id, deps),
  }));

  const reflectionEntry: RegistryEntry = {
    id: DAILY_REFLECTION_ID,
    kind: 'daily_reflection',
    isEnabled: () => settings.dailyReflectionEnabled,
    recreate: (deps: NotificationDeps) => scheduleById(DAILY_REFLECTION_ID, deps),
  };

  return [...checkinEntries, reflectionEntry];
}

// migrations.ts의 형태를 그대로 따른다: (1) 라이브 상태 조회 → (2) 델타 계산 →
// (3) 델타만 적용. 이 함수 자체는 로깅하지 않는다 — 로깅은 오케스트레이터
// (runForegroundNotificationCheck)의 책임이다(순수한 판정 함수로 남겨 테스트가 콘솔을
// 신경 쓰지 않게 한다).
export async function selfHeal(
  settings: NotificationSettings,
  deps: NotificationDeps
): Promise<SelfHealReport> {
  // (1) 라이브 상태를 먼저 읽는다.
  const actual = await deps.getAllScheduledNotificationsAsync();
  const actualIds = new Set(actual.map((n) => n.identifier));

  const registry = buildNotificationRegistry(settings);

  const missing: string[] = [];
  const skippedDisabled: string[] = [];

  // (2) 레지스트리를 순회하며 판정한다. isEnabled()가 false인 항목은 skippedDisabled에
  // 담고 재생성하지 않는다 — 이 가드가 없으면 사용자가 끈 알림이 조용히 부활한다
  // (Pitfall 2, T-02-12 — 사용자 의도를 코드가 뒤집는 권한 상승 취급).
  // 단일 id 존재 확인이 아니라 항목 전체 순회 = 집합 단위 판정이다(Pitfall 3).
  for (const entry of registry) {
    if (!entry.isEnabled()) {
      skippedDisabled.push(entry.id);
      continue;
    }
    if (!actualIds.has(entry.id)) {
      missing.push(entry.id);
    }
  }

  // 고아 계산: 실제 등록된 것 중 이 앱이 관리하는 우주(ALL_MANAGED_IDS)에는 속하지만
  // 현재 설정의 기대 집합(expectedNotificationIds)에는 없는 id. ALL_MANAGED_IDS 조건이
  // 앱 소유가 아닌 알림을 취소하지 않게 막는 가드다(Pitfall 4 + 불가침 규칙, T-02-13).
  const managedSet = new Set(ALL_MANAGED_IDS);
  const expected = new Set(expectedNotificationIds(settings));
  const orphaned = [...actualIds].filter((id) => managedSet.has(id) && !expected.has(id));

  // (3) 델타만 적용한다. 취소를 먼저 수행해 빈도 전환 중 이전 빈도 트리거가 고아로
  // 남지 않게 한다(scheduling.ts의 applyNotificationSettings와 동일한 순서 규약).
  const cancelled: string[] = [];
  for (const id of orphaned) {
    await deps.cancelScheduledNotificationAsync(id);
    cancelled.push(id);
  }

  const recreated: string[] = [];
  for (const id of missing) {
    const entry = registry.find((e) => e.id === id);
    if (!entry) continue;
    await entry.recreate(deps);
    recreated.push(id);
  }

  return { missing, recreated, skippedDisabled, orphaned, cancelled };
}

// 02-RESEARCH.md System Architecture Diagram의 순서를 그대로 따른다: 권한 확인 →
// 자가진단 → (재생성/취소가 있었을 때만) 콘솔 로그.
export async function runForegroundNotificationCheck(
  settings: NotificationSettings = PHASE2_NOTIFICATION_SETTINGS,
  deps: NotificationDeps = defaultNotificationDeps
): Promise<SelfHealReport | null> {
  const permission = await fetchNotificationPermission(deps);
  // 권한이 없으면 스케줄해도 발화하지 않으므로 자가진단 자체를 건너뛴다(early-return
  // 가드절, migrations.ts와 동일한 형태). Denial of Service 방지(T-02-14)의 일부 —
  // 미승인 상태에서 반복 호출해도 아무 부작용이 없다.
  if (!permission.granted) {
    return null;
  }

  const report = await selfHeal(settings, deps);

  // D-07: 관찰 창구는 개발 빌드 콘솔 로그뿐이며 사용자 대면 UI 신호(배너/토스트/뱃지)를
  // 만들지 않는다 — "조용히 재생성" 원칙. 재생성/취소가 실제로 발생했을 때만 로그를
  // 남겨 정상 경로에서는 로그 노이즈가 없게 한다(T-02-15 — 로그 내용은 identifier
  // 문자열뿐, 위치/메모/회고 등 사용자 데이터를 포함하지 않는다).
  if (report.recreated.length > 0 || report.cancelled.length > 0) {
    console.log(
      `[notifications] self-heal: recreated=${JSON.stringify(report.recreated)} cancelled=${JSON.stringify(report.cancelled)}`
    );
  }

  return report;
}
