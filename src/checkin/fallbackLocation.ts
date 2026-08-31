// src/checkin/fallbackLocation.ts
// Source: 03-CONTEXT.md D-07 "위치 완전 실패 시 최종 폴백 좌표".
//
// 이 파일의 FALLBACK_COORDINATE 값은 창업자가 03-02-PLAN.md Task 1의
// checkpoint:decision에서 직접 제공한 실제 생활권 좌표다 — 계획/구현 에이전트가
// 지어낸 값이 아니다(03-RESEARCH.md Open Questions #3이 값 발명을 명시적으로 금지).
// 새 값이 필요해지면 여기서 발명하지 말고 창업자에게 다시 확인한다
// (src/theme/tokens.ts와 동일한 규약).
//
// 이 좌표는 3단계 폴백 체인의 마지막 단계에서만 쓰인다:
//   1) 가장 최근 체크인 좌표
//   2) 지도가 마지막으로 표시한 좌표
//   3) 여기의 FALLBACK_COORDINATE (위 둘 다 없을 때만)
//
// 순수 상수/함수 모듈이다 — expo-location 등 네이티브 모듈을 import하지 않으므로
// Node 테스트 환경(@jest-environment node)에서도 그대로 로드 가능하다(src/db/schema.ts와
// 동일 성격).

export const FALLBACK_COORDINATE = {
  lat: 37.3789,
  lng: 127.1145,
} as const;

export function isValidCoordinate(c: { lat: number; lng: number }): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}
