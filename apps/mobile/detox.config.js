const IOS_WORKSPACE = 'ios/DeckMobile.xcworkspace';
const IOS_SCHEME = 'DeckMobile';
const DERIVED_DATA = 'ios/build';

const buildCommand = (configuration) =>
  `xcodebuild -workspace ${IOS_WORKSPACE} -scheme ${IOS_SCHEME} -configuration ${configuration} -sdk iphonesimulator -derivedDataPath ${DERIVED_DATA} build`;

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: './e2e/config.json'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  artifacts: {
    rootDir: '../../tests/mobile/artifacts',
    plugins: {
      log: { enabled: false },
      screenshot: {
        takeAutomaticSnapshots: 'failing',
        keepOnlyFailedTestsArtifacts: false
      },
      video: { enabled: false },
      timeline: { enabled: false }
    }
  },
  apps: {
    'mobile.sim.debug': {
      type: 'ios.app',
      binaryPath: `${DERIVED_DATA}/Build/Products/Debug-iphonesimulator/${IOS_SCHEME}.app`,
      build: buildCommand('Debug')
    },
    'mobile.sim.release': {
      type: 'ios.app',
      binaryPath: `${DERIVED_DATA}/Build/Products/Release-iphonesimulator/${IOS_SCHEME}.app`,
      build: buildCommand('Release')
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15 Pro' }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'mobile.sim.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'mobile.sim.release'
    }
  }
};
