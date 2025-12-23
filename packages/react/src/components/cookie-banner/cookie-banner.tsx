'use client';

/**
 * @packageDocumentation
 * Provides the main cookie banner component for privacy consent management.
 * Implements an accessible, customizable banner following GDPR requirements.
 */

import type { CookieBannerTheme } from '@c15t/styles/components/cookie-banner';
import { type FC, Fragment, type ReactNode } from 'react';
import { ConsentButton } from '~/components/shared/primitives/button';
import type { LegalLinksProps } from '~/components/shared/primitives/legal-links';
import { useTheme } from '~/hooks/use-theme';
import { useTranslations } from '~/hooks/use-translations';
import { CookieBannerRoot } from './atoms/root';
import {
	CookieBannerCard,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerHeader,
	CookieBannerTitle,
} from './components';
import { ErrorBoundary } from './error-boundary';

/**
 * Identifiers for the available buttons in the cookie banner.
 * @public
 */
export type CookieBannerButton = 'reject' | 'accept' | 'customize';

/**
 * Structure for defining the layout of buttons in the cookie banner.
 * Supports nesting for grouping buttons.
 * @public
 */
export type CookieBannerLayout = (CookieBannerButton | CookieBannerButton[])[];

const DEFAULT_LAYOUT: CookieBannerLayout = [['reject', 'accept'], 'customize'];

/**
 * Props for configuring and customizing the CookieBanner component.
 *
 * @remarks
 * Provides comprehensive customization options for the cookie banner's appearance
 * and behavior while maintaining compliance with privacy regulations.
 *
 * @public
 */
export interface CookieBannerProps {
	/**
	 * Custom styles to apply to the banner and its child components
	 * @remarks Allows for deep customization of the banner's appearance while maintaining accessibility
	 * @default undefined
	 */
	theme?: CookieBannerTheme;

	/**
	 * When true, removes all default styling from the component
	 * @remarks Useful for implementing completely custom designs
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Content to display as the banner's title
	 * @remarks Supports string or ReactNode for rich content
	 * @default undefined
	 */
	title?: ReactNode;

	/**
	 * Content to display as the banner's description
	 * @remarks Supports string or ReactNode for rich content
	 * @default undefined
	 */
	description?: ReactNode;

	/**
	 * Content to display on the reject button
	 * @remarks Required by GDPR for explicit consent rejection
	 * @default undefined
	 */
	rejectButtonText?: ReactNode;

	/**
	 * Content to display on the customize button
	 * @remarks Opens detailed consent preferences
	 * @default undefined
	 */
	customizeButtonText?: ReactNode;

	/**
	 * Content to display on the accept button
	 * @remarks Primary action for accepting cookie preferences
	 * @default undefined
	 */
	acceptButtonText?: ReactNode;

	/**
	 * When true, the cookie banner will lock the scroll of the page
	 * @remarks Useful for implementing a cookie banner that locks the scroll of the page
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * When true, the cookie banner will trap focus
	 * @remarks Useful for implementing a cookie banner that traps focus
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * When true, disables the entrance/exit animations
	 * @remarks Useful for environments where animations are not desired
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * Controls which legal links to display.
	 *
	 * - `undefined` (default): Shows all available legal links
	 * - `null`: Explicitly hides all legal links
	 * - Array of keys: Shows only the specified legal links
	 *
	 * @defaultValue undefined
	 *
	 * @example
	 * ```tsx
	 * // Show all links
	 * <CookieBanner legalLinks={undefined} />
	 *
	 * // Show no links
	 * <CookieBanner legalLinks={null} />
	 *
	 * // Show only privacy policy
	 * <CookieBanner legalLinks={['privacyPolicy']} />
	 * ```
	 *
	 * @remarks
	 * You must set the legal links in the ConsentManagerProvider options.
	 */
	legalLinks?: LegalLinksProps['links'];

	/**
	 * Defines the layout of buttons in the footer.
	 * Allows reordering and grouping of buttons.
	 *
	 * @defaultValue [['reject', 'accept'], 'customize']
	 */
	layout?: CookieBannerLayout;

	/**
	 * Specifies which button(s) should be highlighted as the primary action.
	 *
	 * @defaultValue 'customize'
	 */
	primaryButton?: CookieBannerButton | CookieBannerButton[];
}

export const CookieBanner: FC<CookieBannerProps> = ({
	theme: localTheme,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	title,
	description,
	rejectButtonText,
	customizeButtonText,
	acceptButtonText,
	legalLinks,
	layout = DEFAULT_LAYOUT,
	primaryButton = 'customize',
}) => {
	const { cookieBanner, common } = useTranslations();

	// Get global theme context and merge with local props
	const globalTheme = useTheme();

	// Merge global theme context with local props (local takes precedence)
	const mergedTheme = {
		...globalTheme.theme,
		...localTheme,
	};

	const mergedProps = {
		theme: mergedTheme,
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
	};

	const renderButton = (type: CookieBannerButton) => {
		const isPrimary = Array.isArray(primaryButton)
			? primaryButton.includes(type)
			: type === primaryButton;
		const variant = isPrimary ? 'primary' : undefined;

		switch (type) {
			case 'reject':
				return (
					<ConsentButton
						action="reject-consent"
						closeCookieBanner
						themeKey="banner.footer.reject-button"
						data-testid="cookie-banner-reject-button"
						variant={variant}
					>
						{rejectButtonText || common.rejectAll}
					</ConsentButton>
				);
			case 'accept':
				return (
					<ConsentButton
						action="accept-consent"
						closeCookieBanner
						themeKey="banner.footer.accept-button"
						data-testid="cookie-banner-accept-button"
						variant={variant}
					>
						{acceptButtonText || common.acceptAll}
					</ConsentButton>
				);
			case 'customize':
				return (
					<ConsentButton
						action="open-consent-dialog"
						closeCookieBanner
						themeKey="banner.footer.customize-button"
						data-testid="cookie-banner-customize-button"
						variant={variant}
					>
						{customizeButtonText || common.customize}
					</ConsentButton>
				);
		}
	};

	return (
		<ErrorBoundary
			fallback={<div>Something went wrong with the Cookie Banner.</div>}
		>
			<CookieBannerRoot {...mergedProps}>
				<CookieBannerCard aria-label={cookieBanner.title}>
					<CookieBannerHeader>
						<CookieBannerTitle>{title || cookieBanner.title}</CookieBannerTitle>
						<CookieBannerDescription legalLinks={legalLinks}>
							{description || cookieBanner.description}
						</CookieBannerDescription>
					</CookieBannerHeader>
					<CookieBannerFooter>
						{layout.map((item, index) => {
							if (Array.isArray(item)) {
								const groupKey = item.join('-');
								return (
									<CookieBannerFooterSubGroup
										key={groupKey ? `group-${groupKey}` : `group-${index}`}
									>
										{item.map((subItem) => (
											<Fragment key={subItem}>{renderButton(subItem)}</Fragment>
										))}
									</CookieBannerFooterSubGroup>
								);
							}
							return <Fragment key={item}>{renderButton(item)}</Fragment>;
						})}
					</CookieBannerFooter>
				</CookieBannerCard>
			</CookieBannerRoot>
		</ErrorBoundary>
	);
};
