/**
 * @packageDocumentation
 * Provides the core components for building consent banners.
 * Implements accessible, customizable components following GDPR requirements.
 */

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import { forwardRef, type Ref, type RefObject, useRef } from 'react';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useTranslations } from '~/v3/component-hooks/use-translations';
import { Box, type BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';
import type { InlineLegalLinksProps } from '../shared/primitives/legal-links';
import { InlineLegalLinks } from '../shared/primitives/legal-links';

const CONSENT_BANNER_TITLE_NAME = 'ConsentBannerTitle';
const CONSENT_BANNER_DESCRIPTION_NAME = 'ConsentBannerDescription';
const CONSENT_BANNER_FOOTER_NAME = 'ConsentBannerFooter';
const CONSENT_BANNER_CARD_NAME = 'ConsentBannerCard';
const CONSENT_BANNER_HEADER_NAME = 'ConsentBannerHeader';
const CONSENT_BANNER_FOOTER_SUB_GROUP_NAME = 'ConsentBannerFooterSubGroup';
const CONSENT_BANNER_REJECT_BUTTON_NAME = 'ConsentBannerRejectButton';
const CONSENT_BANNER_CUSTOMIZE_BUTTON_NAME = 'ConsentBannerCustomizeButton';
const CONSENT_BANNER_ACCEPT_BUTTON_NAME = 'ConsentBannerAcceptButton';

/**
 * Title component for the consent banner.
 *
 * @remarks
 * Provides the main heading for the consent notice.
 * Implements proper heading semantics and supports theming.
 *
 * @example
 * ```tsx
 * <ConsentBannerTitle>
 *   Cookie Preferences
 * </ConsentBannerTitle>
 * ```
 */
const ConsentBannerTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	const { cookieBanner: consentBanner } = useTranslations();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			data-testid="consent-banner-title"
			themeKey="consentBannerTitle"
			{...props}
		>
			{children ?? consentBanner.title}
		</Box>
	);
});

ConsentBannerTitle.displayName = CONSENT_BANNER_TITLE_NAME;

/**
 * Description component for the consent banner.
 *
 * @remarks
 * Provides explanatory text about cookie usage and privacy policies.
 * Supports rich text content and proper accessibility attributes.
 * Can include legal links inline with the description.
 *
 * @example
 * ```tsx
 * <ConsentBannerDescription>
 *   We use cookies to enhance your browsing experience and analyze our traffic.
 * </ConsentBannerDescription>
 * ```
 */
const ConsentBannerDescription = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'> & {
		legalLinks?: InlineLegalLinksProps['links'];
	}
>(({ children, legalLinks, asChild, ...props }, ref) => {
	const { cookieBanner: consentBanner } = useTranslations();

	if (asChild) {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.description}
				data-testid="consent-banner-description"
				themeKey="consentBannerDescription"
				asChild={asChild}
				{...props}
			>
				{children ?? consentBanner.description}
			</Box>
		);
	}

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.description}
			data-testid="consent-banner-description"
			themeKey="consentBannerDescription"
			asChild={asChild}
			{...props}
		>
			{children ?? consentBanner.description}
			<InlineLegalLinks
				links={legalLinks}
				themeKey="consentBannerDescription"
				testIdPrefix="consent-banner-legal-link"
			/>
		</Box>
	);
});

ConsentBannerDescription.displayName = CONSENT_BANNER_DESCRIPTION_NAME;

/**
 * Footer component for the consent banner.
 *
 * @remarks
 * Contains action buttons and additional information.
 * Implements proper layout and spacing for action items.
 *
 * @example
 * ```tsx
 * <ConsentBannerFooter>
 *   <ConsentBannerRejectButton>Reject All</ConsentBannerRejectButton>
 *   <ConsentBannerAcceptButton>Accept All</ConsentBannerAcceptButton>
 * </ConsentBannerFooter>
 * ```
 */
const ConsentBannerFooter = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="consent-banner-footer"
			themeKey="consentBannerFooter"
			{...props}
		>
			{children}
		</Box>
	);
});

ConsentBannerFooter.displayName = CONSENT_BANNER_FOOTER_NAME;

/**
 * Card component for the consent banner.
 *
 * @remarks
 * Provides the main container for the consent notice.
 * Implements proper elevation and layout structure.
 *
 * @example
 * ```tsx
 * <ConsentBannerCard>
 *   <ConsentBannerHeader>
 *     <ConsentBannerTitle>Cookie Notice</ConsentBannerTitle>
 *   </ConsentBannerHeader>
 * </ConsentBannerCard>
 * ```
 */
