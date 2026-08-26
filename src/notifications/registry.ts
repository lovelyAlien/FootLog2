// src/notifications/registry.ts
// Plan 02-05 — 자가진단 레지스트리: [{id, kind, isEnabled, recreate}] 배열 + selfHeal +
// 포그라운드 오케스트레이터.
//
// TDD RED 단계 스텁 — 시그니처만 존재하고 본문은 미구현('not implemented'). Task 2에서
// 채운다.
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

export function buildNotificationRegistry(_settings: NotificationSettings): RegistryEntry[] {
  throw new Error('not implemented');
}

export async function selfHeal(
  _settings: NotificationSettings,
  _deps: NotificationDeps
): Promise<SelfHealReport> {
  throw new Error('not implemented');
}

export async function runForegroundNotificationCheck(
  _settings?: NotificationSettings,
  _deps?: NotificationDeps
): Promise<SelfHealReport | null> {
  throw new Error('not implemented');
}
