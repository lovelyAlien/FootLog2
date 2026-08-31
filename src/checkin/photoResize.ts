// src/checkin/photoResize.ts
// `expo-image-manipulator`가 한쪽 치수만 주면 비율을 유지해 나머지를 계산해주지만, 어느
// 쪽을 줄지는 원본 방향에 따라 달라진다(04-RESEARCH.md A1). 그 판단을 네이티브 경계 밖
// 순수 함수로 빼내 단위 테스트한다.
//
// 이 파일은 어떤 패키지도 import하지 않는다(순수 모듈, @jest-environment node에서 그대로
// 로드 가능 — src/checkin/fallbackLocation.ts와 동일 성격). src/checkin/photos.ts를
// import하지 않는다 — deps.ts가 이 파일을 import하므로 순환 의존을 피한다.

export function resolveResizeTarget(
  width: number,
  height: number,
  maxDimensionPx: number
): { width: number } | { height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const longSide = Math.max(width, height);
  if (longSide <= maxDimensionPx) {
    return null;
  }

  // 세로가 더 긴 경우에만 height를 제약한다. 가로가 더 길거나 동률(정사각형)이면
  // width 기준으로 통일한다(04-02-PLAN.md behavior 명세: 동률이면 width 기준).
  if (height > width) {
    return { height: maxDimensionPx };
  }
  return { width: maxDimensionPx };
}
