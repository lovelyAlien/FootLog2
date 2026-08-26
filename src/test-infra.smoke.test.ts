/**
 * @jest-environment node
 */
// src/test-infra.smoke.test.ts
// Wave 0 smoke test: proves the jest runner itself is alive, and that
// NODE_OPTIONS=--experimental-sqlite is propagated so node:sqlite (needed by
// Plan 01-03's migration tests) can be required without throwing.

describe('test infra smoke test', () => {
  it('runs basic arithmetic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('loads node:sqlite without throwing (NODE_OPTIONS=--experimental-sqlite propagated)', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('node:sqlite');
    }).not.toThrow();
  });
});
