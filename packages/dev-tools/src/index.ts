/**
 * `@c15t/dev-tools`
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

// Script registry types
export type {
	DevToolsScriptRecord,
	ManagedScript,
	ScriptRegistry,
} from './core/script-registry';

// Kernel connector utilities
export {
	createStoreConnector,
	DEFAULT_KERNEL_NAMESPACE,
	getC15tKernel,
	isC15tKernelAvailable,
	isConsentKernel,
	type StoreConnector,
	type StoreConnectorOptions,
} from './core/store-connector';
