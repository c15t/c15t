import type { ComponentRef, HTMLAttributes, MouseEvent } from 'react';
import type { ExtendThemeKeys } from '~/types/theme';
import type { CSSVariables } from '~/types/theme';

export type ConsentButtonElement = ComponentRef<'button'>;

/**
 * Props for CookieBanner button components.
 *
 * @public
 */
export interface ConsentButtonProps
	extends Omit<HTMLAttributes<HTMLButtonElement>, 'style'>,
		ExtendThemeKeys<CSSVariables> {
	/**
	 * @remarks
	 * When true, the button will not apply any styles.
	 */
	noStyle?: boolean;
	/**
	 * @remarks
	 * When true, the button will render its children directly without wrapping them in a button element.
	 * This enables better composition with custom button implementations.
	 */
	asChild?: boolean;
	/**
	 * @remarks
	 * Allows for custom click handling.
	 */
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}
