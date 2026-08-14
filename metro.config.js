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
// The bridge checkout carries its own react-native (0.72) as a dev dependency. Metro resolves that
// copy for imports made from inside the bridge, and a second react-native has no TurboModule
// registry in this app's bridgeless runtime, so `PlatformConstants` throws the moment the bridge
// constructs a NativeEventEmitter. extraNodeModules below is only a fallback and never fires while
// that copy exists, so pin the singleton explicitly.
const SINGLETONS = ['react-native', 'react', 'react-native-svg'];

const config = {
  watchFolders: [localOneCore],
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
      const singleton = SINGLETONS.find(
        (name) => moduleName === name || moduleName.startsWith(`${name}/`),
      );
      if (singleton) {
        return context.resolveRequest(
          { ...context, originModulePath: path.join(__dirname, 'index.js') },
          moduleName,
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
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
