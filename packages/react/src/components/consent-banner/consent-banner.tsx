'use client';

import type * as C15tCoreTypes from '@c15t/core';
import type { PromptPosition, PromptVariant } from '@c15t/core';
/**
 * @packageDocumentation
 * Provides the main consent banner component for privacy consent management.
 * Implements an accessible, customizable banner following GDPR requirements.
 */
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/consent-banner';
import type { SurfacePresentation } from '@c15t/ui/utils';
import { Fragment } from 'react';
import type { FC, ReactNode } from 'react';

import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import { Box } from '~/components/shared/primitives/box';
import type { InlineLegalLinksProps } from '~/components/shared/primitives/legal-links';
import { BrandingLink } from '~/components/shared/ui/branding';
import { useComponentConfig } from '~/hooks/use-component-config';

import { ConsentBannerRoot } from './atoms/root';
import {
	ConsentBannerAcceptButton,
	ConsentBannerCard,
	ConsentBannerCustomizeButton,
	ConsentBannerDescription,
	ConsentBannerDismissButton,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerHeader,
	ConsentBannerRejectButton,
	ConsentBannerRights,
	ConsentBannerTitle,
} from './components';
import { ErrorBoundary } from './error-boundary';
import { resolveBannerPrimaryActions } from './resolve-banner-primary-actions';

/**
 * Identifiers for the available buttons in the consent banner.
 * @public
 */
export type ConsentBannerButton =
	| 'reject'
	| 'accept'
	| 'customize'
	| 'dismiss'
	| 'save';

/**
 * Structure for defining the layout of buttons in the consent banner.
 * Supports nesting for grouping buttons.
 * @public
 */
export type ConsentBannerLayout = (
	| ConsentBannerButton
	| ConsentBannerButton[]
)[];

/**
 * Props for configuring and customizing the ConsentBanner component.
 *
 * @remarks
 * Provides comprehensive customization options for the consent banner's appearance
 * and behavior while maintaining compliance with privacy regulations.
 *
 * @public
 */
export interface ConsentBannerProps {
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
	 * @remarks Primary action for accepting consent preferences
	 * @default undefined
	 */
	acceptButtonText?: ReactNode;

	/**
	 * Content to display on the dismiss button
	 * @remarks Only rendered when the active policy requires a notice prompt
	 * @default undefined
	 */
	dismissButtonText?: ReactNode;

	/**
	 * Legacy setting for a blocking banner.
	 * @deprecated Use `blocking` to control focus, scroll and backdrop together.
	 */
	scrollLock?: boolean;

	/**
	 * When true, the consent banner will trap focus
	 * @remarks Useful for implementing a consent banner that traps focus
	 * @deprecated Use `blocking` to control focus, scroll and backdrop together.
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
	 * <ConsentBanner legalLinks={undefined} />
	 *
	 * // Show no links
	 * <ConsentBanner legalLinks={null} />
	 *
	 * // Show only privacy policy
	 * <ConsentBanner legalLinks={['privacyPolicy']} />
	 * ```
	 *
	 * @remarks
	 * You must set the legal links in the ConsentProvider options.
	 */
	legalLinks?: InlineLegalLinksProps['links'];

	/**
	 * When true, hides the branding tag on the banner.
	 * @default false
	 */
	hideBranding?: boolean;

	/**
	 * Defines the layout of buttons in the footer.
	 * Allows reordering and grouping of buttons.
	 *
	 * @defaultValue [['reject', 'accept'], 'customize']
	 */
	layout?: ConsentBannerLayout;

	/**
	 * Defines how footer button groups flow.
	 *
	 * @defaultValue 'row'
	 */
	direction?: SurfacePresentation['direction'];

	/**
	 * Specifies which button(s) should be highlighted as the primary action.
	 *
	 * @defaultValue 'customize'
	 */
	primaryButton?: ConsentBannerButton | ConsentBannerButton[];

	/**
	 * Which consent models this banner responds to.
	 * @default ['opt-in']
	 */
	models?: C15tCoreTypes.Model[];

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'banner'
	 */
	uiSource?: string;

	/**
	 * Shape of the prompt: `floating` card, full-width `bar`, compact
	 * `widget`, or centered `wall`. Overrides `presentation.prompt.variant`.
	 * @remarks Every prompt defaults to `floating`. Notices cannot use `wall`.
	 */
	variant?: PromptVariant;

	/**
	 * Placement of the prompt. Overrides `presentation.prompt.position`.
	 * @remarks Must be valid for the resolved variant; otherwise the variant
	 * default is used and a development diagnostic is logged. Host-chosen
	 * positions are never mirrored for right-to-left text.
	 */
	position?: PromptPosition;

	/**
	 * Backdrop, scroll lock, focus trap and no outside dismissal, as one
	 * value. Overrides `presentation.prompt.blocking`.
	 * @remarks `wall` is always blocking; a notice never is.
	 */
	blocking?: boolean;
}

