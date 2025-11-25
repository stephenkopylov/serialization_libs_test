/**
 * @format
 */

// Polyfill for TextEncoder/TextDecoder (required for @msgpack/msgpack in React Native)
import 'text-encoding-polyfill';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
