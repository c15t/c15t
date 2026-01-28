'use client';

/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant cookie banner component.
 * Implements an accessible, pre-built banner following IAB requirements.
 */

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { type FC, type RefObject, useMemo, useRef } from 'react';
import { Box } from '~/components/shared/primitives/box';
import * as Button from '~/components/shared/ui/button';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useIABTranslations } from '../iab-preference-center/use-iab-translations';
import { IABBannerRoot } from './atoms/root';

/**
 * Props for the IABBanner component.
 * @public
 */
export interface IABBannerProps {
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
	 * @default false
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
 * <ConsentManagerProvider options={{ iab: { enabled: true, cmpId: 000, vendors: {} } }}>
 *   <IABBanner />
 * </ConsentManagerProvider>
 * ```
 *
 * @public
 */
export const IABBanner: FC<IABBannerProps> = ({
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	primaryButton = 'customize',
}) => {
	const iabT = useIABTranslations();
	const {
		iab: iabState,
		setShowPopup,
		setIsPrivacyDialogOpen,
	} = useConsentManager();

	const cardRef = useRef<HTMLDivElement>(null);

	// Merge local props with global theme context
	const config = useComponentConfig({
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus,
	});

	// Get vendor count from GVL + custom vendors
	const vendorCount = useMemo(() => {
		if (!iabState?.gvl) {
			return 0;
		}
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	}, [iabState?.gvl, iabState?.nonIABVendors]);

	// Get filtered stack names from GVL (same logic as preference center)
	const MAX_DISPLAY_ITEMS = 5;
	const displayItems = useMemo(() => {
		if (!iabState?.gvl) {
			return { displayed: [], remainingCount: 0, isReady: false };
		}

		const gvl = iabState.gvl;

		// Get purposes that have vendors (all GVL vendors)
		const purposesWithVendors = Object.entries(gvl.purposes)
			.filter(([id]) => {
				// Check if any vendor uses this purpose
				return Object.values(gvl.vendors).some(
					(vendor) =>
						vendor.purposes?.includes(Number(id)) ||
						vendor.legIntPurposes?.includes(Number(id))
				);
			})
			.map(([id, purpose]) => ({ id: Number(id), name: purpose.name }));

		// Purpose 1 is always standalone per IAB TCF spec
		const STANDALONE_PURPOSE_ID = 1;
		const standalonePurpose = purposesWithVendors.find(
			(p) => p.id === STANDALONE_PURPOSE_ID
		);
		const otherPurposes = purposesWithVendors.filter(
			(p) => p.id !== STANDALONE_PURPOSE_ID
		);
		const otherPurposeIds = new Set(otherPurposes.map((p) => p.id));

		// Score stacks by coverage (same as preference center)
		const gvlStacks = gvl.stacks || {};
		const stackScores: Array<{
			stackId: number;
			name: string;
			coveredPurposeIds: number[];
			score: number;
		}> = [];

		for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
			const coveredIds = stack.purposes.filter((pid) =>
				otherPurposeIds.has(pid)
			);
			if (coveredIds.length >= 2) {
				stackScores.push({
					stackId: Number(stackIdStr),
					name: stack.name,
					coveredPurposeIds: coveredIds,
					score: coveredIds.length,
				});
			}
		}

		// Sort by score descending
		stackScores.sort((a, b) => b.score - a.score);

		// Greedily select stacks (same logic as preference center)
		const selectedStacks: string[] = [];
		const assignedPurposeIds = new Set<number>();

		for (const { name, coveredPurposeIds: covered } of stackScores) {
			const unassignedInStack = covered.filter(
				(pid) => !assignedPurposeIds.has(pid)
			);
			if (unassignedInStack.length >= 2) {
				selectedStacks.push(name);
				for (const pid of unassignedInStack) {
					assignedPurposeIds.add(pid);
				}
			}
		}

		// Purposes not assigned to any stack become standalone
		const uncoveredPurposes = otherPurposes.filter(
			(p) => !assignedPurposeIds.has(p.id)
		);

		// Get special features that have vendors
		const specialFeaturesWithVendors = Object.entries(gvl.specialFeatures || {})
			.filter(([id]) => {
				return Object.values(gvl.vendors).some((vendor) =>
					vendor.specialFeatures?.includes(Number(id))
				);
			})
			.map(([, feature]) => feature.name);

		// Build final list: standalone purposes, stacks, then special features
		const items: string[] = [];

		// Add Purpose 1 (standalone) first if it exists
		if (standalonePurpose) {
			items.push(standalonePurpose.name);
		}

		// Add stack names
		for (const stackName of selectedStacks) {
			items.push(stackName);
		}

		// Add uncovered purposes (these appear as standalone in preference center)
		for (const purpose of uncoveredPurposes) {
			items.push(purpose.name);
		}

		// Add special features
		for (const featureName of specialFeaturesWithVendors) {
			items.push(featureName);
		}

		const displayed = items.slice(0, MAX_DISPLAY_ITEMS);
		const remainingCount = Math.max(0, items.length - MAX_DISPLAY_ITEMS);

		return { displayed, remainingCount, isReady: true };
	}, [iabState?.gvl]);

	// Handle button actions
	const handleAcceptAll = () => {
		iabState?.acceptAll();
		iabState?.save();
		setShowPopup(false);
	};

	const handleRejectAll = () => {
		iabState?.rejectAll();
		iabState?.save();
		setShowPopup(false);
	};

	const handleCustomize = () => {
		setIsPrivacyDialogOpen(true);
	};

	// Focus trap
	useFocusTrap(Boolean(config.trapFocus), cardRef as RefObject<HTMLElement>);

	const isPrimary = (button: 'reject' | 'accept' | 'customize') =>
		button === primaryButton;

	// Don't render if IAB is disabled (e.g., server returned null GVL) or calculations not complete
	if (!iabState?.config.enabled || !displayItems.isReady) {
		return null;
	}

	// Replace {partnerCount} placeholder in description
	const descriptionText = iabT.banner.description.replace(
		'{partnerCount}',
		String(vendorCount)
	);

	// Replace {count} placeholder in partners link
	const partnersLinkText = iabT.banner.partnersLink.replace(
		'{count}',
		String(vendorCount)
	);

	return (
		<IABBannerRoot {...config}>
			<Box
				ref={cardRef}
				baseClassName={styles.card}
				themeKey="iabBannerCard"
				tabIndex={0}
				role="dialog"
				aria-modal={config.trapFocus ? 'true' : undefined}
				aria-label={iabT.banner.title}
				data-testid="iab-banner-card"
			>
				{/* Header */}
				<Box
					baseClassName={styles.header}
					themeKey="iabBannerHeader"
					data-testid="iab-banner-header"
				>
					<h2 className={styles.title}>{iabT.banner.title}</h2>
					<p className={styles.description}>
						{descriptionText.split(partnersLinkText)[0]}
						<button
							type="button"
							className={styles.partnersLink}
							onClick={handleCustomize}
							onMouseEnter={() => {
								// Prefetch vendor list on hover
							}}
						>
							{partnersLinkText}
						</button>
						{descriptionText.split(partnersLinkText)[1]}
					</p>
					<ul className={styles.purposeList}>
						{displayItems.displayed.map((name, index) => (
							<li key={index}>{name}</li>
						))}
						{displayItems.remainingCount > 0 && (
							<li className={styles.purposeMore}>
								{iabT.banner.andMore.replace(
									'{count}',
									String(displayItems.remainingCount)
								)}
							</li>
						)}
					</ul>
					<p className={styles.legitimateInterestNotice}>
						{iabT.banner.legitimateInterestNotice}
					</p>
				</Box>

				{/* Footer with buttons */}
				<Box
					baseClassName={styles.footer}
					themeKey="iabBannerFooter"
					data-testid="iab-banner-footer"
				>
					<div className={styles.footerButtonGroup}>
						<Button.Root
							variant={isPrimary('reject') ? 'primary' : 'neutral'}
							mode="stroke"
							size="small"
							onClick={handleRejectAll}
							className={styles.rejectButton}
							data-testid="iab-banner-reject-button"
						>
							{iabT.common.rejectAll}
						</Button.Root>
						<Button.Root
							variant={isPrimary('accept') ? 'primary' : 'neutral'}
							mode={isPrimary('accept') ? 'filled' : 'stroke'}
							size="small"
							onClick={handleAcceptAll}
							className={styles.acceptButton}
							data-testid="iab-banner-accept-button"
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
						data-testid="iab-banner-customize-button"
					>
						{iabT.common.customize}
					</Button.Root>
				</Box>
			</Box>
		</IABBannerRoot>
	);
};
