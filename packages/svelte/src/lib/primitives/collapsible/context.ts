import { getContext, setContext } from 'svelte';

const COLLAPSIBLE_ROOT_CONTEXT_KEY = Symbol('c15t-svelte-collapsible-root');

export interface CollapsibleRootContextValue {
	readonly contentId: string;
	readonly disabled: boolean;
	readonly open: boolean;
	readonly triggerId: string;
	setOpen: (open: boolean) => void;
	toggle: () => void;
}

export function setCollapsibleRootContext(value: CollapsibleRootContextValue) {
	setContext(COLLAPSIBLE_ROOT_CONTEXT_KEY, value);
}

export function getCollapsibleRootContext(): CollapsibleRootContextValue {
	const context = getContext<CollapsibleRootContextValue | undefined>(
		COLLAPSIBLE_ROOT_CONTEXT_KEY
	);

	if (!context) {
		throw new Error(
			'Collapsible primitives must be used within Collapsible.Root'
		);
	}

	return context;
}
