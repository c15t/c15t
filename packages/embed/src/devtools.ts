import {
	initializeEmbedDevTools,
	mountEmbedDevTools,
	unmountEmbedDevTools,
} from './devtools-runtime';

initializeEmbedDevTools();

export { initializeEmbedDevTools, mountEmbedDevTools, unmountEmbedDevTools };
export type { EmbedDevToolsOptions, EmbedDevToolsRuntime } from './types';
export { version } from './version';
