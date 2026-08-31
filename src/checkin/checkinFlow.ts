// src/checkin/checkinFlow.ts
// 03-08-PLAN.md Task 1 — 체크인 플로우의 상태 머신을 순수 리듀서로 뽑는다.
//
// React를 import하지 않는다 — `useReducer`에 그대로 넣을 수 있는 순수 함수만 제공한다
// (03-RESEARCH.md Architecture Patterns Pattern 1과 동일하게, 화면 컴포넌트의 useState
// 뭉치가 아니라 테스트 가능한 리듀서로 분리해 REQ-checkin-write-failure-ui의 핵심 계약
// "저장 성공 전까지 메모/사진 입력을 막는다"을 자동으로 검증할 수 있게 한다).
import { applyDraggedSource } from './location';
import type { ResolvedLocation } from './location';
import type { PickedPhoto } from './photos';

export type CheckinPhase = 'IDLE' | 'CAPTURING' | 'CONFIRM' | 'SAVING' | 'SAVED' | 'SAVE_FAILED';

export type CheckinState = {
  phase: CheckinPhase;
  pin: ResolvedLocation | null;
  checkinId: string | null;
  photo: PickedPhoto | null;
  photoError: boolean;
  note: string;
};

export type CheckinEvent =
  | { type: 'TAP_CHECKIN' }
  | { type: 'CAPTURE_RESOLVED'; location: ResolvedLocation }
  | { type: 'DRAG_PIN'; lat: number; lng: number }
  | { type: 'TAP_CONFIRM' }
  | { type: 'SAVE_SUCCEEDED'; id: string }
  | { type: 'SAVE_FAILED' }
  | { type: 'TAP_RETRY' }
  | { type: 'RESTORE_DRAFT'; location: ResolvedLocation }
  | { type: 'PHOTO_PICKED'; photo: PickedPhoto }
  | { type: 'PHOTO_FAILED' }
  | { type: 'NOTE_CHANGED'; note: string }
  | { type: 'DISMISS' };

export const initialCheckinState: CheckinState = {
  phase: 'IDLE',
  pin: null,
  checkinId: null,
  photo: null,
  photoError: false,
  note: '',
};

// checkinReducer — 03-UI-SPEC.md §Screen & Component Notes 상태 전이표를 그대로 구현한다.
// 정의되지 않은 (phase, event) 조합은 state를 그대로 반환하는 방어적 no-op이다. 입력
// state 객체를 절대 변형(mutate)하지 않고 항상 새 객체를 반환한다.
export function checkinReducer(state: CheckinState, event: CheckinEvent): CheckinState {
  switch (event.type) {
    case 'TAP_CHECKIN':
      if (state.phase !== 'IDLE') return state;
      return { ...state, phase: 'CAPTURING' };

    case 'CAPTURE_RESOLVED':
      // GPS 캡처가 성공하든 실패(폴백)하든 항상 CONFIRM에 도달한다.
      if (state.phase !== 'CAPTURING') return state;
      return { ...state, phase: 'CONFIRM', pin: event.location };

    case 'DRAG_PIN':
      // 소스 전이 로직을 중복 구현하지 않고 location.ts의 applyDraggedSource에 위임한다.
      if (state.phase !== 'CONFIRM' || !state.pin) return state;
      return { ...state, pin: applyDraggedSource(state.pin, { lat: event.lat, lng: event.lng }) };

    case 'TAP_CONFIRM':
      if (state.phase !== 'CONFIRM') return state;
      return { ...state, phase: 'SAVING' };

    case 'SAVE_SUCCEEDED':
      if (state.phase !== 'SAVING') return state;
      return { ...state, phase: 'SAVED', checkinId: event.id };

    case 'SAVE_FAILED':
      if (state.phase !== 'SAVING') return state;
      return { ...state, phase: 'SAVE_FAILED' };

    case 'TAP_RETRY':
      if (state.phase !== 'SAVE_FAILED') return state;
      return { ...state, phase: 'SAVING' };

    case 'RESTORE_DRAFT':
      // D-05 복구 경로 — 저장 실패 중 강제종료도 별도 상태 플래그 없이 이 경로로
      // 통합 커버된다(IDLE → CONFIRM 직접 전이, 드래프트 좌표를 pin에 채움).
      if (state.phase !== 'IDLE') return state;
      return { ...state, phase: 'CONFIRM', pin: event.location };

    case 'PHOTO_PICKED':
      // WR-02 리뷰 대응 — "정의되지 않은 전이는 no-op" 방어를 이 세 케이스에도
      // 적용해, canEditNoteAndPhoto와 동치인 SAVED 가드를 리듀서 자신이 강제한다
      // (호출부 가드에만 의존하지 않는 defense-in-depth).
      if (state.phase !== 'SAVED') return state;
      return { ...state, photo: event.photo, photoError: false };

    case 'PHOTO_FAILED':
      if (state.phase !== 'SAVED') return state;
      return { ...state, photoError: true };

    case 'NOTE_CHANGED':
      if (state.phase !== 'SAVED') return state;
      return { ...state, note: event.note };

    case 'DISMISS':
      return initialCheckinState;

    default:
      return state;
  }
}

// canEditNoteAndPhoto — "저장 성공 전까지 메모/사진 입력을 막는다"(REQ-checkin-write-failure-ui)의
// 단일 판정 지점. 이 함수가 false를 반환하는 모든 phase에서 메모/사진 입력 JSX는
// 비활성화가 아니라 미마운트되어야 한다(03-UI-SPEC.md 확정 계약).
export function canEditNoteAndPhoto(state: CheckinState): boolean {
  return state.phase === 'SAVED';
}

// CHECKIN_COPY — 03-UI-SPEC.md §Copywriting Contract의 확정 문구를 담은 단일 출처
// 상수(src/notifications/content.ts와 동일 규약). 여기서 문구를 발명하지 않는다 —
// 출처는 03-UI-SPEC.md.
export const CHECKIN_COPY = {
  checkinCta: '체크인',
  pinHint: '핀을 옮겨 위치를 조정할 수 있어요',
  confirmCta: '확인',
  savedHeadline: '저장 완료',
  saveFailedHeadline: '저장하지 못했어요',
  saveFailedHelper: '저장 공간을 확인해주세요',
  retryCta: '다시 시도',
  notePlaceholder: '지금 여기서 뭘 하고 있나요?',
  photoPlaceholderLabel: '사진 추가',
  photoFailed: '사진을 추가하지 못했어요',
  completeCta: '완료',
  unsavedExitAlert: '이 체크인은 저장되지 않았어요',
  unsavedExitAlertButton: '확인',
} as const;
