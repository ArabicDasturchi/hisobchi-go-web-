// Expo monorepo (npm workspaces) uchun Metro sozlamasi.
// @hisobchi/core TypeScript manbasi ".js" kengaytmali importlardan foydalanadi
// (masalan './types.js'); Metro ularni mos ".ts" fayllarga yo'naltiradi.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const coreDir = path.resolve(__dirname, '../../packages/core');

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath;
  if (
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    origin.startsWith(coreDir)
  ) {
    return context.resolveRequest(context, moduleName.slice(0, -3) + '.ts', platform);
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
