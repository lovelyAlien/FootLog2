/**
 * @jest-environment node
 */
// src/calendar/scrubberRange.test.ts
// 06-02-PLAN.md Task 3 (RED) — 스크러버 범위 생성 · 하드 클램프 · 가시성 게이트 계약.
// monthGrid.ts/localDate.ts와 동일하게 @jest-environment node로 순수 함수만 로드/검증한다.

import {
  buildScrubberDateKeys,
  clampIndex,
  indexForTranslation,
  SCRUBBER_BOTTOM_OFFSET_PT,
  SCRUBBER_HEADER_HEIGHT_PT,
  SCRUBBER_MIN_DISTINCT_DATES,
  SCRUBBER_TICK_SPACING_PX,
  SCRUBBER_TOUCH_SURFACE_HEIGHT_PT,
  shouldShowScrubber,
} from './scrubberRange';

describe('buildScrubberDateKeys', () => {
  it("('2026-08-30', '2026-09-02')는 오름차순, 양끝 포함 배열을 반환한다", () => {
    expect(buildScrubberDateKeys('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ]);
  });

  it('시작=끝이면 길이 1 배열이다', () => {
    expect(buildScrubberDateKeys('2026-09-02', '2026-09-02')).toEqual(['2026-09-02']);
  });

  it('시작 > 끝이면 빈 배열을 반환한다(throw 아님)', () => {
    expect(buildScrubberDateKeys('2026-09-02', '2026-08-30')).toEqual([]);
  });

  it('월/연 경계를 넘는 범위에서 날짜가 하루씩 정확히 증가한다', () => {
    expect(buildScrubberDateKeys('2025-12-30', '2026-01-02')).toEqual([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
  });
});

describe('clampIndex', () => {
  it('clampIndex(-5, 10) === 0', () => {
    expect(clampIndex(-5, 10)).toBe(0);
  });

  it('clampIndex(99, 10) === 9', () => {
    expect(clampIndex(99, 10)).toBe(9);
  });

  it('clampIndex(3, 10) === 3', () => {
    expect(clampIndex(3, 10)).toBe(3);
  });

  it('clampIndex(0, 0) === 0', () => {
    expect(clampIndex(0, 0)).toBe(0);
  });
});

describe('indexForTranslation', () => {
  it('움직이지 않으면 제자리다: indexForTranslation(5, 0, 10) === 5', () => {
    expect(indexForTranslation(5, 0, 10)).toBe(5);
  });

  it('오른쪽으로 끌면(양수 translation) 더 이전 날짜로 이동한다', () => {
    expect(indexForTranslation(5, SCRUBBER_TICK_SPACING_PX * 2, 10)).toBe(3);
  });

  it('왼쪽으로 끌면(음수 translation) 더 이후 날짜로 이동한다', () => {
    expect(indexForTranslation(5, -SCRUBBER_TICK_SPACING_PX * 2, 10)).toBe(7);
  });

  it('경계를 넘어가지 않고 즉시 멈춘다(하한): indexForTranslation(0, +큰값, 10) === 0', () => {
    expect(indexForTranslation(0, SCRUBBER_TICK_SPACING_PX * 50, 10)).toBe(0);
  });

  it('경계를 넘어가지 않고 즉시 멈춘다(상한): indexForTranslation(9, -큰값, 10) === 9', () => {
    expect(indexForTranslation(9, -SCRUBBER_TICK_SPACING_PX * 50, 10)).toBe(9);
  });
});

describe('shouldShowScrubber', () => {
  it('shouldShowScrubber(0) === false', () => {
    expect(shouldShowScrubber(0)).toBe(false);
  });

  it('shouldShowScrubber(1) === false', () => {
    expect(shouldShowScrubber(1)).toBe(false);
  });

  it('shouldShowScrubber(2) === true', () => {
    expect(shouldShowScrubber(2)).toBe(true);
  });
});

describe('dimension constants', () => {
  it('SCRUBBER_BOTTOM_OFFSET_PT === 132', () => {
    expect(SCRUBBER_BOTTOM_OFFSET_PT).toBe(132);
  });

  it('SCRUBBER_HEADER_HEIGHT_PT === 44', () => {
    expect(SCRUBBER_HEADER_HEIGHT_PT).toBe(44);
  });

  it('SCRUBBER_TOUCH_SURFACE_HEIGHT_PT === 44', () => {
    expect(SCRUBBER_TOUCH_SURFACE_HEIGHT_PT).toBe(44);
  });

  it('SCRUBBER_MIN_DISTINCT_DATES === 2', () => {
    expect(SCRUBBER_MIN_DISTINCT_DATES).toBe(2);
  });
});
