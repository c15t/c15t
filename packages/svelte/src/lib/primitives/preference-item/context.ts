import { getContext, setContext } from 'svelte';

const PREFERENCE_ITEM_CONTEXT_KEY = Symbol('c15t-svelte-preference-item');

export interface PreferenceItemContextValue {
	readonly contentId: string;
	readonly disabled: boolean;
	readonly noStyle: boolean;
	readonly open: boolean;
	readonly triggerId: string;
	setOpen: (open: boolean) => void;
	toggle: () => void;
}

export function setPreferenceItemContext(value: PreferenceItemContextValue) {
	setContext(PREFERENCE_ITEM_CONTEXT_KEY, value);
}

export function getPreferenceItemContext(): PreferenceItemContextValue {
	const context = getContext<PreferenceItemContextValue | undefined>(
		PREFERENCE_ITEM_CONTEXT_KEY
	);

	if (!context) {
		throw new Error(
			'PreferenceItem primitives must be used within PreferenceItem.Root'
		);
	}

	return context;
}
