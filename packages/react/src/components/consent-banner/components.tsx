/**
 * @packageDocumentation
 * Provides the core components for building consent banners.
 * Implements accessible, customizable components following GDPR requirements.
 */

import type { PolicyRight } from '@c15t/schema/types';
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/consent-banner';
import { forwardRef as createForwardRef, useRef } from 'react';
import type {
	ButtonHTMLAttributes,
	MouseEvent,
	ReactNode,
	Ref,
	RefObject,
} from 'react';

import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import { useTranslations } from '~/component-hooks/use-translations';
import { Slot } from '~/components/shared/libs/slot';
import { usePolicyRule, useSetActiveUI } from '~/hooks';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { getSlotProps, mergeSlotProps } from '~/utils/merge-slot-props';

import { Box } from '../shared/primitives/box';
import type { BoxProps } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import type { ConsentButtonProps } from '../shared/primitives/button.types';
import type { InlineLegalLinksProps } from '../shared/primitives/legal-links';
import { InlineLegalLinks } from '../shared/primitives/legal-links';
import { useConsentBannerSurface } from './surface-context';
import { useBannerCopy } from './use-banner-copy';

const CONSENT_BANNER_TITLE_NAME = 'ConsentBannerTitle';
const CONSENT_BANNER_DESCRIPTION_NAME = 'ConsentBannerDescription';
const CONSENT_BANNER_FOOTER_NAME = 'ConsentBannerFooter';
const CONSENT_BANNER_CARD_NAME = 'ConsentBannerCard';
const CONSENT_BANNER_HEADER_NAME = 'ConsentBannerHeader';
const CONSENT_BANNER_FOOTER_SUB_GROUP_NAME = 'ConsentBannerFooterSubGroup';
const CONSENT_BANNER_REJECT_BUTTON_NAME = 'ConsentBannerRejectButton';
const CONSENT_BANNER_CUSTOMIZE_BUTTON_NAME = 'ConsentBannerCustomizeButton';
const CONSENT_BANNER_ACCEPT_BUTTON_NAME = 'ConsentBannerAcceptButton';
const CONSENT_BANNER_DISMISS_BUTTON_NAME = 'ConsentBannerDismissButton';
const CONSENT_BANNER_RIGHTS_NAME = 'ConsentBannerRights';
const CONSENT_BANNER_RIGHT_LINK_NAME = 'ConsentBannerRightLink';

/** English labels used when a language bundle has no `rights` section. */
const FALLBACK_RIGHT_LABELS: Record<ConsentBannerRight, string> = {
	'opt-out': 'Do not sell or share my data',
	preferences: 'Manage preferences',
};

/** Rights the banner can expose as links. `disclosure` is carried by legal links. */
export type ConsentBannerRight = Exclude<PolicyRight, 'disclosure'>;

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
	const { title } = useBannerCopy();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			data-testid="consent-banner-title"
			slotKey="banner.title"
			{...props}
			asChild
		>
			<h2>{children ?? title}</h2>
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
		const { description } = useBannerCopy();
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
					{children ?? description}
				</Comp>
			);
		}

		return (
			<div
				ref={ref as Ref<HTMLDivElement>}
				{...descriptionProps}
			>
				{children ?? description}
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
	const { blocking } = useConsentBannerSurface();
	const { title } = useBannerCopy();
	const localRef = useRef<HTMLDivElement>(null);
	const cardRef = (ref || localRef) as RefObject<HTMLElement>;

	// A blocking surface always traps focus and announces as a modal dialog.
	// A non-trapping card is a labelled region that never claims aria-modal.
	const shouldTrapFocus = blocking;
	useFocusTrap(shouldTrapFocus, cardRef);

	return (
		<Box
			ref={cardRef as Ref<HTMLDivElement>}
			tabIndex={-1}
			baseClassName={styles.card}
			data-testid="consent-banner-card"
			slotKey="banner.card"
			aria-label={props['aria-label'] || title}
			aria-modal={shouldTrapFocus ? 'true' : undefined}
			role={shouldTrapFocus ? 'dialog' : 'region'}
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

/**
 * Button that acknowledges a notice prompt.
 *
 * @remarks
 * Records a notice dismissal without recording a category choice, so no
 * choice callbacks fire. Only rendered when the active policy requires a
 * notice. Uses `common.acknowledge`, with `common.dismiss` as a fallback.
 * Children or `dismissButtonText` override the label.
 * Themed through `theme.consentActions.dismiss`.
 *
 * @example
 * ```tsx
 * <ConsentBannerDismissButton>
 *   Got it
 * </ConsentBannerDismissButton>
 * ```
 */
const ConsentBannerDismissButton = createForwardRef<
	HTMLButtonElement,
	ConsentButtonProps
>(({ children, ...props }, ref) => {
	const { common } = useTranslations();
	const { noStyle } = useTheme();
	return (
		<ConsentButton
			ref={ref as Ref<HTMLButtonElement>}
			action="dismiss-notice"
			consentAction="dismiss"
			data-action="dismiss"
			data-testid="consent-banner-dismiss-button"
			noStyle={noStyle}
			{...props}
		>
			{children ?? common.acknowledge ?? common.dismiss}
		</ConsentButton>
	);
});

ConsentBannerDismissButton.displayName = CONSENT_BANNER_DISMISS_BUTTON_NAME;

/**
 * Props for {@link ConsentBannerRightLink}.
 * @public
 */
export interface ConsentBannerRightLinkProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'children' | 'type'
> {
	/** Which persistent right the control keeps reachable. */
	right: ConsentBannerRight;
	/** Custom label. Defaults to the `rights` translation for `right`. */
	children?: ReactNode;
	/** Render the child element instead of a button, keeping the behavior. */
	asChild?: boolean;
	/** Skip the banner stylesheet for this control. */
	noStyle?: boolean;
}

/**
 * Underlined text control that keeps a persistent right reachable from the
 * banner.
 *
 * @remarks
 * Opens the preference center, where the subject can opt out or change
 * category preferences. Renders as plain underlined text through the
 * `rightLink` class and the `banner.rightLink` slot so the primary action
 * beside it keeps the emphasis. The label comes from the `rights`
 * translations and children override it. Carries `data-action="right"`,
 * `data-right`, and `data-c15t-rights` for styling hooks. With `asChild`
 * the child element, such as a link to a dedicated opt-out page, receives
 * the same class, attributes, and click handling.
 *
 * @example
 * ```tsx
 * <ConsentBannerRightLink right="opt-out" />
 * ```
 */
const ConsentBannerRightLink = createForwardRef<
	HTMLButtonElement,
	ConsentBannerRightLinkProps
>(
	(
		{ right, children, asChild, className, style, noStyle, onClick, ...props },
		ref
	) => {
		const { rights } = useTranslations();
		const policy = usePolicyRule();
		const { components } = useUIConfig();
		const { noStyle: contextNoStyle } = useTheme();
		const setActiveUI = useSetActiveUI();
		const label =
			(right === 'opt-out' ? rights?.optOut : rights?.preferences) ??
			FALLBACK_RIGHT_LABELS[right];
		const mergedProps = mergeSlotProps(
			getSlotProps(components, 'banner.rightLink'),
			{
				baseClassName: styles.rightLink,
				className,
				noStyle: noStyle ?? contextNoStyle,
				style,
			}
		);
		const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
			onClick?.(event);
			if (!event.defaultPrevented) {
				setActiveUI('dialog');
			}
		};
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				ref={ref as Ref<HTMLButtonElement>}
				type={asChild ? undefined : 'button'}
				{...mergedProps}
				data-action="right"
				data-right={right}
				data-c15t-rights={policy.rights.join(' ')}
				data-testid={`consent-banner-right-link-${right}`}
				onClick={handleClick}
				{...props}
			>
				{children ?? label}
			</Comp>
		);
	}
);

