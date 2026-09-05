/**
 * @packageDocumentation
 * Provides the core components for building consent banners.
 * Implements accessible, customizable components following GDPR requirements.
 */

import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/consent-banner';
import { forwardRef as createForwardRef, useRef } from 'react';
import type { Ref, RefObject } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { Slot } from '~/components/shared/libs/slot';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { Box } from '../shared/primitives/box';
import type { BoxProps } from '../shared/primitives/box';
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
const ConsentBannerTitle = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => {
	const { cookieBanner: consentBanner } = useTranslations();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			data-testid="consent-banner-title"
			slotKey="banner.title"
			{...props}
			asChild
		>
			<h2>{children ?? consentBanner.title}</h2>
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
const ConsentBannerDescription = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'> & {
		legalLinks?: InlineLegalLinksProps['links'];
	}
>(
	(
		{ children, legalLinks, asChild, className, style, noStyle, ...props },
		ref
	) => {
		const { cookieBanner: consentBanner } = useTranslations();
		const { components } = useUIConfig();
		const { noStyle: contextNoStyle } = useTheme();
		const context = 'banner';
		const descriptionProps = mergeSlotProps(
			components?.description?.[context],
			{
				baseClassName: styles.description,
				className,
				'data-context': context,
				'data-testid': 'consent-banner-description',
				noStyle: noStyle ?? contextNoStyle,
				style,
				...props,
			}
		);

		if (asChild) {
			const Comp = Slot;
			return (
				<Comp
					ref={ref as Ref<HTMLDivElement>}
					{...descriptionProps}
				>
					{children ?? consentBanner.description}
				</Comp>
			);
		}

		return (
			<div
				ref={ref as Ref<HTMLDivElement>}
				{...descriptionProps}
			>
				{children ?? consentBanner.description}
				<InlineLegalLinks
					links={legalLinks}
					context="banner"
					testIdPrefix="consent-banner-legal-link"
				/>
			</div>
		);
	}
);

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
const ConsentBannerFooter = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, className, style, ...props }, ref) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const actionProps = mergeSlotProps(components?.banner?.actions, {
		baseClassName: className,
		noStyle,
		style,
		...props,
	});

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="consent-banner-footer"
			slotKey="banner.footer"
			{...actionProps}
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
const ConsentBannerCard = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
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
			tabIndex={-1}
			baseClassName={styles.card}
			data-testid="consent-banner-card"
			slotKey="banner.card"
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
const ConsentBannerHeader = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={styles.header}
		data-testid="consent-banner-header"
		slotKey="banner.header"
		{...props}
	>
		{children}
	</Box>
));

ConsentBannerHeader.displayName = CONSENT_BANNER_HEADER_NAME;

/**
 * Footer sub-group component for organizing related actions.
 *
 * @remarks
 * Groups related buttons or controls in the footer.
 * Implements proper spacing and alignment for button groups.
 */
const ConsentBannerFooterSubGroup = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={actionStyles.actionGroup}
		data-testid="consent-banner-footer-sub-group"
		slotKey="banner.actionGroup"
		{...props}
	>
		{children}
	</Box>
));

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
const ConsentBannerRejectButton = createForwardRef<
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
const ConsentBannerCustomizeButton = createForwardRef<
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
const ConsentBannerAcceptButton = createForwardRef<
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
