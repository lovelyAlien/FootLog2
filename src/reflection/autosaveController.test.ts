/**
 * @jest-environment node
 */
// src/reflection/autosaveController.test.ts
// 07-02-PLAN.md Task 2 (RED) — createAutosaveController 디바운스/즉시 flush/중복 저장
// 방지/타이머 정리 8개 behavior를 fake timers로 검증한다
// (pendingDelete.test.ts의 beforeEach/afterEach 타이머 복구 관용구 그대로).
import {
  createAutosaveController,
  REFLECTION_AUTOSAVE_DEBOUNCE_MS,
} from './autosaveController';
import type { ReflectionDraft } from './autosaveController';

function makeDraft(overrides: Partial<ReflectionDraft> = {}): ReflectionDraft {
  return {
    dateKey: '2026-09-02',
    id: 'reflection-1',
    newPlaceAnswer: '남산',
    freeReflection: '좋은 하루였다',
    ...overrides,
  };
}

describe('createAutosaveController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('notify(draft) 후 REFLECTION_AUTOSAVE_DEBOUNCE_MS가 지나면 onSave가 정확히 1회, 그 draft로 호출된다', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    jest.advanceTimersByTime(REFLECTION_AUTOSAVE_DEBOUNCE_MS);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(makeDraft());
  });

  it('4999ms 시점에는 onSave가 아직 호출되지 않는다', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    jest.advanceTimersByTime(4999);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('notify를 연속 3회 호출한 뒤 5000ms가 지나면 onSave는 1회만, 마지막 draft로 호출된다(타이머 리셋)', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft({ freeReflection: '첫 번째' }));
    controller.notify(makeDraft({ freeReflection: '두 번째' }));
    controller.notify(makeDraft({ freeReflection: '세 번째' }));
    jest.advanceTimersByTime(REFLECTION_AUTOSAVE_DEBOUNCE_MS);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(makeDraft({ freeReflection: '세 번째' }));
  });

  it('notify 후 즉시 flush()를 부르면 타이머 만료를 기다리지 않고 onSave가 1회 호출되고, 이후 5000ms가 더 지나도 추가 호출이 없다', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    controller.flush();

    expect(onSave).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REFLECTION_AUTOSAVE_DEBOUNCE_MS);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('notify 없이 flush()를 부르면 onSave가 호출되지 않는다(no-op)', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.flush();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('flush() 후 아무 notify 없이 flush()를 또 부르면 onSave가 추가로 호출되지 않는다(같은 draft 중복 저장 방지)', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    controller.flush();
    controller.flush();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('notify 후 dispose()를 부르면 onSave가 호출되지 않고(취소), 이후 5000ms가 지나도 호출되지 않는다', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    controller.dispose();
    jest.advanceTimersByTime(REFLECTION_AUTOSAVE_DEBOUNCE_MS);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('debounceMs 인자를 넘기면 그 값이 사용된다', () => {
    const onSave = jest.fn();
    const controller = createAutosaveController({ onSave, debounceMs: 1000 });

    controller.notify(makeDraft());
    jest.advanceTimersByTime(999);
    expect(onSave).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('REFLECTION_AUTOSAVE_DEBOUNCE_MS가 정확히 5000이다', () => {
    expect(REFLECTION_AUTOSAVE_DEBOUNCE_MS).toBe(5000);
  });

  // 코드 리뷰 발견(#2) 회귀 가드 — flush()가 onSave의 성공/실패 결과를 그대로
  // Promise<boolean>으로 돌려줘야, 호출자(모달 닫기 핸들러)가 저장 실패 시 화면을
  // 이미 떠나기 전에 그 사실을 알 수 있다.
  it('notify 후 flush()를 부르면 onSave가 resolve한 값을 그대로 반환한다(성공)', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    await expect(controller.flush()).resolves.toBe(true);
  });

  it('notify 후 flush()를 부르면 onSave가 resolve한 값을 그대로 반환한다(실패)', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const controller = createAutosaveController({ onSave });

    controller.notify(makeDraft());
    await expect(controller.flush()).resolves.toBe(false);
  });

  it('notify 없이 flush()를 부르면 대기 중인 draft가 없으므로 즉시 true를 반환한다(onSave 미호출)', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const controller = createAutosaveController({ onSave });

    await expect(controller.flush()).resolves.toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });
});
