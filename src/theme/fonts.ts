// src/theme/fonts.ts
// 앱 전체에서 커스텀 폰트를 등록하는 유일한 지점.
//
// 이 서체(Newsreader 이탤릭)는 DESIGN.md 규칙에 따라 사용자가 직접 작성한 텍스트
// (체크인 메모/저널)에만 사용한다 — UI 라벨/시스템 문구에는 절대 사용하지 않는다.
//
// 의도적 구현 차이 (DESIGN.md 문구와의 차이):
// DESIGN.md `## Typography`는 Newsreader를 "Google Fonts CDN(fonts.googleapis.com)에서
// 로드"한다고 적고 있으나, 이는 웹 사고방식을 그대로 옮긴 문구다. React Native/Expo
// 앱에서 런타임 CDN fetch는 PROJECT.md Constraints의 "오프라인 우선: 1단계는 네트워크
// 의존성 전무" 원칙과 정면 충돌한다. 대신 `@expo-google-fonts/newsreader` 패키지가
// 동일한 폰트 파일(.ttf)을 앱 번들에 정적으로 포함하므로, 시각적 결과는 DESIGN.md
// 의도와 완전히 동일하고 로딩 메커니즘만 플랫폼에 맞게 번들 방식으로 치환된 것이다.
// (디자인 의도 변경 아님 — 01-RESEARCH.md "Anti-Patterns to Avoid" 참고)
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';

export const JOURNAL_FONT_FAMILY = 'Newsreader_400Regular_Italic' as const;

// app/_layout.tsx(Plan 01-04)에서 useFonts(newsreaderFonts)로 그대로 전달된다.
export const newsreaderFonts = {
  [JOURNAL_FONT_FAMILY]: Newsreader_400Regular_Italic,
};
