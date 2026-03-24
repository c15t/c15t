'use client';

/**
 * @packageDocumentation
 * Provides the main consent banner component for privacy consent management.
 * Implements an accessible, customizable banner following GDPR requirements.
 */

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import { type FC, Fragment, type ReactNode } from 'react';
import {
	type PolicyUiAction,
	type PolicyUiActionDirection,
	shouldFillPolicyActions,
} from '~/components/shared/libs/policy-actions';
import type { InlineLegalLinksProps } from '~/components/shared/primitives/legal-links';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useHeadlessConsentUI } from '~/hooks/use-headless-consent-ui';
import { useTranslations } from '~/hooks/use-translations';
import { cnExt as cn } from '~/utils/cn';
import { ConsentBannerRoot } from './atoms/root';
import {
	ConsentBannerAcceptButton,
	ConsentBannerCard,
	ConsentBannerCustomizeButton,
	ConsentBannerDescription,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerHeader,
	ConsentBannerRejectButton,
	ConsentBannerTitle,
} from './components';
import { ErrorBoundary } from './error-boundary';

/**
 * Identifiers for the available buttons in the consent banner.
 * @public
 */
export type ConsentBannerButton = 'reject' | 'accept' | 'customize';

/**
 * Structure for defining the layout of buttons in the consent banner.
 * Supports nesting for grouping buttons.
 * @public
 */
export type ConsentBannerLayout = (
	| ConsentBannerButton
	| ConsentBannerButton[]
)[];

const DEFAULT_LAYOUT: ConsentBannerLayout = [['reject', 'accept'], 'customize'];

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
	 * When true, the consent banner will lock the scroll of the page
	 * @remarks Useful for implementing a consent banner that locks the scroll of the page
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * When true, the consent banner will trap focus
	 * @remarks Useful for implementing a consent banner that traps focus
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
	 * You must set the legal links in the ConsentManagerProvider options.
	 */
	legalLinks?: InlineLegalLinksProps['links'];

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
	direction?: PolicyUiActionDirection;

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
	models?: import('c15t').Model[];

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'banner'
	 */
	uiSource?: string;
}

export const ConsentBanner: FC<ConsentBannerProps> = ({
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
	layout,
	direction,
	primaryButton = 'customize',
	models,
	uiSource,
}) => {
	const { cookieBanner: consentBanner } = useTranslations();
	const { banner } = useHeadlessConsentUI();
	const { policyBanner } = useConsentManager();
	const resolvedScrollLock =
		localScrollLock ?? policyBanner.scrollLock ?? false;

	// Merge local props with global theme context
	const config = useComponentConfig({
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: resolvedScrollLock,
		trapFocus: localTrapFocus,
	});

	const orderedActions = banner.orderedActions;
	const allowedActions = new Set(orderedActions);
	const effectivePrimaryButton = banner.primaryAction ?? primaryButton;
	const resolvedLayout: ConsentBannerLayout =
		layout ?? (banner.hasPolicyHints ? banner.actionGroups : DEFAULT_LAYOUT);
	const resolvedDirection = direction ?? banner.direction ?? 'row';
	const activeGroups = resolvedLayout
		.map((item) =>
			Array.isArray(item)
				? item.filter((action): action is PolicyUiAction =>
						allowedActions.has(action)
					)
				: allowedActions.has(item)
					? [item]
					: []
		)
		.filter((group) => group.length > 0);
	const shouldFillActions = shouldFillPolicyActions({
		uiProfile: banner.uiProfile,
		actionGroups: activeGroups,
		direction: resolvedDirection,
	});

	const renderButton = (type: ConsentBannerButton, className?: string) => {
		if (!allowedActions.has(type)) {
			return null;
		}

		const isPrimary = Array.isArray(effectivePrimaryButton)
			? effectivePrimaryButton.includes(type)
			: type === effectivePrimaryButton;

		switch (type) {
			case 'reject':
				return (
					<ConsentBannerRejectButton
						consentAction="reject"
						isPrimary={isPrimary}
						className={className}
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
						data-testid="consent-banner-customize-button"
					>
						{customizeButtonText}
					</ConsentBannerCustomizeButton>
				);
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
			<ConsentBannerRoot {...config} models={models} uiSource={uiSource}>
				<ConsentBannerCard aria-label={consentBanner.title}>
					<ConsentBannerHeader>
						<ConsentBannerTitle>{title}</ConsentBannerTitle>
						<ConsentBannerDescription legalLinks={legalLinks}>
							{description}
						</ConsentBannerDescription>
					</ConsentBannerHeader>
					<ConsentBannerFooter
						className={cn(
							shouldFillActions && styles.footerFill,
							resolvedDirection === 'column' && styles.footerColumn
						)}
					>
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
										className={cn(
											shouldFillActions && styles.footerSubGroupFill,
											resolvedDirection === 'column' &&
												styles.footerSubGroupColumn
										)}
									>
										{filteredItems.map((subItem) => (
											<Fragment key={subItem}>
												{renderButton(
													subItem,
													shouldFillActions
														? styles.actionButtonFill
														: undefined
												)}
											</Fragment>
										))}
									</ConsentBannerFooterSubGroup>
								);
							}
							if (!allowedActions.has(item)) {
								return null;
							}
							return (
								<Fragment key={item}>
									{renderButton(
										item,
										shouldFillActions ? styles.actionButtonFill : undefined
									)}
								</Fragment>
							);
						})}
					</ConsentBannerFooter>
				</ConsentBannerCard>
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
