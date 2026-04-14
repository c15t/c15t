import type { ButtonMode } from '@c15t/ui/styles/primitives';
import type { ComponentRef, HTMLAttributes, MouseEvent } from 'react';
import type { CSSVariables, ExtendThemeKeys } from '~/types/theme';

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
	/**
	 * @remarks
	 * The visual variant of the button.
	 * @default 'neutral'
	 */
	variant?: 'primary' | 'neutral';
	/**
	 * @remarks
	 * The visual mode of the button.
	 * @default 'stroke'
	 */
	mode?: ButtonMode;
	/**
	 * @remarks
	 * Semantic consent action type for theme-based button styling.
	 */
	consentAction?: 'accept' | 'reject' | 'customize';
	/**
	 * @remarks
	 * Whether this button is the primary action for the current surface.
	 */
	isPrimary?: boolean;
}
