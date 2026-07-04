import type { AccordionType } from '@c15t/ui/primitives';
import { getContext, setContext } from 'svelte';

const ACCORDION_ROOT_CONTEXT_KEY = Symbol('c15t-svelte-accordion-root');
const ACCORDION_ITEM_CONTEXT_KEY = Symbol('c15t-svelte-accordion-item');

export interface AccordionRootContextValue {
	readonly collapsible: boolean;
	readonly type: AccordionType;
	readonly value: string | string[] | undefined;
	toggleItem: (itemValue: string) => void;
}

export interface AccordionItemContextValue {
	readonly contentId: string;
	readonly disabled: boolean;
	readonly open: boolean;
	readonly triggerId: string;
	readonly value: string;
}

export function setAccordionRootContext(value: AccordionRootContextValue) {
	setContext(ACCORDION_ROOT_CONTEXT_KEY, value);
}

export function getAccordionRootContext(): AccordionRootContextValue {
	const context = getContext<AccordionRootContextValue | undefined>(
		ACCORDION_ROOT_CONTEXT_KEY
	);

	if (!context) {
		throw new Error('Accordion primitives must be used within Accordion.Root');
	}

	return context;
}

export function setAccordionItemContext(value: AccordionItemContextValue) {
	setContext(ACCORDION_ITEM_CONTEXT_KEY, value);
}

export function getAccordionItemContext(): AccordionItemContextValue {
	const context = getContext<AccordionItemContextValue | undefined>(
		ACCORDION_ITEM_CONTEXT_KEY
	);

	if (!context) {
		throw new Error('Accordion primitives must be used within Accordion.Item');
	}

	return context;
}
