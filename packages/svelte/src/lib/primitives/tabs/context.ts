import type { TabsOrientation } from '@c15t/ui/primitives';
import { getContext, setContext } from 'svelte';

const TABS_ROOT_CONTEXT_KEY = Symbol('c15t-svelte-tabs-root');

export interface TabsRootContextValue {
	readonly baseId: string;
	readonly disabled: boolean;
	readonly loop: boolean;
	readonly orientation: TabsOrientation;
	readonly value: string | null;
	setValue: (value: string) => void;
}

export function setTabsRootContext(value: TabsRootContextValue) {
	setContext(TABS_ROOT_CONTEXT_KEY, value);
}

export function getTabsRootContext(): TabsRootContextValue {
	const context = getContext<TabsRootContextValue | undefined>(
		TABS_ROOT_CONTEXT_KEY
	);

	if (!context) {
		throw new Error('Tabs primitives must be used within Tabs.Root');
	}

	return context;
}
