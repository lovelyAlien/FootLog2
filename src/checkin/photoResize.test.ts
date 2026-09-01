/**
 * @jest-environment node
 */
// src/checkin/photoResize.test.ts
// 04-02-PLAN.md Task 1 — resolveResizeTarget(순수 함수) behavior 검증.
// src/checkin/fallbackLocation.test.ts와 동일 패턴: 네이티브 패키지를 전혀 import하지
// 않는 순수 모듈이라 @jest-environment node에서 그대로 로드/검증 가능하다.
import { resolveResizeTarget } from './photoResize';

describe('resolveResizeTarget', () => {
  it('가로가 더 긴 경우(4000x3000, max 1600) { width: 1600 }을 반환한다', () => {
    expect(resolveResizeTarget(4000, 3000, 1600)).toEqual({ width: 1600 });
  });

  it('세로가 더 긴 경우(3000x4000, max 1600) { height: 1600 }을 반환한다', () => {
    expect(resolveResizeTarget(3000, 4000, 1600)).toEqual({ height: 1600 });
  });

  it('정사각형(2000x2000, max 1600)은 동률이면 width 기준으로 { width: 1600 }을 반환한다', () => {
    expect(resolveResizeTarget(2000, 2000, 1600)).toEqual({ width: 1600 });
  });

  it('이미 충분히 작은 가로 이미지(1200x900, max 1600)는 null을 반환한다(리사이징 불필요)', () => {
    expect(resolveResizeTarget(1200, 900, 1600)).toBeNull();
  });

  it('이미 충분히 작은 세로 이미지(900x1200, max 1600)는 null을 반환한다(리사이징 불필요)', () => {
    expect(resolveResizeTarget(900, 1200, 1600)).toBeNull();
  });

  it('긴 변이 정확히 max와 같은 경우(1600x1200)는 null을 반환한다', () => {
    expect(resolveResizeTarget(1600, 1200, 1600)).toBeNull();
  });

  it('폭이 0 이하이면 null을 반환한다', () => {
    expect(resolveResizeTarget(0, 1000, 1600)).toBeNull();
    expect(resolveResizeTarget(-100, 1000, 1600)).toBeNull();
  });

  it('폭/높이가 유한하지 않으면(NaN/Infinity) null을 반환한다', () => {
    expect(resolveResizeTarget(Number.NaN, 1000, 1600)).toBeNull();
    expect(resolveResizeTarget(Infinity, 1000, 1600)).toBeNull();
  });
});
