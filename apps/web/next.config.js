const path = require('path');
const webpack = require('webpack');

const rootDir = path.resolve(__dirname, '..', '..');

module.exports = {
  transpilePackages: [
    '@deck/core',
    '@deck/web',
    '@deck/rn',
    'react-native-web'
  ],
  webpack: (config, { isServer }) => {
    // Alias react-native to react-native-web
    const existingAlias = config.resolve.alias || {};
    config.resolve.alias = {
      ...existingAlias,
      'react-native$': 'react-native-web'
    };

    // Extensions for web compatibility
    config.resolve.extensions = [...config.resolve.extensions, '.web.js', '.web.ts', '.web.tsx'];

    // Exclude react-native from webpack processing on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'react-native': false
      };
    }

    // Exclude react-native from Babel processing (doit être fait pour tous les environnements)
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Trouver toutes les règles qui utilisent babel-loader et ajouter l'exclusion
    config.module.rules.forEach((rule) => {
      if (rule && rule.use) {
        const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
        const hasBabel = uses.some(
          (u) => u === 'babel-loader' || u?.loader === 'babel-loader' || (typeof u === 'object' && u?.loader?.includes('babel'))
        );
        
        if (hasBabel) {
          // Ajouter l'exclusion pour react-native
          if (rule.exclude) {
            const excludes = Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude];
            if (!excludes.some((e) => e.toString().includes('react-native'))) {
              rule.exclude = [...excludes, /node_modules\/react-native\//];
            }
          } else {
            rule.exclude = /node_modules\/react-native\//;
          }
        }
      }
    });

    // Ignorer complètement les imports internes de react-native (Libraries, etc.)
    // Cela empêche d'entrer dans le code source Flow de react-native qui fait planter le build web
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native\//
      })
    );
    
    // Définir une variable d'environnement pour forcer la plateforme web
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.EXPO_PLATFORM': JSON.stringify('web'),
        '__DEV__': JSON.stringify(process.env.NODE_ENV !== 'production')
      })
    );

    return config;
  }
};
