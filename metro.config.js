const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

// The Verana bridge is consumed via pnpm link: from a sibling checkout; Metro
// needs both the watch folder and the explicit module mapping to follow it.
const localOneCore = path.resolve(__dirname, '../procivis-react-native-one-core');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [localOneCore],
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    extraNodeModules: new Proxy(
      { '@procivis/react-native-one-core': localOneCore },
      {
        get: (target, name) =>
          target[name] ?? path.join(__dirname, 'node_modules', String(name)),
      },
    ),
    nodeModulesPaths: [path.join(__dirname, 'node_modules')],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    unstable_allowRequireContext: true,
  },
};

module.exports = withSentryConfig(mergeConfig(defaultConfig, config));
