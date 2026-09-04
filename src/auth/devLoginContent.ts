// src/auth/devLoginContent.ts
// 10-07-PLAN.md Task 1 — 개발자 검증 화면(src/app/dev-login.tsx) 전용 문구 단일 출처.
// src/settings/content.ts와 동일한 저장소 관례(as const 객체 하나로 문구를 모은다)를
// 따르지만, 이 화면은 Phase 10 백엔드 검증용으로만 존재하며(D-16) 1단계 제품 UI가 따르는
// 문구 품질 기준(06-UI-SPEC.md Copywriting Contract 등)을 적용받지 않는다 — 개발자가
// 화면 상태를 빠르게 식별할 수 있으면 충분하다.
//
// 런타임 import를 두지 않는다 — 이 파일은 순수 상수만 담는다(src/settings/content.ts와
// 동일 규약).
export const DEV_LOGIN_COPY = {
  screenTitle: '카카오 로그인 검증(개발자용)',
  kakaoLoginButton: '카카오로 로그인',
  signingInStatus: '로그인 중...',
  signedInStatus: '로그인됨',
  clearSessionButton: '로컬 세션 삭제',
  retryButton: '다시 시도',
  // AuthError.kind(src/auth/config.ts) 세 값에 각각 대응하는 문구.
  errorNetwork: '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
  errorRejected: '로그인이 거부됐어요. 다시 시도해주세요.',
  errorNoSession: '저장된 세션이 없어요.',
  // 카카오 SDK 호출 자체가 취소/실패했을 때 AuthError('rejected', ...)의 message로 쓰는
  // 문구 — 화면에는 위 errorRejected가 그대로 노출되지만(kind 기반 분기), 원인 추적용으로
  // AuthError.message에 남긴다.
  sdkCancelledMessage: '카카오 로그인이 취소되었거나 실패했습니다.',
} as const;
