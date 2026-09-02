/**
 * @jest-environment node
 */
// src/calendar/monthGrid.test.ts
// 06-02-PLAN.md Task 2 (RED) — 일요일 시작 월 그리드 산수 + date key 검증 계약.
// localDate.test.ts와 동일하게 @jest-environment node 헤더를 써서 네이티브 모듈 없이
// 순수 함수만 로드/검증한다.

import {
  buildMonthGrid,
  formatDateKeyTitle,
  formatMonthHeader,
  isValidLocalDateKey,
  monthRangeBounds,
  shiftMonth,
  WEEKDAY_COUNT,
  yearMonthOf,
} from './monthGrid';

describe('buildMonthGrid', () => {
  it('길이는 7의 배수이며(35 또는 42), 첫 셀의 요일은 일요일이다(D-06)', () => {
    const grid = buildMonthGrid({ year: 2026, month: 9 });
    expect(grid.length % WEEKDAY_COUNT).toBe(0);
    expect([35, 42]).toContain(grid.length);

    const firstCellDate = new Date(`${grid[0].dateKey}T00:00:00Z`);
    expect(firstCellDate.getUTCDay()).toBe(0);
  });

  it('2026년 9월(1일이 화요일) 그리드: 인덱스 0,1은 8월 말일 채움(inCurrentMonth:false), 인덱스 2는 9월 1일이다', () => {
    const grid = buildMonthGrid({ year: 2026, month: 9 });

    expect(grid[0].inCurrentMonth).toBe(false);
    expect(grid[1].inCurrentMonth).toBe(false);
    expect(grid[2]).toEqual({
      dateKey: '2026-09-01',
      dayOfMonth: 1,
      inCurrentMonth: true,
    });
  });

  it('inCurrentMonth:true인 셀 수가 그 달의 실제 일수와 같다 (9월 30일)', () => {
    const grid = buildMonthGrid({ year: 2026, month: 9 });
    const inMonthCount = grid.filter((c) => c.inCurrentMonth).length;
    expect(inMonthCount).toBe(30);
  });

  it('inCurrentMonth:true인 셀 수가 그 달의 실제 일수와 같다 (2026년 2월, 윤년 아님, 28일)', () => {
    const grid = buildMonthGrid({ year: 2026, month: 2 });
    const inMonthCount = grid.filter((c) => c.inCurrentMonth).length;
    expect(inMonthCount).toBe(28);
  });

  it('inCurrentMonth:true인 셀 수가 그 달의 실제 일수와 같다 (2028년 2월, 윤년, 29일)', () => {
    const grid = buildMonthGrid({ year: 2028, month: 2 });
    const inMonthCount = grid.filter((c) => c.inCurrentMonth).length;
    expect(inMonthCount).toBe(29);
  });

  it('모든 셀의 dateKey가 YYYY-MM-DD 형식이고 인접 셀끼리 정확히 하루 차이다(경계 채움 셀 포함)', () => {
    const grid = buildMonthGrid({ year: 2026, month: 9 });

    for (const cell of grid) {
      expect(cell.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    for (let i = 1; i < grid.length; i++) {
      const prev = new Date(`${grid[i - 1].dateKey}T00:00:00Z`).getTime();
      const curr = new Date(`${grid[i].dateKey}T00:00:00Z`).getTime();
      expect(curr - prev).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe('monthRangeBounds', () => {
  it("{year:2026, month:9}는 { startDateKey: '2026-09-01', endDateKey: '2026-09-30' }이다", () => {
    expect(monthRangeBounds({ year: 2026, month: 9 })).toEqual({
      startDateKey: '2026-09-01',
      endDateKey: '2026-09-30',
    });
  });
});

describe('shiftMonth', () => {
  it('{year:2026, month:12}에 +1하면 {year:2027, month:1}이다', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('{year:2026, month:1}에 -1하면 {year:2025, month:12}이다', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('formatMonthHeader', () => {
  it("{year:2026, month:9}는 '2026년 9월'이다", () => {
    expect(formatMonthHeader({ year: 2026, month: 9 })).toBe('2026년 9월');
  });
});

describe('yearMonthOf', () => {
  it("'2026-09-01'은 {year:2026, month:9}이다", () => {
    expect(yearMonthOf('2026-09-01')).toEqual({ year: 2026, month: 9 });
  });
});

describe('formatDateKeyTitle', () => {
  it("'2026-09-01'은 '2026년 9월 1일'이다", () => {
    expect(formatDateKeyTitle('2026-09-01')).toBe('2026년 9월 1일');
  });
});

describe('isValidLocalDateKey', () => {
  it("'2026-09-01' → true", () => {
    expect(isValidLocalDateKey('2026-09-01')).toBe(true);
  });

  it.each([
    ['2026-9-1'],
    ['2026-13-01'],
    ['2026-02-30'],
    [''],
    ['2026-09-01; DROP TABLE checkins'],
    [undefined],
    [null],
    [12345],
  ])('%p → false', (value) => {
    expect(isValidLocalDateKey(value)).toBe(false);
  });
});
