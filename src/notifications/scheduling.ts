// src/notifications/scheduling.ts
// Plan 02-03 Task 1 (RED stub) — 함수 시그니처만 존재, 본문은 미구현.
// GREEN 구현은 Task 2에서 채운다.
import type { NotificationDeps, NotificationFrequency, NotificationSettings } from './config';

export const CHECKIN_HOURLY_ID = 'checkin-hourly';
export const EVERY_3H_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
export const DAILY_REFLECTION_ID = 'daily_reflection';

export function checkin3hId(hour: number): string {
  throw new Error('not implemented');
}

export function expectedCheckinIds(frequency: NotificationFrequency): string[] {
  throw new Error('not implemented');
}

export function expectedNotificationIds(settings: NotificationSettings): string[] {
  throw new Error('not implemented');
}

export const ALL_MANAGED_IDS: readonly string[] = [];

export async function scheduleById(id: string, deps: NotificationDeps): Promise<void> {
  throw new Error('not implemented');
}

export async function applyNotificationSettings(
  settings: NotificationSettings,
  deps: NotificationDeps
): Promise<void> {
  throw new Error('not implemented');
}
