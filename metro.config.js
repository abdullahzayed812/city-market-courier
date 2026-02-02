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
const config = {
  watchFolders,
  resolver: {
    // Tell Metro to look in both local and root node_modules
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(root, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
