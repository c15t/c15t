'use client';

/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant cookie banner component.
 * Implements an accessible, pre-built banner following IAB requirements.
 */

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { type FC, type RefObject, useRef } from 'react';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useConsentManager } from '~/v3/component-hooks/use-consent-manager';
import { useHeadlessIABConsentUI } from '~/v3/component-hooks/use-headless-iab-consent-ui';
import { Box } from '~/v3/components/shared/primitives/box';
import { BrandingLink } from '~/v3/components/shared/ui/branding';
import * as Button from '~/v3/components/shared/ui/button';
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
	models?: import('c15t').Model[];

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
 * <ConsentManagerProvider options={{ iab: { enabled: true, cmpId: 000, vendors: [1, 2, 10] } }}>
 *   <IABConsentBanner />
 * </ConsentManagerProvider>
 * ```
 *
 * @public
 */
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
	const { policyBanner } = useConsentManager();
	const resolvedScrollLock = localScrollLock ?? policyBanner.scrollLock ?? true;

	const cardRef = useRef<HTMLDivElement>(null);

	// Merge local props with global theme context
	const config = useComponentConfig({
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
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

	return (
		<IABConsentBannerRoot {...config} models={models} uiSource={uiSource}>
			<Box baseClassName={styles.cardShell}>
				<BrandingLink
					hideBranding={false}
					variant="banner-tag"
					themeKey="iabConsentBannerTag"
					data-testid="iab-consent-banner-branding"
				/>
				<Box
					ref={cardRef}
					baseClassName={styles.card}
					themeKey="iabConsentBannerCard"
					tabIndex={0}
					role="dialog"
					aria-modal={config.trapFocus ? 'true' : undefined}
					aria-label={iabT.banner.title}
					data-testid="iab-consent-banner-card"
				>
					{/* Header */}
					<Box
						baseClassName={styles.header}
						themeKey="iabConsentBannerHeader"
						data-testid="iab-consent-banner-header"
					>
						<h2 className={styles.title}>{iabT.banner.title}</h2>
						<p className={styles.description}>
							{descriptionText.split(partnersLinkText)[0]}
							<button
								type="button"
								className={styles.partnersLink}
								onClick={handleViewVendors}
								onMouseEnter={() => {
									// Prefetch vendor list on hover
								}}
							>
								{partnersLinkText}
							</button>
							{descriptionText.split(partnersLinkText)[1]}
						</p>
						<ul className={styles.purposeList}>
							{banner.displayItems.map((name, index) => (
								<li key={index}>{name}</li>
							))}
							{banner.remainingCount > 0 && (
								<li className={styles.purposeMore}>
									{iabT.banner.andMore.replace(
										'{count}',
										String(banner.remainingCount)
									)}
								</li>
							)}
						</ul>
						<p className={styles.legitimateInterestNotice}>
							{iabT.banner.legitimateInterestNotice} {scopeNotice}
						</p>
					</Box>

					{/* Footer with buttons */}
					<Box
						baseClassName={styles.footer}
						themeKey="iabConsentBannerFooter"
						data-testid="iab-consent-banner-footer"
					>
						<div className={styles.footerButtonGroup}>
							<Button.Root
								variant={isPrimary('reject') ? 'primary' : 'neutral'}
								mode="stroke"
								size="small"
								onClick={handleRejectAll}
								className={styles.rejectButton}
								data-testid="iab-consent-banner-reject-button"
							>
								{iabT.common.rejectAll}
							</Button.Root>
							<Button.Root
								variant={isPrimary('accept') ? 'primary' : 'neutral'}
								mode={isPrimary('accept') ? 'filled' : 'stroke'}
								size="small"
								onClick={handleAcceptAll}
								className={styles.acceptButton}
								data-testid="iab-consent-banner-accept-button"
							>
								{iabT.common.acceptAll}
							</Button.Root>
						</div>
						<div className={styles.footerSpacer} />
						<Button.Root
							variant={isPrimary('customize') ? 'primary' : 'neutral'}
							mode={isPrimary('customize') ? 'filled' : 'stroke'}
							size="small"
							onClick={handleCustomize}
							className={styles.customizeButton}
							data-testid="iab-consent-banner-customize-button"
						>
							{iabT.common.customize}
						</Button.Root>
					</Box>
				</Box>
			</Box>
		</IABConsentBannerRoot>
	);
};
