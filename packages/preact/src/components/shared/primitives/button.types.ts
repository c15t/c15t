import type { CSSVariables, ExtendThemeKeys } from '@c15t/styles/types';
import type { JSX } from 'preact';


export type ConsentButtonElement = HTMLButtonElement;

/**
 * Props for CookieBanner button components.
 *
 * @public
 */
export interface ConsentButtonProps
	extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'style' | 'className'>,
		ExtendThemeKeys<CSSVariables> {
	/** When true, no default styles are applied. */
	noStyle?: boolean;

	/**
	 * When true, renders children directly using a Slot-like wrapper
	 * rather than a native button element.
	 */
	asChild?: boolean;

	/** Custom click handler. */
	onClick?: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
}
