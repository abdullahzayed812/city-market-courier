const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Find the workspace root (2 levels up)
const root = path.resolve(__dirname, '../..');
const watchFolders = [root];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
// @city-market/mobile-ui lives outside this app, so a normal lookup from its
// files would reach the repo-root node_modules first, which has a different
// React. Two Reacts break hooks ("Invalid hook call"), so modules imported
// from shared-ui are resolved as if imported from this app.
const sharedUiDir = path.resolve(__dirname, '../shared-ui') + path.sep;
const appEntry = path.resolve(__dirname, 'index.js');

const config = {
  watchFolders,
  resolver: {
    // Tell Metro to look in both local and root node_modules
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(root, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      const fromSharedUi = context.originModulePath.startsWith(sharedUiDir);
      const isBare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
      if (fromSharedUi && isBare) {
        return context.resolveRequest({ ...context, originModulePath: appEntry }, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
