/**
 * @format
 */

import TextEncoder from 'react-native-fast-encoder';

const setupPolyfills = async () => {
  const { polyfillGlobal } = await import(
    'react-native/Libraries/Utilities/PolyfillFunctions'
  );

  polyfillGlobal('TextDecoder', () => TextEncoder);
  polyfillGlobal('TextEncoder', () => TextEncoder);
};

setupPolyfills();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
