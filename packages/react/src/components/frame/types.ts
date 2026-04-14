import type { AllConsentNames } from 'c15t';
import type { ComponentPropsWithRef, FC, ReactNode } from 'react';
import type * as Atom from './atoms';

export interface FrameProps extends ComponentPropsWithRef<'div'> {
	/**
	 * Content rendered when consent is granted. Children are not mounted until
	 * consent is given, preventing unnecessary network requests.
	 */
	children: ReactNode;

	/**
	 * Consent category required to render children.
	 */
	category: AllConsentNames;

	/**
	 * A custom placeholder component to display when consent is not met.
	 * If not provided, a default placeholder will be displayed.
	 */
	placeholder?: ReactNode;

	/**
	 * When true, removes all default styling from the component
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Custom theme to override default styles while maintaining structure and
	 * accessibility. Merges with defaults. Ignored when `noStyle={true}`.
	 *
	 * @default undefined
	 */
	theme?: any;
}

export interface FrameCompoundComponent extends FC<FrameProps> {
	Root: typeof Atom.FrameRoot;
	Title: typeof Atom.FrameTitle;
	Button: typeof Atom.FrameButton;
}
