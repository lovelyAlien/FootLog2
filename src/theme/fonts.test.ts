/**
 * @jest-environment node
 */
// src/theme/fonts.test.ts
// Newsreader 이탤릭 세리프가 번들 폰트로 등록되어 있는지, tokens.ts와 드리프트하지 않는지
// 검증한다. (01-02-PLAN.md Task 2)

import fs from 'fs';
import path from 'path';
import { JOURNAL_FONT_FAMILY, newsreaderFonts } from './fonts';
import { typography } from './tokens';

describe('fonts.JOURNAL_FONT_FAMILY', () => {
  it("'Newsreader_400Regular_Italic' 이다", () => {
    expect(JOURNAL_FONT_FAMILY).toBe('Newsreader_400Regular_Italic');
  });
});

describe('fonts.newsreaderFonts', () => {
  it('JOURNAL_FONT_FAMILY를 키로 가지며 값이 undefined/null이 아니다', () => {
    expect(newsreaderFonts[JOURNAL_FONT_FAMILY]).toBeDefined();
    expect(newsreaderFonts[JOURNAL_FONT_FAMILY]).not.toBeNull();
  });

  it('키 집합이 [JOURNAL_FONT_FAMILY] 하나뿐이다', () => {
    expect(Object.keys(newsreaderFonts)).toEqual([JOURNAL_FONT_FAMILY]);
  });
});

describe('tokens.ts ↔ fonts.ts 교차검증', () => {
  it('typography.journalEntry.fontFamily === JOURNAL_FONT_FAMILY', () => {
    expect(typography.journalEntry.fontFamily).toBe(JOURNAL_FONT_FAMILY);
  });
});

describe('fonts.ts 오프라인 우선 원칙 (엣지케이스)', () => {
  it('런타임 CDN fetch 관련 문자열이 코드 라인에 존재하지 않는다', () => {
    const source = fs.readFileSync(path.join(__dirname, 'fonts.ts'), 'utf-8');
    const codeLines = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).not.toMatch(/fonts\.googleapis\.com/);
    expect(codeOnly).not.toMatch(/fetch\(/);
    expect(codeOnly).not.toMatch(/https?:\/\//);
  });
});
