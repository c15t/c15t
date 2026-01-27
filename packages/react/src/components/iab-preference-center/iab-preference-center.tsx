'use client';

/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant preference center component.
 * Implements an accessible, pre-built preference center following IAB requirements.
 */

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import {
	type FC,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Branding } from '~/components/consent-manager-dialog/atoms/dialog-card';
import * as Button from '~/components/shared/ui/button';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { useTheme } from '~/hooks/use-theme';
import { IABPreferenceCenterOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { StackItem } from './atoms/stack-item';
import { VendorList } from './atoms/vendor-list';
import type {
	ProcessedPurpose,
	ProcessedSpecialFeature,
	ProcessedStack,
	ProcessedVendor,
} from './types';
import { useIABTranslations } from './use-iab-translations';

/**
 * Props for the IABPreferenceCenter component.
 * @public
 */
export interface IABPreferenceCenterProps {
	/**
	 * Control the open state. If omitted, follows isPrivacyDialogOpen from context.
	 */
	open?: boolean;

	/**
	 * When true, removes all default styling.
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * When true, disables entrance/exit animations.
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * When true, locks page scroll when the dialog is visible.
	 * @default true
	 */
	scrollLock?: boolean;

	/**
	 * When true, traps keyboard focus within the dialog.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * When true, hides the branding in the footer.
	 * @default false
	 */
	hideBranding?: boolean;
}

/**
 * IAB TCF 2.3 compliant preference center dialog.
 *
 * @remarks
 * This component implements the required IAB TCF 2.3 UI elements:
 * - Tabbed interface for Purposes and Vendors
 * - Purpose grouping with stacks
 * - Individual purpose and vendor consent toggles
 * - Special purposes and features
 * - Legitimate interest handling
 *
 * @public
 */
export const IABPreferenceCenter: FC<IABPreferenceCenterProps> = ({
	open,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock = true,
	trapFocus: localTrapFocus = true,
	hideBranding,
}) => {
	const iabTranslations = useIABTranslations();
	const globalTheme = useTheme();
	const {
		iab: iabState,
		isPrivacyDialogOpen,
		setIsPrivacyDialogOpen,
		setShowPopup,
		translationConfig,
	} = useConsentManager();

	const textDirection = useTextDirection(translationConfig.defaultLanguage);
	const cardRef = useRef<HTMLDivElement>(null);

	const [activeTab, setActiveTab] = useState<'purposes' | 'vendors'>(
		'purposes'
	);
	const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
	const [specialPurposesExpanded, setSpecialPurposesExpanded] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const isOpen = open ?? isPrivacyDialogOpen;

	const mergedProps = {
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
	};

	// Process GVL data into UI-friendly format
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		stacks,
		standalonePurposes,
	} = useMemo(() => {
		if (!iabState?.gvl) {
			return {
				purposes: [],
				specialPurposes: [],
				specialFeatures: [],
				stacks: [] as ProcessedStack[],
				standalonePurposes: [],
			};
		}

		const gvl = iabState.gvl;
		const customVendors = iabState.nonIABVendors || [];

		// Generate numeric IDs for custom vendors (starting from 90000 to avoid collision)
		const customVendorIdMap = new Map<string, number>();
		customVendors.forEach((cv, index) => {
			customVendorIdMap.set(cv.id, 90000 + index);
		});

		// Helper to map GVL vendor to ProcessedVendor
		const mapVendor = (
			vendorId: string,
			vendor: (typeof gvl.vendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			id: Number(vendorId),
			name: vendor.name,
			policyUrl: (vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
			usesNonCookieAccess: vendor.usesNonCookieAccess,
			deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
			usesCookies: vendor.usesCookies,
			cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
			specialPurposes: vendor.specialPurposes || [],
			specialFeatures: vendor.specialFeatures || [],
			purposes: vendor.purposes || [],
			legIntPurposes: vendor.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (vendor.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			isCustom: false,
		});

		// Helper to map custom vendor to ProcessedVendor
		const mapCustomVendor = (
			cv: (typeof customVendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			id: customVendorIdMap.get(cv.id) ?? 90000,
			name: cv.name,
			policyUrl: cv.privacyPolicyUrl,
			usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
			deviceStorageDisclosureUrl: null,
			usesCookies: cv.usesCookies ?? false,
			cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
			specialPurposes: [],
			specialFeatures: cv.specialFeatures || [],
			purposes: cv.purposes || [],
			legIntPurposes: cv.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (cv.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			isCustom: true,
		});

		// Process purposes
		const processedPurposes: ProcessedPurpose[] = Object.entries(gvl.purposes)
			.map(([id, purpose]) => {
				// Get IAB vendors for this purpose (all vendors from GVL)
				const iabVendorsForPurpose: ProcessedVendor[] = Object.entries(
					gvl.vendors
				)
					.filter(([, vendor]) => {
						return (
							vendor.purposes?.includes(Number(id)) ||
							vendor.legIntPurposes?.includes(Number(id))
						);
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor, Number(id)));

				// Get custom vendors for this purpose
				const customVendorsForPurpose: ProcessedVendor[] = customVendors
					.filter((cv) => {
						return (
							cv.purposes?.includes(Number(id)) ||
							cv.legIntPurposes?.includes(Number(id))
						);
					})
					.map((cv) => mapCustomVendor(cv, Number(id)));

				return {
					id: Number(id),
					name: purpose.name,
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					illustrations: purpose.illustrations || [],
					vendors: [...iabVendorsForPurpose, ...customVendorsForPurpose],
				};
			})
			.filter((purpose) => purpose.vendors.length > 0);

		// Process special purposes
		const processedSpecialPurposes: ProcessedPurpose[] = Object.entries(
			gvl.specialPurposes || {}
		)
			.map(([id, purpose]) => {
				const vendorsForPurpose: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => {
						return vendor.specialPurposes?.includes(Number(id));
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					id: Number(id),
					name: purpose.name,
					description: purpose.description,
					descriptionLegal: purpose.descriptionLegal,
					illustrations: purpose.illustrations || [],
					vendors: vendorsForPurpose,
					isSpecialPurpose: true,
				};
			})
			.filter((sp) => sp.vendors.length > 0);

		// Process special features
		const processedSpecialFeatures: ProcessedSpecialFeature[] = Object.entries(
			gvl.specialFeatures || {}
		)
			.map(([id, feature]) => {
				const vendorsForFeature: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => {
						return vendor.specialFeatures?.includes(Number(id));
					})
					.map(([vendorId, vendor]) => mapVendor(vendorId, vendor));

				return {
					id: Number(id),
					name: feature.name,
					description: feature.description,
					descriptionLegal: feature.descriptionLegal,
					illustrations: feature.illustrations || [],
					vendors: vendorsForFeature,
				};
			})
			.filter((sf) => sf.vendors.length > 0);

		// Group purposes into stacks (Purpose 1 is always standalone per IAB TCF spec)
		const STANDALONE_PURPOSE_ID = 1;
		const standalonePurpose = processedPurposes.find(
			(p) => p.id === STANDALONE_PURPOSE_ID
		);
		const otherPurposes = processedPurposes.filter(
			(p) => p.id !== STANDALONE_PURPOSE_ID
		);
		const otherPurposeIds = new Set(otherPurposes.map((p) => p.id));

		// Use stacks from GVL if available
		const gvlStacks = gvl.stacks || {};

		// Score each stack by how many of our purposes it covers
		const stackScores: Array<{
			stackId: number;
			stack: (typeof gvlStacks)[number];
			coveredPurposeIds: number[];
			score: number;
		}> = [];

		for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
			const stackId = Number(stackIdStr);
			const coveredIds = stack.purposes.filter((pid) =>
				otherPurposeIds.has(pid)
			);
			if (coveredIds.length >= 2) {
				// Only consider stacks that cover 2+ purposes
				stackScores.push({
					stackId,
					stack,
					coveredPurposeIds: coveredIds,
					score: coveredIds.length,
				});
			}
		}

		// Sort stacks by score descending (prefer stacks that cover more purposes)
		stackScores.sort((a, b) => b.score - a.score);

		// Greedily select stacks, ensuring each purpose is only covered once
		const processedStacks: ProcessedStack[] = [];
		const assignedPurposeIds = new Set<number>();

		for (const { stackId, stack, coveredPurposeIds: covered } of stackScores) {
			// Only use this stack if it covers at least one unassigned purpose
			const unassignedInStack = covered.filter(
				(pid) => !assignedPurposeIds.has(pid)
			);
			if (unassignedInStack.length >= 2) {
				// Get purposes for this stack (only unassigned ones)
				const stackPurposes = otherPurposes.filter((p) =>
					unassignedInStack.includes(p.id)
				);
				processedStacks.push({
					id: stackId,
					name: stack.name,
					description: stack.description,
					purposes: stackPurposes,
				});
				for (const pid of unassignedInStack) {
					assignedPurposeIds.add(pid);
				}
			}
		}

		// Purposes not assigned to any stack become standalone
		const uncoveredPurposes = otherPurposes.filter(
			(p) => !assignedPurposeIds.has(p.id)
		);

		const finalStandalonePurposes = standalonePurpose
			? [standalonePurpose, ...uncoveredPurposes]
			: uncoveredPurposes;

		return {
			purposes: processedPurposes,
			specialPurposes: processedSpecialPurposes,
			specialFeatures: processedSpecialFeatures,
			stacks: processedStacks,
			standalonePurposes: finalStandalonePurposes,
		};
	}, [iabState?.gvl, iabState?.nonIABVendors]);

	// Get total vendor count (all GVL vendors + custom vendors)
	const totalVendors = useMemo(() => {
		if (!iabState?.gvl) {
			return 0;
		}
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	}, [iabState?.gvl, iabState?.nonIABVendors]);

	// Handlers
	const handlePurposeToggle = useCallback(
		(purposeId: number, value: boolean) => {
			iabState?.setPurposeConsent(purposeId, value);
		},
		[iabState]
	);

	const handleSpecialFeatureToggle = useCallback(
		(featureId: number, value: boolean) => {
			iabState?.setSpecialFeatureOptIn(featureId, value);
		},
		[iabState]
	);

	const handleVendorToggle = useCallback(
		(vendorId: number, value: boolean) => {
			iabState?.setVendorConsent(vendorId, value);
		},
		[iabState]
	);

	const handleVendorLegitimateInterestToggle = useCallback(
		(vendorId: number, value: boolean) => {
			iabState?.setVendorLegitimateInterest(vendorId, value);
		},
		[iabState]
	);

	const handlePurposeLegitimateInterestToggle = useCallback(
		(purposeId: number, value: boolean) => {
			iabState?.setPurposeLegitimateInterest(purposeId, value);
		},
		[iabState]
	);

	const handleAcceptAll = () => {
		iabState?.acceptAll();
		iabState?.save();
		setIsPrivacyDialogOpen(false);
		setShowPopup(false);
	};

	const handleRejectAll = () => {
		iabState?.rejectAll();
		iabState?.save();
		setIsPrivacyDialogOpen(false);
		setShowPopup(false);
	};

	const handleSave = () => {
		iabState?.save();
		setIsPrivacyDialogOpen(false);
		setShowPopup(false);
	};

	const handleClose = () => {
		setIsPrivacyDialogOpen(false);
	};

	const handleVendorClick = (vendorId: number) => {
		setSelectedVendorId(vendorId);
		setActiveTab('vendors');
	};

	// Focus trap
	useFocusTrap(
		Boolean(isOpen && mergedProps.trapFocus),
		cardRef as RefObject<HTMLElement>
	);

	// Scroll lock
	useScrollLock(Boolean(isOpen && mergedProps.scrollLock));

	// Mount state for portal
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Visibility animation
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
		} else if (mergedProps.disableAnimation) {
			setIsVisible(false);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isOpen, mergedProps.disableAnimation]);

	// Don't render if not mounted, no IAB state, or IAB is disabled (e.g., server returned null GVL)
	if (!isMounted || !iabState?.config.enabled) {
		return null;
	}

	const isLoading = iabState.isLoadingGVL || !iabState.gvl;

	const dialogContent = (
		<>
			<IABPreferenceCenterOverlay isOpen={isOpen} />
			<div
				className={`${styles.root} ${isVisible ? styles.dialogVisible : styles.dialogHidden}`}
				data-testid="iab-preference-center-root"
				dir={textDirection}
			>
				<div
					ref={cardRef}
					className={`${styles.card} ${isVisible ? styles.contentVisible : styles.contentHidden}`}
					role="dialog"
					aria-modal={mergedProps.trapFocus ? 'true' : undefined}
					aria-label={iabTranslations.preferenceCenter.title}
					tabIndex={0}
					data-testid="iab-preference-center-card"
				>
					{/* Header */}
					<div className={styles.header}>
						<div className={styles.headerContent}>
							<h2 className={styles.title}>
								{iabTranslations.preferenceCenter.title}
							</h2>
							<p className={styles.description}>
								{iabTranslations.preferenceCenter.description}
							</p>
						</div>
						<button
							type="button"
							onClick={handleClose}
							className={styles.closeButton}
							aria-label="Close"
						>
							<svg
								style={{ width: '1rem', height: '1rem' }}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>

					{/* Tabs */}
					<div className={styles.tabsContainer}>
						<div className={styles.tabsList}>
							<button
								type="button"
								onClick={() => setActiveTab('purposes')}
								className={styles.tabButton}
								data-state={activeTab === 'purposes' ? 'active' : 'inactive'}
							>
								{iabTranslations.preferenceCenter.tabs.purposes}
								{!isLoading &&
									` (${purposes.length + specialPurposes.length + specialFeatures.length})`}
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('vendors')}
								className={styles.tabButton}
								data-state={activeTab === 'vendors' ? 'active' : 'inactive'}
							>
								{iabTranslations.preferenceCenter.tabs.vendors}
								{!isLoading && ` (${totalVendors})`}
							</button>
						</div>
					</div>

					{/* Content */}
					<div className={styles.content}>
						{isLoading ? (
							<div className={styles.loadingContainer}>
								<div className={styles.loadingSpinner} />
								<p className={styles.loadingText}>
									{iabTranslations.common.loading}
								</p>
							</div>
						) : activeTab === 'purposes' ? (
							<div>
								{/* Standalone purposes */}
								{standalonePurposes.length > 0 && (
									<div>
										{standalonePurposes.map((purpose) => (
											<PurposeItem
												key={purpose.id}
												purpose={purpose}
												isEnabled={
													iabState.purposeConsents[purpose.id] ?? false
												}
												onToggle={(value) =>
													handlePurposeToggle(purpose.id, value)
												}
												vendorConsents={iabState.vendorConsents}
												onVendorToggle={handleVendorToggle}
												onVendorClick={handleVendorClick}
												vendorLegitimateInterests={
													iabState.vendorLegitimateInterests
												}
												onVendorLegitimateInterestToggle={
													handleVendorLegitimateInterestToggle
												}
												purposeLegitimateInterests={
													iabState.purposeLegitimateInterests
												}
												onPurposeLegitimateInterestToggle={
													handlePurposeLegitimateInterestToggle
												}
											/>
										))}
									</div>
								)}

								{/* Stacks */}
								{stacks.length > 0 && (
									<div>
										{stacks.map((stack) => (
											<StackItem
												key={stack.id}
												stack={stack}
												consents={iabState.purposeConsents}
												onToggle={handlePurposeToggle}
												vendorConsents={iabState.vendorConsents}
												onVendorToggle={handleVendorToggle}
												onVendorClick={handleVendorClick}
												vendorLegitimateInterests={
													iabState.vendorLegitimateInterests
												}
												onVendorLegitimateInterestToggle={
													handleVendorLegitimateInterestToggle
												}
												purposeLegitimateInterests={
													iabState.purposeLegitimateInterests
												}
												onPurposeLegitimateInterestToggle={
													handlePurposeLegitimateInterestToggle
												}
											/>
										))}
									</div>
								)}

								{/* Special Features */}
								{specialFeatures.length > 0 && (
									<div>
										{specialFeatures.map((feature) => (
											<PurposeItem
												key={`feature-${feature.id}`}
												purpose={{
													id: feature.id,
													name: feature.name,
													description: feature.description,
													illustrations: feature.illustrations,
													vendors: feature.vendors,
												}}
												isEnabled={
													iabState.specialFeatureOptIns[feature.id] ?? false
												}
												onToggle={(value) =>
													handleSpecialFeatureToggle(feature.id, value)
												}
												vendorConsents={iabState.vendorConsents}
												onVendorToggle={handleVendorToggle}
												onVendorClick={handleVendorClick}
												vendorLegitimateInterests={
													iabState.vendorLegitimateInterests
												}
												onVendorLegitimateInterestToggle={
													handleVendorLegitimateInterestToggle
												}
											/>
										))}
									</div>
								)}

								{/* Special Purposes (locked) */}
								{specialPurposes.length > 0 && (
									<div className={styles.specialPurposesSection}>
										<div className={styles.specialPurposesHeader}>
											<button
												type="button"
												onClick={() =>
													setSpecialPurposesExpanded(!specialPurposesExpanded)
												}
												className={styles.purposeTrigger}
											>
												<svg
													className={styles.purposeArrow}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													{specialPurposesExpanded ? (
														<path d="M19 9l-7 7-7-7" />
													) : (
														<path d="M9 5l7 7-7 7" />
													)}
												</svg>
												<div className={styles.purposeInfo}>
													<h3 className={styles.specialPurposesTitle}>
														{
															iabTranslations.preferenceCenter.specialPurposes
																.title
														}
														<svg
															className={styles.lockIcon}
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
														>
															<rect
																x="3"
																y="11"
																width="18"
																height="11"
																rx="2"
																ry="2"
															/>
															<path d="M7 11V7a5 5 0 0 1 10 0v4" />
														</svg>
													</h3>
													<p className={styles.purposeMeta}>
														{
															new Set(
																specialPurposes.flatMap((sp) =>
																	sp.vendors.map((v) => v.id)
																)
															).size
														}{' '}
														partners
													</p>
												</div>
											</button>
											<div style={{ position: 'relative' }}>
												<svg
													className={styles.infoIcon}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													aria-label={
														iabTranslations.preferenceCenter.specialPurposes
															.tooltip
													}
												>
													<circle cx="12" cy="12" r="10" />
													<line x1="12" y1="16" x2="12" y2="12" />
													<line x1="12" y1="8" x2="12.01" y2="8" />
												</svg>
											</div>
										</div>

										{specialPurposesExpanded && (
											<div style={{ padding: '0.75rem' }}>
												{specialPurposes.map((purpose) => (
													<PurposeItem
														key={`special-${purpose.id}`}
														purpose={purpose}
														isEnabled={true}
														onToggle={() => {}}
														vendorConsents={iabState.vendorConsents}
														onVendorToggle={handleVendorToggle}
														onVendorClick={handleVendorClick}
														isLocked={true}
													/>
												))}
											</div>
										)}
									</div>
								)}

								{/* Consent storage notice */}
								<div className={styles.consentNotice}>
									<p className={styles.consentNoticeText}>
										{iabTranslations.preferenceCenter.footer.consentStorage}
									</p>
								</div>
							</div>
						) : (
							<VendorList
								vendorData={iabState.gvl}
								purposes={purposes}
								vendorConsents={iabState.vendorConsents}
								onVendorToggle={handleVendorToggle}
								selectedVendorId={selectedVendorId}
								onClearSelection={() => setSelectedVendorId(null)}
								customVendors={iabState.nonIABVendors}
								vendorLegitimateInterests={iabState.vendorLegitimateInterests}
								onVendorLegitimateInterestToggle={
									handleVendorLegitimateInterestToggle
								}
							/>
						)}
					</div>

					{/* Footer */}
					<div className={styles.footer}>
						<div className={styles.footerButtons}>
							<Button.Root
								variant="neutral"
								mode="stroke"
								size="small"
								onClick={handleRejectAll}
								disabled={isLoading}
							>
								{iabTranslations.common.rejectAll}
							</Button.Root>
							<Button.Root
								variant="neutral"
								mode="stroke"
								size="small"
								onClick={handleAcceptAll}
								disabled={isLoading}
							>
								{iabTranslations.common.acceptAll}
							</Button.Root>
						</div>
						<div className={styles.footerSpacer} />
						<Button.Root
							variant="primary"
							mode="filled"
							size="small"
							onClick={handleSave}
							disabled={isLoading}
						>
							{iabTranslations.common.saveSettings}
						</Button.Root>
					</div>

					{/* Branding */}
					{!hideBranding && (
						<div className={styles.branding}>
							<Branding hideBranding={hideBranding ?? false} />
						</div>
					)}
				</div>
			</div>
		</>
	);

	if (!isOpen && !isVisible) {
		return null;
	}

	return createPortal(dialogContent, document.body);
};
