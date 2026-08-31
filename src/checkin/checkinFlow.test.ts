/**
 * @jest-environment node
 */
// src/checkin/checkinFlow.test.ts
// 03-08-PLAN.md Task 1 — checkinReducer 순수 상태 머신 전이 계약.
import {
  initialCheckinState,
  checkinReducer,
  canEditNoteAndPhoto,
  CHECKIN_COPY,
} from './checkinFlow';
import type { ResolvedLocation } from './location';

const gpsAutoLocation: ResolvedLocation = {
  lat: 37.5,
  lng: 127.0,
  accuracyMeters: 10,
  locationSource: 'gps_auto',
};

describe('initialCheckinState', () => {
  it('Test 1: phase가 IDLE이고 pin이 null이다', () => {
    expect(initialCheckinState.phase).toBe('IDLE');
    expect(initialCheckinState.pin).toBeNull();
  });
});

describe('checkinReducer 전이', () => {
  it('Test 2: TAP_CHECKIN이 IDLE → CAPTURING으로 전이시킨다', () => {
    const next = checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' });
    expect(next.phase).toBe('CAPTURING');
  });

  it('Test 3: CAPTURE_RESOLVED가 CAPTURING → CONFIRM으로 전이시키고 pin을 채운다', () => {
    const capturing = checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' });
    const next = checkinReducer(capturing, {
      type: 'CAPTURE_RESOLVED',
      location: gpsAutoLocation,
    });
    expect(next.phase).toBe('CONFIRM');
    expect(next.pin).toEqual(gpsAutoLocation);
  });

  it('Test 4: DRAG_PIN이 CONFIRM 상태에서 locationSource를 gps_dragged로 바꾸고 phase는 유지한다', () => {
    const confirm = checkinReducer(
      checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' }),
      { type: 'CAPTURE_RESOLVED', location: gpsAutoLocation }
    );
    const next = checkinReducer(confirm, { type: 'DRAG_PIN', lat: 1, lng: 2 });
    expect(next.phase).toBe('CONFIRM');
    expect(next.pin?.locationSource).toBe('gps_dragged');
    expect(next.pin?.lat).toBe(1);
    expect(next.pin?.lng).toBe(2);
  });

  it('Test 5: TAP_CONFIRM이 CONFIRM → SAVING으로 전이시킨다', () => {
    const confirm = checkinReducer(
      checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' }),
      { type: 'CAPTURE_RESOLVED', location: gpsAutoLocation }
    );
    const next = checkinReducer(confirm, { type: 'TAP_CONFIRM' });
    expect(next.phase).toBe('SAVING');
  });

  it('Test 6: SAVE_SUCCEEDED가 SAVING → SAVED로 전이시키고 checkinId를 채운다', () => {
    const saving = checkinReducer(
      checkinReducer(
        checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' }),
        { type: 'CAPTURE_RESOLVED', location: gpsAutoLocation }
      ),
      { type: 'TAP_CONFIRM' }
    );
    const next = checkinReducer(saving, { type: 'SAVE_SUCCEEDED', id: 'abc-123' });
    expect(next.phase).toBe('SAVED');
    expect(next.checkinId).toBe('abc-123');
  });

  it('Test 7: SAVE_FAILED가 SAVING → SAVE_FAILED로 전이시킨다', () => {
    const saving = checkinReducer(
      checkinReducer(
        checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' }),
        { type: 'CAPTURE_RESOLVED', location: gpsAutoLocation }
      ),
      { type: 'TAP_CONFIRM' }
    );
    const next = checkinReducer(saving, { type: 'SAVE_FAILED' });
    expect(next.phase).toBe('SAVE_FAILED');
  });

  it('Test 8: TAP_RETRY가 SAVE_FAILED → SAVING으로 전이시킨다', () => {
    const saveFailed = checkinReducer(
      checkinReducer(
        checkinReducer(
          checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' }),
          { type: 'CAPTURE_RESOLVED', location: gpsAutoLocation }
        ),
        { type: 'TAP_CONFIRM' }
      ),
      { type: 'SAVE_FAILED' }
    );
    const next = checkinReducer(saveFailed, { type: 'TAP_RETRY' });
    expect(next.phase).toBe('SAVING');
  });

  it('Test 9: RESTORE_DRAFT가 IDLE → CONFIRM으로 직접 전이시키고 드래프트 좌표를 pin에 채운다', () => {
    const next = checkinReducer(initialCheckinState, {
      type: 'RESTORE_DRAFT',
      location: gpsAutoLocation,
    });
    expect(next.phase).toBe('CONFIRM');
    expect(next.pin).toEqual(gpsAutoLocation);
  });

  it('Test 10: 정의되지 않은 전이(IDLE에서 TAP_CONFIRM)는 상태를 변경하지 않는다', () => {
    const next = checkinReducer(initialCheckinState, { type: 'TAP_CONFIRM' });
    expect(next).toEqual(initialCheckinState);
  });

  it('Test 11: 리듀서는 입력 state 객체를 변형하지 않고 새 객체를 반환한다', () => {
    const before = { ...initialCheckinState };
    const next = checkinReducer(initialCheckinState, { type: 'TAP_CHECKIN' });
    expect(initialCheckinState).toEqual(before);
    expect(next).not.toBe(initialCheckinState);
  });
});

describe('canEditNoteAndPhoto', () => {
  it('Test 12: phase가 SAVED일 때만 true를 반환한다', () => {
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'SAVED' })).toBe(true);
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'SAVING' })).toBe(false);
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'SAVE_FAILED' })).toBe(false);
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'CONFIRM' })).toBe(false);
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'IDLE' })).toBe(false);
    expect(canEditNoteAndPhoto({ ...initialCheckinState, phase: 'CAPTURING' })).toBe(false);
  });
});

describe('CHECKIN_COPY 확정 문구', () => {
  it('Test 13: 03-UI-SPEC.md 확정 문구 12종을 그대로 담는다', () => {
    expect(CHECKIN_COPY.checkinCta).toBe('체크인');
    expect(CHECKIN_COPY.pinHint).toBe('핀을 옮겨 위치를 조정할 수 있어요');
    expect(CHECKIN_COPY.confirmCta).toBe('확인');
    expect(CHECKIN_COPY.savedHeadline).toBe('저장 완료');
    expect(CHECKIN_COPY.saveFailedHeadline).toBe('저장하지 못했어요');
    expect(CHECKIN_COPY.saveFailedHelper).toBe('저장 공간을 확인해주세요');
    expect(CHECKIN_COPY.retryCta).toBe('다시 시도');
    expect(CHECKIN_COPY.notePlaceholder).toBe('지금 여기서 뭘 하고 있나요?');
    expect(CHECKIN_COPY.photoPlaceholderLabel).toBe('사진 추가');
    expect(CHECKIN_COPY.photoFailed).toBe('사진을 추가하지 못했어요');
    expect(CHECKIN_COPY.unsavedExitAlert).toBe('이 체크인은 저장되지 않았어요');
    expect(CHECKIN_COPY.unsavedExitAlertButton).toBe('확인');
  });
});
