'use client';

import type { Ref, RefObject } from 'preact';
import { forwardRef } from 'preact/compat';
import { useRef } from 'preact/compat';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { Box, type BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';
import styles from './cookie-banner.module.css';

const COOKIE_BANNER_TITLE_NAME = 'CookieBannerTitle';
const COOKIE_BANNER_DESCRIPTION_NAME = 'CookieBannerDescription';
const COOKIE_BANNER_FOOTER_NAME = 'CookieBannerFooter';
const COOKIE_BANNER_CARD_NAME = 'CookieBannerCard';
const COOKIE_BANNER_HEADER_NAME = 'CookieBannerHeader';
const COOKIE_BANNER_FOOTER_SUB_GROUP_NAME = 'CookieBannerFooterSubGroup';
const COOKIE_BANNER_REJECT_BUTTON_NAME = 'CookieBannerRejectButton';
const COOKIE_BANNER_CUSTOMIZE_BUTTON_NAME = 'CookieBannerCustomizeButton';
const COOKIE_BANNER_ACCEPT_BUTTON_NAME = 'CookieBannerAcceptButton';

/**
 * Title component for the cookie banner.
 */
const CookieBannerTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			data-testid="cookie-banner-title"
			themeKey="banner.header.title"
			{...props}
		>
			{children}
		</Box>
	);
});
CookieBannerTitle.displayName = COOKIE_BANNER_TITLE_NAME;

/**
 * Description component for the cookie banner.
 */
const CookieBannerDescription = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.description}
			data-testid="cookie-banner-description"
			themeKey="banner.header.description"
			{...props}
		>
			{children}
		</Box>
	);
});
CookieBannerDescription.displayName = COOKIE_BANNER_DESCRIPTION_NAME;

/**
 * Footer component for the cookie banner.
 */
const CookieBannerFooter = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="cookie-banner-footer"
			themeKey="banner.footer"
			{...props}
		>
			{children}
		</Box>
	);
});
CookieBannerFooter.displayName = COOKIE_BANNER_FOOTER_NAME;

/**
 * Card component for the cookie banner.
 */
const CookieBannerCard = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		const { trapFocus } = useTheme();
		const localRef = useRef<HTMLDivElement>(null);
		const cardRef = (ref || localRef) as RefObject<HTMLElement>;

		// Trap focus when enabled by theme
		const shouldTrapFocus = Boolean(trapFocus);
		useFocusTrap(shouldTrapFocus, cardRef);

		return (
			<Box
				ref={cardRef as Ref<HTMLDivElement>}
				tabIndex={0}
				baseClassName={styles.card}
				data-testid="cookie-banner-card"
				themeKey="banner.card"
				aria-label={props['aria-label'] || 'Cookie Banner'}
				aria-modal={shouldTrapFocus || undefined}
				role={shouldTrapFocus ? 'dialog' : undefined}
				{...props}
			>
				{children}
			</Box>
		);
	}
);
CookieBannerCard.displayName = COOKIE_BANNER_CARD_NAME;

/**
 * Header component for the cookie banner.
 */
const CookieBannerHeader = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.header}
			data-testid="cookie-banner-header"
			themeKey="banner.header.root"
			{...props}
		>
			{children}
		</Box>
	);
});
CookieBannerHeader.displayName = COOKIE_BANNER_HEADER_NAME;

/**
 * Footer sub-group component for organising related actions.
 */
const CookieBannerFooterSubGroup = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footerSubGroup}
			data-testid="cookie-banner-footer-sub-group"
			themeKey="banner.footer.sub-group"
			{...props}
		>
			{children}
		</Box>
	);
});
CookieBannerFooterSubGroup.displayName = COOKIE_BANNER_FOOTER_SUB_GROUP_NAME;

/**
 * Button to reject all non-essential cookies.
 */
const CookieBannerRejectButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="reject-consent"
			data-testid="cookie-banner-reject-button"
			closeCookieBanner
			{...props}
		>
			{children}
		</ConsentButton>
	);
});
CookieBannerRejectButton.displayName = COOKIE_BANNER_REJECT_BUTTON_NAME;

/**
 * Button to open detailed cookie preferences.
 */
const CookieBannerCustomizeButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="open-consent-dialog"
			data-testid="cookie-banner-customize-button"
			{...props}
		>
			{children}
		</ConsentButton>
	);
});
CookieBannerCustomizeButton.displayName = COOKIE_BANNER_CUSTOMIZE_BUTTON_NAME;

/**
 * Button to accept all cookies.
 */
const CookieBannerAcceptButton = forwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { noStyle } = useTheme();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="accept-consent"
			variant="primary"
			data-testid="cookie-banner-accept-button"
			closeCookieBanner
			noStyle={noStyle}
			{...props}
		>
			{children}
		</ConsentButton>
	);
});
CookieBannerAcceptButton.displayName = COOKIE_BANNER_ACCEPT_BUTTON_NAME;

const Title = CookieBannerTitle;
const Description = CookieBannerDescription;
const Footer = CookieBannerFooter;
const FooterSubGroup = CookieBannerFooterSubGroup;
const Card = CookieBannerCard;
const Header = CookieBannerHeader;
const RejectButton = CookieBannerRejectButton;
const CustomizeButton = CookieBannerCustomizeButton;
const AcceptButton = CookieBannerAcceptButton;

export {
	CookieBannerTitle,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerCard,
	CookieBannerHeader,
	CookieBannerRejectButton,
	CookieBannerCustomizeButton,
	CookieBannerAcceptButton,
	Title,
	Description,
	Footer,
	FooterSubGroup,
	Card,
	Header,
	RejectButton,
	CustomizeButton,
	AcceptButton,
};
