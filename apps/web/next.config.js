const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

module.exports = {
  transpilePackages: ['@deck/web', '@deck/core'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web'
    };

    config.resolve.extensions = [...config.resolve.extensions, '.web.js', '.web.ts', '.web.tsx'];
    return config;
  }
};