export const ConsentBanner: FC<ConsentBannerProps> = ({
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	title,
	description,
	rejectButtonText,
	customizeButtonText,
	acceptButtonText,
	dismissButtonText,
	legalLinks,
	hideBranding = false,
	layout,
	direction,
	primaryButton,
	models,
	uiSource,
	variant,
	position,
	blocking,
}) => {
	const primaryActions =
		typeof primaryButton === 'string' ? [primaryButton] : primaryButton;
	const { banner } = useHeadlessConsentUI({
		prompt: {
			blocking,
			direction,
			layout,
			position,
			primaryActions,
			scrollLock: localScrollLock,
			trapFocus: localTrapFocus,
			variant,
		},
	});

	const resolvedScrollLock = banner.scrollLock;

	// Merge local props with global theme context
	const config = useComponentConfig({
		disableAnimation: localDisableAnimation,
		noStyle: localNoStyle,
		scrollLock: resolvedScrollLock,
		trapFocus: banner.trapFocus,
	});

	const { orderedActions } = banner;
	const allowedActions = new Set(orderedActions);
	const effectivePrimaryButton = resolveBannerPrimaryActions(
		banner.primaryActions,
		orderedActions
	);
	const resolvedLayout = banner.actionGroups;
	const resolvedDirection = banner.direction;
	const { shouldFillActions } = banner;

	const renderButton = (type: ConsentBannerButton, className?: string) => {
		if (!allowedActions.has(type)) {
			return null;
		}

		const isPrimary = effectivePrimaryButton.includes(type);

		switch (type) {
			case 'reject':
				return (
					<ConsentBannerRejectButton
						consentAction="reject"
						isPrimary={isPrimary}
						className={className}
						data-action="reject"
						data-testid="consent-banner-reject-button"
					>
						{rejectButtonText}
					</ConsentBannerRejectButton>
				);
			case 'accept':
				return (
					<ConsentBannerAcceptButton
						consentAction="accept"
						isPrimary={isPrimary}
						className={className}
						data-action="accept"
						data-testid="consent-banner-accept-button"
					>
						{acceptButtonText}
					</ConsentBannerAcceptButton>
				);
			case 'customize':
				return (
					<ConsentBannerCustomizeButton
						consentAction="customize"
						isPrimary={isPrimary}
						className={className}
						data-action="customize"
						data-testid="consent-banner-customize-button"
					>
						{customizeButtonText}
					</ConsentBannerCustomizeButton>
				);
			case 'dismiss':
				return (
					<ConsentBannerDismissButton
						consentAction="dismiss"
						isPrimary={isPrimary}
						className={className}
						data-action="dismiss"
						data-testid="consent-banner-dismiss-button"
					>
						{dismissButtonText}
					</ConsentBannerDismissButton>
				);
			case 'save':
				return null;
			default: {
				const _exhaustive: never = type;
				throw new Error(`Unhandled consent banner button type: ${_exhaustive}`);
			}
		}
	};

	return (
		<ErrorBoundary
			fallback={<div>Something went wrong with the Consent Banner.</div>}
		>
			<ConsentBannerRoot
				{...config}
				models={models}
				uiSource={uiSource}
				variant={variant}
				position={position}
				blocking={blocking}
			>
				<Box
					baseClassName={styles.cardShell}
					slotKey="banner.cardShell"
				>
					<BrandingLink
						hideBranding={hideBranding}
						variant="banner-tag"
						slotContext="banner"
						data-testid="consent-banner-branding"
					/>
					<ConsentBannerCard>
						<ConsentBannerHeader>
							<ConsentBannerTitle>{title}</ConsentBannerTitle>
							<ConsentBannerDescription legalLinks={legalLinks}>
								{description}
							</ConsentBannerDescription>
						</ConsentBannerHeader>
						<ConsentBannerFooter
							className={actionStyles.actionRoot}
							data-direction={resolvedDirection}
							data-fill={shouldFillActions ? true : undefined}
							data-split={
								resolvedLayout.length > 1 && !shouldFillActions
									? true
									: undefined
							}
						>
							<ConsentBannerRights rights={banner.preferenceControls} />
							{resolvedLayout.map((item, index) => {
								if (Array.isArray(item)) {
									const filteredItems = item.filter((subItem) =>
										allowedActions.has(subItem)
									);
									if (filteredItems.length === 0) {
										return null;
									}
									const groupKey = item.join('-');
									return (
										<ConsentBannerFooterSubGroup
											key={groupKey ? `group-${groupKey}` : `group-${index}`}
											className={actionStyles.actionGroup}
											data-direction={resolvedDirection}
											data-fill={shouldFillActions ? true : undefined}
										>
											{filteredItems.map((subItem) => (
												<Fragment key={subItem}>
													{renderButton(subItem)}
												</Fragment>
											))}
										</ConsentBannerFooterSubGroup>
									);
								}
								if (!allowedActions.has(item)) {
									return null;
								}
								return <Fragment key={item}>{renderButton(item)}</Fragment>;
							})}
						</ConsentBannerFooter>
					</ConsentBannerCard>
				</Box>
			</ConsentBannerRoot>
		</ErrorBoundary>
	);
};

/**
 * Component type definition for the ConsentBanner with its compound components.
 *
 * @remarks
 * This interface extends the base ConsentBanner component with additional sub-components
 * that can be used to compose the banner's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 * @public
 */