ConsentBannerRightLink.displayName = CONSENT_BANNER_RIGHT_LINK_NAME;

/**
 * Props for {@link ConsentBannerRights}.
 * @public
 */
export interface ConsentBannerRightsProps extends Omit<BoxProps, 'slotKey'> {
	/**
	 * Additional preferences buttons to render. Defaults to the resolved
	 * presentation recommendation: a notice under an opt-out rule shows the
	 * opt-out control (which also keeps preferences reachable), and a choice
	 * prompt with customize shows nothing.
	 */
	rights?: readonly PolicyRight[];
}

/**
 * Group of additional buttons that open preferences.
 *
 * @remarks
 * Renders nothing when no additional preferences button is recommended. Children replace the default
 * controls; use {@link ConsentBannerRightLink} to keep the behavior.
 *
 * @example
 * ```tsx
 * <ConsentBannerRights />
 * ```
 */
const ConsentBannerRights = createForwardRef<
	HTMLDivElement,
	ConsentBannerRightsProps
>(({ rights, children, ...props }, ref) => {
	const { banner } = useHeadlessConsentUI();
	const resolvedRights = (rights ?? banner.preferenceControls).filter(
		(right): right is ConsentBannerRight => right !== 'disclosure'
	);
	if (children === undefined && resolvedRights.length === 0) {
		return null;
	}
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.rights}
			data-testid="consent-banner-rights"
			slotKey="banner.rights"
			{...props}
		>
			{children ??
				resolvedRights.map((right) => (
					<ConsentBannerRightLink
						key={right}
						right={right}
					/>
				))}
		</Box>
	);
});

ConsentBannerRights.displayName = CONSENT_BANNER_RIGHTS_NAME;

const Title = ConsentBannerTitle;
const Description = ConsentBannerDescription;
const Footer = ConsentBannerFooter;
const FooterSubGroup = ConsentBannerFooterSubGroup;
const Card = ConsentBannerCard;
const Header = ConsentBannerHeader;
const RejectButton = ConsentBannerRejectButton;
const CustomizeButton = ConsentBannerCustomizeButton;
const AcceptButton = ConsentBannerAcceptButton;
const DismissButton = ConsentBannerDismissButton;
const Rights = ConsentBannerRights;
const RightLink = ConsentBannerRightLink;

export {
	AcceptButton,
	Card,
	ConsentBannerAcceptButton,
	ConsentBannerCard,
	ConsentBannerCustomizeButton,
	ConsentBannerDescription,
	ConsentBannerDismissButton,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerHeader,
	ConsentBannerRejectButton,
	ConsentBannerRightLink,
	ConsentBannerRights,
	ConsentBannerTitle,
	CustomizeButton,
	Description,
	DismissButton,
	Footer,
	FooterSubGroup,
	Header,
	RejectButton,
	RightLink,
	Rights,
	Title,
};
