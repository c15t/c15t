'use client';

import type * as C15tCoreTypes from '@c15t/core';
/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant cookie banner component.
 * Implements an accessible, pre-built banner following IAB requirements.
 */
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { useRef } from 'react';
import type { FC, RefObject } from 'react';

import { useHeadlessIABConsentUI } from '~/component-hooks/use-headless-iab-consent-ui';
import { Box } from '~/components/shared/primitives/box';
import { BrandingLink } from '~/components/shared/ui/branding';
import * as Button from '~/components/shared/ui/button';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useIABConsentManager } from '~/hooks/use-iab-consent-manager';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { useIABTranslations } from '../iab-consent-dialog/use-iab-translations';
import { IABConsentBannerRoot } from './atoms/root';

/**
 * Props for the IABConsentBanner component.
 * @public
 */
export interface IABConsentBannerProps {
	/**
	 * When true, removes all default styling from the component.
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * When true, disables entrance/exit animations.
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * When true, locks page scroll when the banner is visible.
	 * @default true
	 */
	scrollLock?: boolean;

	/**
	 * When true, traps keyboard focus within the banner.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Specifies which button should be highlighted as primary.
	 * @default 'customize'
	 */
	primaryButton?: 'reject' | 'accept' | 'customize';

	/**
	 * Which consent models this banner responds to.
	 * @default ['iab']
	 */
	models?: C15tCoreTypes.Model[];

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'iab_banner'
	 */
	uiSource?: string;
}

