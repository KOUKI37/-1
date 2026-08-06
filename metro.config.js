// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle のマイグレーションファイル（.sql）をバンドル対象として読めるようにする
config.resolver.sourceExts.push('sql');

module.exports = config;
