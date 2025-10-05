'use client';

/**
 * @packageDocumentation
 * Provides the main cookie banner component for privacy consent management.
 * Implements an accessible, customizable banner following GDPR and CCPA requirements.
 */

import type { AnalyticsConsent } from 'c15t';
import type { FC, ReactNode } from 'react';
import { ConsentButton } from '~/components/shared/primitives/button';
import { useAnalytics } from '~/hooks/use-analytics';
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
import type { CookieBannerTheme } from './theme';

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
	 * Enable script management for analytics destinations
	 * @default true
	 */
	enableScriptManagement?: boolean;

	/**
	 * Enable consent synchronization across browser tabs
	 * @default true
	 */
	enableConsentSync?: boolean;

	/**
	 * Callback when user accepts all consent
	 */
	onAccept?: (consent: AnalyticsConsent) => void;

	/**
	 * Callback when user rejects all consent
	 */
	onReject?: (consent: AnalyticsConsent) => void;

	/**
	 * Callback when user customizes consent
	 */
	onCustomize?: (consent: AnalyticsConsent) => void;
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
	enableScriptManagement = true,
	enableConsentSync = true,
	onAccept,
	onReject,
	onCustomize,
}) => {
	const { cookieBanner, common } = useTranslations();
	const analytics = useAnalytics({
		enableScriptManagement,
		enableConsentSync,
	});

	// Get global theme context and merge with local props
	const globalTheme = useTheme();

	// Merge global theme context with local props (local takes precedence)
	const mergedTheme = {
		...globalTheme.theme,
		...localTheme,
	};

	// Handle consent changes
	const handleAcceptAll = async () => {
		const allConsent: AnalyticsConsent = {
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: true,
		};
		await analytics.updateConsent(allConsent, 'banner-accept-all');
		onAccept?.(allConsent);
	};

	const handleRejectAll = async () => {
		const minimalConsent: AnalyticsConsent = {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		};
		await analytics.updateConsent(minimalConsent, 'banner-reject-all');
		onReject?.(minimalConsent);
	};

	const handleCustomize = async () => {
		// This would typically open a customization dialog
		// For now, we'll just call the callback with current consent
		onCustomize?.(analytics.consent);
	};

	const mergedProps = {
		theme: mergedTheme,
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
	};

	return (
		<ErrorBoundary
			fallback={<div>Something went wrong with the Cookie Banner.</div>}
		>
			<CookieBannerRoot {...mergedProps}>
				<CookieBannerCard aria-label={cookieBanner.title}>
					<CookieBannerHeader>
						<CookieBannerTitle>{title || cookieBanner.title}</CookieBannerTitle>
						<CookieBannerDescription>
							{description || cookieBanner.description}
						</CookieBannerDescription>
					</CookieBannerHeader>
					<CookieBannerFooter>
						<CookieBannerFooterSubGroup>
							<ConsentButton
								action="reject-consent"
								closeCookieBanner
								themeKey="banner.footer.reject-button"
								data-testid="cookie-banner-reject-button"
								onClick={handleRejectAll}
							>
								{rejectButtonText || common.rejectAll}
							</ConsentButton>
							<ConsentButton
								action="accept-consent"
								closeCookieBanner
								themeKey="banner.footer.accept-button"
								data-testid="cookie-banner-accept-button"
								onClick={handleAcceptAll}
							>
								{acceptButtonText || common.acceptAll}
							</ConsentButton>
						</CookieBannerFooterSubGroup>
						<ConsentButton
							action="open-consent-dialog"
							variant="primary"
							closeCookieBanner
							themeKey="banner.footer.customize-button"
							data-testid="cookie-banner-customize-button"
							onClick={handleCustomize}
						>
							{customizeButtonText || common.customize}
						</ConsentButton>
					</CookieBannerFooter>
				</CookieBannerCard>
			</CookieBannerRoot>
		</ErrorBoundary>
	);
};

/**
 * Component type definition for the CookieBanner with its compound components.
 *
 * @remarks
 * This interface extends the base CookieBanner component with additional sub-components
 * that can be used to compose the banner's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 * @public
 */
