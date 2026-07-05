/**
 * Injection keys shared by the own primitives (RFC 0003).
 */
import type { InjectionKey, Ref } from 'vue';

export const switchCheckedKey: InjectionKey<Ref<boolean>> = Symbol(
	'c15t:switch-checked'
);

export interface DialogContext {
	open: () => boolean;
	modal: () => boolean;
	close: () => void;
}
export const dialogContextKey: InjectionKey<DialogContext> =
	Symbol('c15t:dialog');

export interface AccordionContext {
	isOpen: (value: string) => boolean;
	toggle: (value: string) => void;
}
export const accordionContextKey: InjectionKey<AccordionContext> =
	Symbol('c15t:accordion');

export interface AccordionItemContext {
	value: string;
	open: () => boolean;
	toggle: () => void;
}
export const accordionItemContextKey: InjectionKey<AccordionItemContext> =
	Symbol('c15t:accordion-item');
