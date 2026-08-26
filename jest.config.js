// jest.config.js
// Source: jest-expo preset (docs.expo.dev/guides/testing-with-jest) — SDK 57 iOS-only single-platform preset
module.exports = {
  preset: 'jest-expo/ios',
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/app/**/*.test.ts',
    '<rootDir>/app/**/*.test.tsx',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  clearMocks: true,
};
