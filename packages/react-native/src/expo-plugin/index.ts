/**
 * Entry point for `@c15t/react-native/expo-plugin`.
 *
 * Add it to `app.json` and a standard install is done: the native core gets its
 * bootstrap config, the launch hook, the Android permission, and the iOS privacy
 * keys, and the same values reach JavaScript through `extra.c15t`.
 *
 * ```json
 * {
 *   "plugins": [
 *     [
 *       "@c15t/react-native/expo-plugin",
 *       { "backendURL": "https://consent.example.com" }
 *     ]
 *   ]
 * }
 * ```
 *
 * This module pulls in `node:fs` and `@expo/config-plugins`. It is a build-time
 * tool and nothing in the package's React Native entry point imports it, so it
 * never reaches a Metro bundle.
 */
import { createRunOncePlugin } from '@expo/config-plugins';

import { PLUGIN_NAME } from './constants';
import { withC15t } from './with-c15t';

/** The plugin to name in an `app.json` `plugins` array. */
const withC15tOnce = createRunOncePlugin(withC15t, PLUGIN_NAME);

export default withC15tOnce;

export { withC15t } from './with-c15t';
export { applyParamsOnConfig, type C15tExtraConfig } from './with-c15t';
export { C15tPluginError } from './errors';
export type {
	C15tPluginProps,
	C15tProviderTransportKind,
	C15tTransportMode,
	ResolvedC15tParams,
} from './params';
export { TRANSPORT_MODES } from './params';
export type { WorkflowContext } from './workflow';
