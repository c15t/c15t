import {
	bootstrapEmbedRuntime,
	createEmbedRuntime,
	EMBED_PAYLOAD_EVENT,
	initializeEmbedRuntime,
	mountEmbedRuntime,
	readEmbedPayload,
	resolveBackendURL,
	unmountEmbedRuntime,
} from './runtime';

initializeEmbedRuntime();

export {
	EMBED_PAYLOAD_EVENT,
	bootstrapEmbedRuntime,
	createEmbedRuntime,
	initializeEmbedRuntime,
	mountEmbedRuntime,
	readEmbedPayload,
	resolveBackendURL,
	unmountEmbedRuntime,
};
export type {
	EmbedBootstrapPayload,
	EmbedComponentHints,
	EmbedMountOptions,
	EmbedOptions,
	EmbedRuntime,
	EmbedStoreOptions,
	EmbedUIOptions,
} from './types';
export { version } from './version';
