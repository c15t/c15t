import ConsentDevTools from './components/consent-dev-tools.svelte';

/** Compatible short name for {@link ConsentDevTools}. */
const DevTools = ConsentDevTools;

/** Backward-compatible name for {@link ConsentDevTools}. */
const C15TDevTools = ConsentDevTools;

export { C15TDevTools, ConsentDevTools, DevTools };
export default ConsentDevTools;

export type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
export type {
	C15TDevToolsProps,
	ConsentDevToolsProps,
	DevToolsProps,
} from './devtools-options';