/**
 * IAB TCF 2.3 compliant cookie consent banner.
 *
 * @remarks
 * This component implements the required IAB TCF 2.3 UI elements:
 * - Partner count disclosure
 * - Purpose summary
 * - Legitimate interest notice
 * - Accept All / Reject All / Customize buttons
 *
 * The banner only renders when IAB mode is enabled in the consent manager.
 *
 * @example
 * ```tsx
 * <ConsentProvider
 *   options={{
 *     mode: hosted({ url: '/api/c15t' }),
 *     iab: { cmpId: 123, vendors: [1, 2, 10] },
 *   }}
 * >
 *   <IABConsentBanner />
 * </ConsentProvider>
 * ```
 *
 * @public
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const IABConsentBanner: FC<IABConsentBannerProps> = ({
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	primaryButton = 'customize',
	models,
	uiSource,
}) => {
	const iabT = useIABTranslations();
	const {
		iab: iabState,
		banner,
		openVendorsDialog,
		performBannerAction,
	} = useHeadlessIABConsentUI();
	const { policyBanner } = useIABConsentManager();
	const { components } = useUIConfig();
	const resolvedScrollLock = localScrollLock ?? policyBanner.scrollLock ?? true;

	const cardRef = useRef<HTMLDivElement>(null);

	// Merge local props with global theme context
	const config = useComponentConfig({
		disableAnimation: localDisableAnimation,
		noStyle: localNoStyle,
		scrollLock: resolvedScrollLock,
		trapFocus: localTrapFocus,
	});

	// Handle button actions
	const handleAcceptAll = () => {
		void performBannerAction('accept');
	};

	const handleRejectAll = () => {
		void performBannerAction('reject');
	};

	const handleCustomize = () => {
		void performBannerAction('customize');
	};

	const handleViewVendors = () => {
		openVendorsDialog();
	};

	// Focus trap
	useFocusTrap(Boolean(config.trapFocus), cardRef as RefObject<HTMLElement>);

	const isPrimary = (button: 'reject' | 'accept' | 'customize') =>
		button === primaryButton;

	// Don't render if IAB is disabled (e.g., server returned null GVL) or calculations not complete
	if (!iabState?.config.enabled || !banner.isReady) {
		return null;
	}

	// Replace {partnerCount} placeholder in description
	const descriptionText = iabT.banner.description.replace(
		'{partnerCount}',
		String(banner.vendorCount)
	);

	// Replace {count} placeholder in partners link
	const partnersLinkText = iabT.banner.partnersLink.replace(
		'{count}',
		String(banner.vendorCount)
	);

	const scopeNotice = iabT.banner.scopeServiceSpecific;
	const titleProps = mergeSlotProps(components?.['iab-banner']?.title, {
		baseClassName: styles.title,
		noStyle: config.noStyle,
	});
	const descriptionProps = mergeSlotProps(
		components?.['iab-banner']?.description,
		{
			baseClassName: styles.description,
			noStyle: config.noStyle,
		}
	);
	const partnersLinkProps = mergeSlotProps(
		components?.['iab-banner']?.partnersLink,
		{
			baseClassName: styles.partnersLink,
			noStyle: config.noStyle,
		}
	);
	const purposeListProps = mergeSlotProps(
		components?.['iab-banner']?.purposeList,
		{
			baseClassName: styles.purposeList,
			noStyle: config.noStyle,
		}
	);
	const purposeMoreProps = mergeSlotProps(
		components?.['iab-banner']?.purposeMore,
		{
			baseClassName: styles.purposeMore,
			noStyle: config.noStyle,
		}
	);
	const legitimateInterestNoticeProps = mergeSlotProps(
		components?.['iab-banner']?.legitimateInterestNotice,
		{
			baseClassName: styles.legitimateInterestNotice,
			noStyle: config.noStyle,
		}
	);
	const actionsProps = mergeSlotProps(components?.['iab-banner']?.actions, {
		baseClassName: actionStyles.actionRoot,
		'data-direction': 'row',
		'data-split': true,
		noStyle: config.noStyle,
	});
	const actionGroupProps = mergeSlotProps(
		components?.['iab-banner']?.actionGroup,
		{
			baseClassName: actionStyles.actionGroup,
			'data-direction': 'row',
			noStyle: config.noStyle,
		}
	);

	return (
		<IABConsentBannerRoot
			{...config}
			models={models}
			uiSource={uiSource}
		>
			<Box
				baseClassName={styles.cardShell}
				slotKey="iab-banner.cardShell"
			>
				<BrandingLink
					hideBranding={false}
					variant="banner-tag"
					slotContext="iab-banner"
					data-testid="iab-consent-banner-branding"
				/>
				<Box
					baseClassName={styles.card}
					slotKey="iab-banner.card"
					aria-modal={config.trapFocus ? 'true' : undefined}
					aria-label={iabT.banner.title}
					data-testid="iab-consent-banner-card"
					role={config.trapFocus ? 'dialog' : undefined}
					asChild
				>
					{/* A `div`, not a `dialog`: the user agent's dialog
					    padding is 1em, which the card sets for itself. */}
					<div ref={cardRef}>
						{/* Header */}
						<Box
							baseClassName={styles.header}
							slotKey="iab-banner.header"
							data-testid="iab-consent-banner-header"
						>
							<h2 {...titleProps}>{iabT.banner.title}</h2>
							<p {...descriptionProps}>
								{descriptionText.split(partnersLinkText)[0]}
								<button
									{...partnersLinkProps}
									type="button"
									data-testid="iab-consent-banner-partners-link"
									onClick={handleViewVendors}
									onMouseEnter={() => {
										// Prefetch vendor list on hover
									}}
								>
									{partnersLinkText}
								</button>
								{descriptionText.split(partnersLinkText)[1]}
							</p>
							<ul {...purposeListProps}>
								{banner.displayItems.map((name, index) => (
									<li key={index}>{name}</li>
								))}
								{banner.remainingCount > 0 && (
									<li {...purposeMoreProps}>
										{iabT.banner.andMore.replace(
											'{count}',
											String(banner.remainingCount)
										)}
									</li>
								)}
							</ul>
							<p {...legitimateInterestNoticeProps}>
								{`${iabT.banner.legitimateInterestNotice} ${scopeNotice}`}
							</p>
						</Box>

						{/* Footer with buttons */}
						<Box
							baseClassName={styles.footer}
							slotKey="iab-banner.footer"
							data-testid="iab-consent-banner-footer"
							{...actionsProps}
						>
							<div {...actionGroupProps}>
								<Button.Root
									variant={isPrimary('reject') ? 'primary' : 'neutral'}
									mode="stroke"
									size="small"
									onClick={handleRejectAll}
									data-action="reject"
									data-testid="iab-consent-banner-reject-button"
								>
									{iabT.common.rejectAll}
								</Button.Root>
								<Button.Root
									variant={isPrimary('accept') ? 'primary' : 'neutral'}
									mode={isPrimary('accept') ? 'filled' : 'stroke'}
									size="small"
									onClick={handleAcceptAll}
									data-action="accept"
									data-testid="iab-consent-banner-accept-button"
								>
									{iabT.common.acceptAll}
								</Button.Root>
							</div>
							<div {...actionGroupProps}>
								<Button.Root
									variant={isPrimary('customize') ? 'primary' : 'neutral'}
									mode={isPrimary('customize') ? 'filled' : 'stroke'}
									size="small"
									onClick={handleCustomize}
									data-action="customize"
									data-testid="iab-consent-banner-customize-button"
								>
									{iabT.common.customize}
								</Button.Root>
							</div>
						</Box>
					</div>
				</Box>
			</Box>
		</IABConsentBannerRoot>
	);
};
