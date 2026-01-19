import type { ReactNode } from 'react';
import type { LegalLinksProps } from '../shared/primitives/legal-links';

export interface ConsentManagerWidgetRootProps {
	children: ReactNode;
	useProvider?: boolean;
	/**
	 * Disables all animations when true
	 */
	disableAnimation?: boolean;

	/**
	 * Removes default styles when true
	 */
	noStyle?: boolean;

	/**
	 * Locks the scroll when true
	 */
	scrollLock?: boolean;

	/**
	 * Traps keyboard focus within a dialog when true
	 */
	trapFocus?: boolean;
}

/**
 * Props for the ConsentManagerWidget component
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 */
export interface ConsentManagerWidgetProps
	extends Omit<ConsentManagerWidgetRootProps, 'children'> {
	/**
	 * Controls whether to hide the branding in the widget footer.
	 *
	 * @defaultValue false
	 */
	hideBranding?: boolean;
	/**
	 * Controls which legal links to display in the widget footer.
	 *
	 * @remarks
	 * - `undefined` (default): Shows all available legal links from translations
	 * - `null`: Explicitly hides all legal links
	 * - Array of keys: Shows only the specified legal links
	 *
	 * @defaultValue undefined
	 *
	 * @example
	 * ```tsx
	 * // Show all legal links
	 * <ConsentManagerWidget />
	 *
	 * // Hide all legal links
	 * <ConsentManagerWidget legalLinks={null} />
	 *
	 * // Show only privacy policy and cookie policy
	 * <ConsentManagerWidget legalLinks={['privacyPolicy', 'cookiePolicy']} />
	 * ```
	 */
	legalLinks?: LegalLinksProps['links'];
}
