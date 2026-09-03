// app.config.js
// 10-07-PLAN.md Task 1 — 카카오 로그인 config plugin을 환경변수로 주입하는 얇은 레이어.
//
// (a) app.json을 한 글자도 수정하지 않고 그대로 두는 이유: src/notifications/infoPlist.test.ts가
//     fs.readFileSync로 app.json을 정적 파싱해 iOS 권한 문구 3종을 단언한다(Phase 2 회귀
//     가드). app.json을 이 파일 하나로 대체(app.config.ts 전환)하면 그 테스트가 깨진다.
// (b) Expo 동작: app.json과 이 파일이 둘 다 있으면, Expo는 이 파일의 함수형 export에
//     app.json 내용을 `config` 인자로 그대로 넘겨준다. 이 파일은 그 config를 얇게
//     확장하기만 한다 — app.json의 값을 손으로 다시 옮겨 적지 않는다.
// (c) ios.infoPlist의 권한 문구(Phase 2 확정, D-03)를 절대 덮어쓰지 않는다(Phase 2
//     Pitfall 5 — config plugin이 기본 영어 문구로 조용히 덮어쓸 위험). 이 파일은
//     `config`를 스프레드로만 확장하고 `config.ios`/`config.ios.infoPlist`를 재대입하지
//     않으므로 원본 문구가 그대로 보존된다.
//
// 카카오 네이티브 앱 키는 정적 JSON(app.json)에 넣을 수 없다 — .env에만 존재해야
// 한다(10-01 T-10-01). 값이 없으면 조용히 빌드되지 않고 명확한 한글 메시지로 실패한다 —
// 키 없이 빌드되면 런타임에 원인 파악이 어려운 카카오 SDK 초기화 실패로만 드러난다.
module.exports = ({ config }) => {
  const kakaoAppKey = process.env.KAKAO_NATIVE_APP_KEY;

  if (!kakaoAppKey) {
    throw new Error(
      'KAKAO_NATIVE_APP_KEY 환경변수가 없습니다. .env.example을 참고해 .env에 값을 넣으세요.'
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['@react-native-seoul/kakao-login', { kakaoAppKey }],
    ],
  };
};
