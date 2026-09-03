// src/auth/kakaoLogin.ts
// 10-07-PLAN.md Task 1 — 카카오 네이티브 SDK 호출과 백엔드 토큰 교환을 잇는 얇은
// 오케스트레이션. 이 저장소 DI 규약대로, 카카오 로그인 네이티브 SDK 패키지를 런타임
// import하는 파일은 이 하나로 한정한다(src/notifications/deps.ts, src/auth/deps.ts와
// 동일한 "SDK 단일 소유" 패턴). src/auth/authApi.ts/tokenStore.ts는 여전히 이 SDK를
// 모른다.
//
// D-14 수정 이력: 원안은 이 SDK가 "인가 코드만 받는" 저수준 API를 제공한다고 가정했으나,
// v6.0.4 타입 정의(node_modules 아래 src/types/index.d.ts)를 직접 확인한 결과 그런 API가
// 존재하지 않았다 — 로그인 함수는 이미 완결된 카카오 access/refresh/id 토큰을 반환한다.
// 그래서 원안(인가 코드 → PKCE 코드 교환)은 폐기됐고, 카카오 액세스 토큰을 백엔드로 그대로
// 전달하는 방식으로 바뀌었다. 인가 코드/코드 검증기를 다루는 코드를 나중에 여기 추가하지
// 말 것 — 이 SDK 버전에는 대응하는 하위 레벨 API가 없다.
import { login as kakaoSdkLogin } from '@react-native-seoul/kakao-login';
// authApi를 네임스페이스로 import한다 — settingsRepo.ts와 동일한 저장소 관례(호출부가
// 모듈 소속을 이름으로 드러냄). 토큰 교환 함수 이름을 이 파일에서 단 한 곳(호출부)에만
// 등장시키는 부수 효과도 있다.
import * as authApi from './authApi';
import { AuthError } from './config';
import type { AuthApiDeps, AuthTokens } from './config';
import { DEV_LOGIN_COPY } from './devLoginContent';

export async function signInWithKakao(
  deps: AuthApiDeps = authApi.defaultAuthApiDeps
): Promise<AuthTokens> {
  let kakaoAccessToken: string;
  try {
    // 로그인 함수는 카카오톡 설치 시 앱 전환, 미설치 시 웹 로그인 폴백을 SDK가 자동
    // 처리한다(D-13의 채택 근거). 계정 입력을 항상 강제하는 대체 함수는 쓰지 않는다.
    //
    // 응답 토큰 객체의 어떤 필드도 console로 찍지 않는다 — access 토큰만 꺼내 바로
    // 다음 줄로 넘기고, 나머지 필드(만료 시각/스코프 등)는 변수에 담지도 않는다.
    kakaoAccessToken = (await kakaoSdkLogin()).accessToken;
  } catch {
    // 사용자 취소와 SDK 실패를 구분할 수 있는 에러 코드가 타입 정의로 확인되지 않았다 —
    // 추측으로 분기하지 않고 하나로 합친다(rejected). 나중에 SDK가 코드를 문서화하면
    // 재검토할 것.
    throw new AuthError('rejected', DEV_LOGIN_COPY.sdkCancelledMessage);
  }

  // 백엔드로는 accessToken만 넘긴다. 카카오 쪽 나머지 토큰 필드는 참조하지도, 저장하지도
  // 않는다 — 카카오 토큰은 우리 시스템에 남지 않는다(D-14).
  return authApi.exchangeKakaoToken(deps, kakaoAccessToken);
}
