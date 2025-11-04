import { registerRootComponent } from 'expo';

// TEMPORAIRE: Utiliser TestDeckPage pour déboguer le problème de centrage
import TestDeckPage from './src/TestDeckPage';
// import App from './App'; // Commenté temporairement

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(TestDeckPage);
