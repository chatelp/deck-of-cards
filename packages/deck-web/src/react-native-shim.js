// Re-export everything from react-native-web
export * from 'react-native-web';

// Polyfill for TurboModuleRegistry required by react-native-reanimated v4 / react-native-worklets
// On web, we don't have TurboModules, so we return null/dummy objects.
export const TurboModuleRegistry = {
  get: (name) => null,
  getEnforcing: (name) => {
    console.warn(`[React Native Shim] TurboModuleRegistry.getEnforcing('${name}') called on web. Returning null.`);
    return null;
  },
};