const ConsentBannerCard = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	const { trapFocus } = useTheme();
	const { cookieBanner } = useTranslations();
	const localRef = useRef<HTMLDivElement>(null);
	const cardRef = (ref || localRef) as RefObject<HTMLElement>;

	// Call the useFocusTrap hook with the appropriate parameters
	const shouldTrapFocus = Boolean(trapFocus);
	useFocusTrap(shouldTrapFocus, cardRef);

	return (
		<Box
			ref={cardRef as Ref<HTMLDivElement>}
			tabIndex={0}
			baseClassName={styles.card}
			data-testid="consent-banner-card"
			themeKey="consentBannerCard"
			aria-label={props['aria-label'] || cookieBanner.title}
			aria-modal={shouldTrapFocus ? 'true' : undefined}
			role={shouldTrapFocus ? 'dialog' : undefined}
			{...props}
		>
			{children}
		</Box>
	);
});

ConsentBannerCard.displayName = CONSENT_BANNER_CARD_NAME;

/**
 * Header component for the consent banner.
 *
 * @remarks
 * Contains the title and description sections.
 * Implements proper spacing and layout for header content.
 */
const ConsentBannerHeader = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.header}
			data-testid="consent-banner-header"
			themeKey="consentBannerHeader"
			{...props}
		>
			{children}
		</Box>
	);
});

ConsentBannerHeader.displayName = CONSENT_BANNER_HEADER_NAME;

/**
 * Footer sub-group component for organizing related actions.
 *
 * @remarks
 * Groups related buttons or controls in the footer.
 * Implements proper spacing and alignment for button groups.
 */
const ConsentBannerFooterSubGroup = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footerSubGroup}
			data-testid="consent-banner-footer-sub-group"
			themeKey="consentBannerFooterSubGroup"
			{...props}
		>
			{children}
		</Box>
	);
});

ConsentBannerFooterSubGroup.displayName = CONSENT_BANNER_FOOTER_SUB_GROUP_NAME;

/**
 * Button to reject all non-essential cookies.
 *
 * @remarks
 * Implements the reject action for consent preferences.
 * Provides proper accessibility attributes and keyboard interaction.
 *
 * @example
 * ```tsx
 * <ConsentBannerRejectButton>
 *   Reject All Cookies
 * </ConsentBannerRejectButton>
 * ```
 */
const ConsentBannerRejectButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="reject-consent"
			data-testid="consent-banner-reject-button"
			closeConsentBanner
			{...props}
		>
			{children ?? common.rejectAll}
		</ConsentButton>
	);
});

ConsentBannerRejectButton.displayName = CONSENT_BANNER_REJECT_BUTTON_NAME;

/**
 * Button to open detailed consent preferences.
 *
 * @remarks
 * Opens the detailed consent management interface.
 * Implements proper focus management and keyboard interaction.
 */
const ConsentBannerCustomizeButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			data-testid="consent-banner-customize-button"
			{...props}
		>
			{children ?? common.customize}
		</ConsentButton>
	);
});

ConsentBannerCustomizeButton.displayName = CONSENT_BANNER_CUSTOMIZE_BUTTON_NAME;

/**
 * Button to accept all cookies.
 *
 * @remarks
 * Implements the accept action for consent preferences.
 * Provides proper accessibility attributes and keyboard interaction.
 * Supports theming and style customization.
 *
 * @example
 * ```tsx
 * <ConsentBannerAcceptButton>
 *   Accept All Cookies
 * </ConsentBannerAcceptButton>
 * ```
 */
const ConsentBannerAcceptButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	const { noStyle } = useTheme();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="accept-consent"
			data-testid="consent-banner-accept-button"
			closeConsentBanner
			noStyle={noStyle}
			{...props}
		>
			{children ?? common.acceptAll}
		</ConsentButton>
	);
});

ConsentBannerAcceptButton.displayName = CONSENT_BANNER_ACCEPT_BUTTON_NAME;

const Title = ConsentBannerTitle;
const Description = ConsentBannerDescription;
const Footer = ConsentBannerFooter;
const FooterSubGroup = ConsentBannerFooterSubGroup;
const Card = ConsentBannerCard;
const Header = ConsentBannerHeader;
const RejectButton = ConsentBannerRejectButton;
const CustomizeButton = ConsentBannerCustomizeButton;
const AcceptButton = ConsentBannerAcceptButton;

export {
	AcceptButton,
	Card,
	ConsentBannerAcceptButton,
	ConsentBannerCard,
	ConsentBannerCustomizeButton,
	ConsentBannerDescription,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerHeader,
	ConsentBannerRejectButton,
	ConsentBannerTitle,
	CustomizeButton,
	Description,
	Footer,
	FooterSubGroup,
	Header,
	RejectButton,
	Title,
};
