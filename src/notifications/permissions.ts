// src/notifications/permissions.ts
// Plan 02-04 Task 1 (RED stub) — 시그니처만 존재, 본문은 not implemented.
// GREEN 구현은 Task 2에서 채운다.
import type { NotificationDeps } from './config';

export type PermissionSnapshot = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

export type AppStateLike = {
  addEventListener(type: 'change', handler: (state: string) => void): { remove(): void };
};

export async function fetchNotificationPermission(
  _deps?: NotificationDeps
): Promise<PermissionSnapshot> {
  throw new Error('not implemented');
}

export async function requestNotificationPermission(
  _deps?: NotificationDeps
): Promise<PermissionSnapshot> {
  throw new Error('not implemented');
}

export function shouldShowDeniedBanner(_permission: PermissionSnapshot | null): boolean {
  throw new Error('not implemented');
}

export function shouldShowPriming(_permission: PermissionSnapshot | null): boolean {
  throw new Error('not implemented');
}

export function markPrimingDismissed(): void {
  throw new Error('not implemented');
}

export function resetPrimingSession(): void {
  throw new Error('not implemented');
}

export function subscribeToForegroundActive(
  _handler: () => void,
  _appState?: AppStateLike
): () => void {
  throw new Error('not implemented');
}

export function useNotificationPermissionBanner(): {
  showBanner: boolean;
  openSettings: () => void;
} {
  throw new Error('not implemented');
}
