/**
 * @jest-environment node
 */
// src/today/pendingDelete.test.ts
// 05-05-PLAN.md Task 1 — createPendingDeleteController 순수 로직 검증(8개 동작 케이스).
import { createPendingDeleteController, UNDO_WINDOW_MS } from './pendingDelete';
import type { PendingDeleteItem } from './pendingDelete';

function makeItem(id: string): PendingDeleteItem {
  return { id, photoPath: null };
}

describe('createPendingDeleteController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('request 후 delayMs 경과 시 onCommit이 정확히 1회 호출된다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    controller.request(makeItem('a'));
    jest.advanceTimersByTime(UNDO_WINDOW_MS);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(makeItem('a'));
  });

  it('request 후 undo() 하면 타이머가 만료돼도 onCommit이 호출되지 않는다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    controller.request(makeItem('a'));
    controller.undo();
    jest.advanceTimersByTime(UNDO_WINDOW_MS);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('request(a) 직후 request(b) 하면 a가 즉시 커밋되고(단일 스낵바 원칙) b만 대기 상태로 남는다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    controller.request(makeItem('a'));
    controller.request(makeItem('b'));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(makeItem('a'));

    jest.advanceTimersByTime(UNDO_WINDOW_MS);

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenLastCalledWith(makeItem('b'));
  });

  it('request 후 dispose() 하면 onCommit이 즉시 호출된다 — 타이머 만료가 아니라 즉시 확정', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    controller.request(makeItem('a'));
    // advanceTimersByTime 없이도 dispose() 시점에 즉시 onCommit이 불려야 한다.
    controller.dispose();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(makeItem('a'));
  });

  it('dispose()를 대기 항목 없이 호출해도 onCommit이 호출되지 않는다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    expect(() => controller.dispose()).not.toThrow();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('undo()를 대기 항목 없이 호출해도 throw하지 않는다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    expect(() => controller.undo()).not.toThrow();
  });

  it('onChange(pendingId | null)가 대기 상태 진입/해제 시마다 호출된다', () => {
    const onCommit = jest.fn();
    const onChange = jest.fn();
    const controller = createPendingDeleteController({ onCommit, onChange });

    controller.request(makeItem('a'));
    expect(onChange).toHaveBeenLastCalledWith('a');

    controller.undo();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('UNDO_WINDOW_MS가 정확히 4000이다', () => {
    expect(UNDO_WINDOW_MS).toBe(4000);
  });
});
