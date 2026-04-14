/**
 * @c15t/dev-tools
 *
 * Developer tools for debugging and inspecting c15t consent management state.
 *
 * @packageDocumentation
 */

// Main exports
export {
	createDevTools,
	createDevToolsPanel,
	type DevToolsInstance,
	type DevToolsOptions,
} from './core/devtools';

// State manager types
export type {
	DevToolsPosition,
	DevToolsState,
	DevToolsTab,
} from './core/state-manager';

// Store connector utilities
export {
	createStoreConnector,
	getC15tStore,
	isC15tStoreAvailable,
	type StoreConnector,
	type StoreConnectorOptions,
} from './core/store-connector';
