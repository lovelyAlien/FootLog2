/**
 * @jest-environment node
 */
// src/checkin/fallbackLocation.test.ts
// 03-02-PLAN.md Task 2 — D-07 최종 폴백 좌표 placeholder 잔존 게이트 테스트.
//
// 이 테스트가 존재하는 이유(03-RESEARCH.md Open Questions #3):
// FALLBACK_COORDINATE는 창업자가 Task 1 checkpoint:decision에서 직접 제공한 실제
// 생활권 좌표여야 하며, 계획/구현 에이전트가 지어낸 값이거나 0,0 같은 무의미한
// placeholder로 머지되어서는 안 된다. 아래 테스트 중 "placeholder 금지" 테스트가
// 이 계약을 자동으로 강제하는 blocking gate다.

import { FALLBACK_COORDINATE, isValidCoordinate } from './fallbackLocation';

describe('FALLBACK_COORDINATE (D-07 최종 폴백 좌표)', () => {
  it('placeholder 금지 게이트: lat/lng이 0,0으로 남아있지 않다', () => {
    expect(FALLBACK_COORDINATE.lat).not.toBe(0);
    expect(FALLBACK_COORDINATE.lng).not.toBe(0);
  });

  it('lat이 -90 이상 90 이하, lng이 -180 이상 180 이하인 유효 범위 안에 있다', () => {
    expect(FALLBACK_COORDINATE.lat).toBeGreaterThanOrEqual(-90);
    expect(FALLBACK_COORDINATE.lat).toBeLessThanOrEqual(90);
    expect(FALLBACK_COORDINATE.lng).toBeGreaterThanOrEqual(-180);
    expect(FALLBACK_COORDINATE.lng).toBeLessThanOrEqual(180);
  });
});

describe('isValidCoordinate', () => {
  it('위도가 범위를 벗어나면 false를 반환한다', () => {
    expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false);
  });

  it('NaN 좌표는 false를 반환한다', () => {
    expect(isValidCoordinate({ lat: Number.NaN, lng: 0 })).toBe(false);
  });

  it('FALLBACK_COORDINATE 자체는 true를 반환한다', () => {
    expect(isValidCoordinate(FALLBACK_COORDINATE)).toBe(true);
  });
});
