import { getContext, setContext } from 'svelte';

const SWITCH_ROOT_CONTEXT_KEY = Symbol('c15t-svelte-switch-root');

export interface SwitchRootContextValue {
	readonly checked: boolean;
	readonly disabled: boolean;
	toggle: () => void;
}

export function setSwitchRootContext(value: SwitchRootContextValue) {
	setContext(SWITCH_ROOT_CONTEXT_KEY, value);
}

export function getSwitchRootContext(): SwitchRootContextValue {
	const context = getContext<SwitchRootContextValue | undefined>(
		SWITCH_ROOT_CONTEXT_KEY
	);

	if (!context) {
		throw new Error('Switch primitives must be used within Switch.Root');
	}

	return context;
}
