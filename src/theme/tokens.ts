// src/theme/tokens.ts
// Source: DESIGN.md (저장소 루트) 값을 그대로 전사 — 2026-08-26 기준.
// 새 토큰을 여기서 발명하지 않는다. 값이 바뀌면 DESIGN.md를 먼저 갱신하고 이 파일에
// 반영한다 (CLAUDE.md: "Do not deviate without explicit user approval").
//
// journalEntry.fontFamily는 src/theme/fonts.ts의 JOURNAL_FONT_FAMILY를 단일 출처로
// 참조한다 — 두 파일이 서로 드리프트하지 않도록 보장한다.
import { JOURNAL_FONT_FAMILY } from './fonts';

export const colors = {
  background: '#F4F1EA', // 웜 오프화이트
  surface: '#FBFAF6', // 카드/바텀시트
  surfaceSoft: '#ECE8DF', // 구분 영역
  textPrimary: '#2F302C', // 웜 니어블랙 (진짜 검정 아님)
  textMuted: '#79786F',
  textFaint: '#A7A49A', // placeholder 등
  accent: '#7C8660', // 정확히 6개 승인된 용도로만 사용 — DESIGN.md Color 섹션 참고
  accentSoft: '#D8DDC9', // 배경용 옅은 올리브
  line: '#DDD8CD', // 구분선
  mapLand: '#E9E4D8', // 지도 전용
  mapRoad: '#D2CDC1', // 지도 전용
  mapWater: '#DDE3DF', // 지도 전용
} as const;

export const typography = {
  screenTitle: { fontFamily: 'System', fontSize: 22, fontWeight: '600' },
  placeName: { fontFamily: 'System', fontSize: 16, fontWeight: '500' },
  timestamp: {
    fontFamily: 'ui-monospace', // iOS 네이티브 제네릭 모노스페이스(SF Mono 계열)
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as const,
  },
  journalEntry: {
    fontFamily: JOURNAL_FONT_FAMILY, // src/theme/fonts.ts 단일 출처 (사용자 작성 텍스트 전용)
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 15 * 1.5,
  },
  helperText: { fontFamily: 'System', fontSize: 13, fontWeight: '400' },
} as const;

export const spacing = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const motion = {
  bottomSheetSnapMs: 220,
  confirmPinDropMs: 160,
  saveStateCrossfadeMs: 180,
  easing: { enter: 'ease-out', exit: 'ease-in', move: 'ease-in-out' },
} as const;

export const radius = { sm: 4, md: 8, lg: 16, full: 9999 } as const;
