import type { FrameTheme } from '@c15t/styles/components/frame';
import type { AllConsentNames } from 'c15t';
import type { ComponentChildren, JSX } from 'preact';
import type * as Atom from './atoms';

export interface FrameProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/**
	 * Content rendered when consent is granted. Children are not mounted until
	 * consent is given, preventing unnecessary network requests.
	 */
	children: ComponentChildren;

	/**
	 * Consent category required to render children.
	 */
	category: AllConsentNames;

	/**
	 * A custom placeholder component to display when consent is not met.
	 * If not provided, a default placeholder will be displayed.
	 */
	placeholder?: ComponentChildren;

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
	 * @see {@link FrameTheme}
	 */
	theme?: FrameTheme;
}

export interface FrameCompoundComponent {
	(props: FrameProps): JSX.Element | null;
	Root: typeof Atom.FrameRoot;
	Title: typeof Atom.FrameTitle;
	Button: typeof Atom.FrameButton;
}
