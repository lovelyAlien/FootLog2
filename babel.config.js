// babel.config.js
// Source: https://docs.expo.dev/guides/typescript/ + jest-expo requires babel-preset-expo
// to strip Flow types from @react-native's internal source files during testing.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
