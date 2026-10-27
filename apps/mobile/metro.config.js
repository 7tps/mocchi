// Expo's default config detects the npm workspace root and watches shared packages.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
