import type { AllConsentNames } from 'c15t';
import type { ComponentPropsWithRef, FC, ReactNode } from 'react';
import type * as Atom from './atoms';
import type { FrameTheme } from './theme';

export interface FrameProps extends ComponentPropsWithRef<'div'> {
	/**
	 * The content to be rendered if consent is given.
	 * Typically an iframe or a component that requires consent.
	 */
	children: ReactNode;

	/**
	 * The consent category required to render the children.
	 */
	category: AllConsentNames;

	/**
	 * A custom placeholder component to display when consent is not met.
	 * If not provided, a default placeholder will be displayed.
	 */
	placeholder?: ReactNode;

	/**
	 * When true, removes all default styling from the component
	 * @remarks Useful for implementing completely custom designs
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Custom styles to apply to the banner and its child components
	 * @remarks Allows for deep customization of the banner's appearance while maintaining accessibility
	 * @default undefined
	 */
	theme?: FrameTheme;
}

export interface FrameCompoundComponent extends FC<FrameProps> {
	Root: typeof Atom.FrameRoot;
	Title: typeof Atom.FrameTitle;
	Button: typeof Atom.FrameButton;
}
