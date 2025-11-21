const path = require('path');
const webpack = require('webpack');

const rootDir = path.resolve(__dirname, '..', '..');

module.exports = {
  transpilePackages: [
    '@deck/core',
    '@deck/web',
    '@deck/rn',
    'react-native-reanimated',
    'react-native-web',
    'moti'
  ],
  webpack: (config, { isServer }) => {
    // Alias react-native to our local shim (important: doit être avant autres règles)
    const existingAlias = config.resolve.alias || {};
    config.resolve.alias = {
      ...existingAlias,
      'react-native$': path.resolve(rootDir, 'packages/deck-web/src/react-native-shim.js'),
      
      // Use web version of reanimated for web builds (client-side only)
      // Server-side peut utiliser la version normale
      'react-native-reanimated': isServer 
        ? 'react-native-reanimated' 
        : 'react-native-reanimated'
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

    // Ignorer complètement react-native et rediriger vers react-native-web
    config.plugins = config.plugins || [];
    
    // SSR-safe: Ignorer react-native-reanimated côté serveur
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^react-native-reanimated$/
        })
      );
    }
    
    // Ignorer complètement les imports internes de react-native (Libraries, etc.)
    // Cela empêche d'entrer dans le code source Flow de react-native qui fait planter le build web
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native\//
      })
    );
    
    // Client-side: Utiliser react-native-reanimated directement (la version 4 supporte le web nativement)
    // if (!isServer) {
    //   config.plugins.push(
    //     new webpack.NormalModuleReplacementPlugin(
    //       /^react-native-reanimated$/,
    //       'react-native-reanimated'
    //     )
    //   );
    // }
    
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
