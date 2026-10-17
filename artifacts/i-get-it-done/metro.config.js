const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Nuxt recreates these directories while Metro watches the monorepo.
// They contain no mobile source and must not trigger Metro's filesystem watcher.
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[/\\]artifacts[/\\]admin-dashboard[/\\]\.(?:nuxt|output)[/\\].*/,
];
module.exports = config;
