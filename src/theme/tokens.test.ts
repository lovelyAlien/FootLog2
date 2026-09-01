/**
 * @jest-environment node
 */
// src/theme/tokens.test.ts
// DESIGN.md 값 대조 회귀 테스트 — src/theme/tokens.ts가 DESIGN.md의 컬러/타이포/스페이싱/
// radius/모션 값과 드리프트하지 않도록 고정한다. (01-02-PLAN.md Task 1)

import fs from 'fs';
import path from 'path';
import { colors, typography, spacing, motion, radius } from './tokens';

describe('tokens.colors', () => {
  it('DESIGN.md Color 표의 18개 키와 hex 값이 정확히 일치한다 (2026-09-01: 애플 지도 스타일 예외 4개 추가)', () => {
    expect(colors).toEqual({
      background: '#F4F1EA',
      surface: '#FBFAF6',
      surfaceSoft: '#ECE8DF',
      textPrimary: '#2F302C',
      textMuted: '#79786F',
      textFaint: '#A7A49A',
      accent: '#7C8660',
      accentSoft: '#D8DDC9',
      pin: '#B85C38',
      pinSoft: '#DDC0AC',
      line: '#DDD8CD',
      mapLand: '#E9E4D8',
      mapRoad: '#D2CDC1',
      mapWater: '#DDE3DF',
      mapControlButtonBackground: '#FFFFFF',
      mapControlIcon: '#007AFF',
      mapControlBadgeBackground: '#2C2C2C',
      mapControlBadgeNeedle: '#FF3B30',
    });
    expect(Object.keys(colors)).toHaveLength(18);
  });

  it('semantic 색상 키(success/warning/error/info/danger)가 존재하지 않는다', () => {
    const forbiddenKeys = ['success', 'warning', 'error', 'info', 'danger'];
    forbiddenKeys.forEach((key) => {
      expect(colors).not.toHaveProperty(key);
    });
  });

  it('모든 색상 값이 대문자 6자리 hex 형식을 만족한다', () => {
    Object.values(colors).forEach((value) => {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});

describe('tokens.typography', () => {
  it('screenTitle: System / 22 / 600', () => {
    expect(typography.screenTitle).toMatchObject({
      fontFamily: 'System',
      fontSize: 22,
      fontWeight: '600',
    });
  });

  it('placeName: System / 16 / 500', () => {
    expect(typography.placeName).toMatchObject({
      fontFamily: 'System',
      fontSize: 16,
      fontWeight: '500',
    });
  });

  it('timestamp: ui-monospace / 15 / 500 / tabular-nums', () => {
    expect(typography.timestamp).toMatchObject({
      fontFamily: 'ui-monospace',
      fontSize: 15,
      fontWeight: '500',
    });
    expect(typography.timestamp.fontVariant).toEqual(['tabular-nums']);
  });

  it('journalEntry: Newsreader_400Regular_Italic / 15 / 400 / lineHeight 22.5', () => {
    expect(typography.journalEntry).toMatchObject({
      fontFamily: 'Newsreader_400Regular_Italic',
      fontSize: 15,
      fontWeight: '400',
    });
    expect(typography.journalEntry.lineHeight).toBe(22.5);
  });

  it('helperText: System / 13 / 400', () => {
    expect(typography.helperText).toMatchObject({
      fontFamily: 'System',
      fontSize: 13,
      fontWeight: '400',
    });
  });
});

describe('tokens.spacing', () => {
  it('DESIGN.md 8px 스케일과 깊은 동등하다', () => {
    expect(spacing).toEqual({
      '2xs': 4,
      xs: 8,
      sm: 12,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    });
  });
});

describe('tokens.radius', () => {
  it('DESIGN.md Border radius 값과 깊은 동등하다', () => {
    expect(radius).toEqual({ sm: 4, md: 8, lg: 16, full: 9999 });
  });
});

describe('tokens.motion', () => {
  it('bottomSheetSnapMs/confirmPinDropMs/saveStateCrossfadeMs가 DESIGN.md 값과 일치한다', () => {
    expect(motion.bottomSheetSnapMs).toBe(220);
    expect(motion.confirmPinDropMs).toBe(160);
    expect(motion.saveStateCrossfadeMs).toBe(180);
  });

  it('easing이 절제된 값만 가지며 bounce/spring이 존재하지 않는다', () => {
    expect(motion.easing).toEqual({
      enter: 'ease-out',
      exit: 'ease-in',
      move: 'ease-in-out',
    });
    const serialized = JSON.stringify(motion);
    expect(serialized.toLowerCase()).not.toMatch(/bounce|spring/);
  });
});

describe('tokens.ts 최상위 export 제한 (토큰 발명 방지)', () => {
  it('최상위 export는 정확히 colors|typography|spacing|motion|radius 5개뿐이다', () => {
    const source = fs.readFileSync(path.join(__dirname, 'tokens.ts'), 'utf-8');
    const exportMatches = source.match(/^export const \w+/gm) ?? [];
    const exportNames = exportMatches.map((line) => line.replace('export const ', ''));
    expect(exportNames.sort()).toEqual(
      ['colors', 'motion', 'radius', 'spacing', 'typography'].sort()
    );
  });
});
