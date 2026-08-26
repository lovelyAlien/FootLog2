// src/test-utils/stripComments.ts
// 정적 소스 분석 테스트(회귀 가드)가 주석 줄을 실제 코드로 오인하지 않도록,
// 한 줄 주석(//)과 블록 주석 시작/계속 줄(/* ... , * ...)을 걸러낸다.
// fonts.test.ts / migrations.test.ts / foundation-wiring.test.ts가 각자 다른
// 버전을 갖고 있어 `/* ...` 블록 주석 시작 줄 처리가 서로 갈리던 것을 하나로 통합.
export function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
}
