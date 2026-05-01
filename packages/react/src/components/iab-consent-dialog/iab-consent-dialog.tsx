'use client';

/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant consent dialog component.
 * Implements an accessible, pre-built consent dialog following IAB requirements.
 */

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import {
	type FC,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Branding } from '~/components/consent-dialog/atoms/card';
import {
	ConsentDialogTrigger,
	type ConsentDialogTriggerProps,
} from '~/components/consent-dialog-trigger';
import * as Button from '~/components/shared/ui/button';
import * as Tabs from '~/components/shared/ui/tabs';
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useHeadlessIABConsentUI } from '~/hooks/use-headless-iab-consent-ui';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { useTranslations } from '~/hooks/use-translations';
import { IABConsentDialogOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { StackItem } from './atoms/stack-item';
import { VendorList } from './atoms/vendor-list';
import type {
	ProcessedFeature,
	ProcessedPurpose,
	ProcessedSpecialFeature,
	ProcessedStack,
	ProcessedVendor,
	VendorId,
} from './types';
import { useIABTranslations } from './use-iab-translations';

/**
 * Props for the IABConsentDialog component.
 * @public
 */
export interface IABConsentDialogProps {
	/**
	 * Control the open state. If omitted, follows activeUI === 'dialog' from context.
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

	/**
	 * Show a floating trigger button to resurface the consent dialog.
	 * IAB TCF requires the consent dialog to be easily resurfaceable.
	 *
	 * - `true` - Show trigger with default settings
	 * - `false` - Hide trigger (default)
	 * - `ConsentDialogTriggerProps` - Show trigger with custom props
	 *
	 * @default false
	 */
	showTrigger?: boolean | ConsentDialogTriggerProps;

	/**
	 * Which consent models this dialog responds to.
	 * @default ['iab']
	 */
	models?: import('c15t').Model[];

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'iab_dialog'
	 */
	uiSource?: string;
}

/**
 * IAB TCF 2.3 compliant consent dialog dialog.
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
export const IABConsentDialog: FC<IABConsentDialogProps> = ({
	open,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	hideBranding,
	showTrigger = false,
	models = ['iab'],
	uiSource: _uiSource,
}) => {
	const iabTranslations = useIABTranslations();
	const { common } = useTranslations();
	const {
		iab: iabState,
		activeUI,
		policyDialog,
		translationConfig,
		model,
	} = useConsentManager();
	const { closeUI, openDialog, performDialogAction } =
		useHeadlessIABConsentUI();
	const resolvedScrollLock = localScrollLock ?? policyDialog.scrollLock ?? true;

	const textDirection = useTextDirection(translationConfig.defaultLanguage);
	const cardRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const previousHeightRef = useRef<number | null>(null);

	const [activeTab, setActiveTab] = useState<'purposes' | 'vendors'>(
		iabState?.preferenceCenterTab ?? 'purposes'
	);
	const [selectedVendorId, setSelectedVendorId] = useState<VendorId | null>(
		null
	);
	const [specialPurposesExpanded, setSpecialPurposesExpanded] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const isOpen = open ?? (activeUI === 'dialog' && models.includes(model));

	// Merge local props with global theme context
	const config = useComponentConfig({
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: resolvedScrollLock,
		trapFocus: localTrapFocus,
	});

	// Process GVL data into UI-friendly format
	const {
		purposes,
		specialPurposes,
		specialFeatures,
		features,
		stacks,
		standalonePurposes,
	} = useMemo(() => {
		if (!iabState?.gvl) {
			return {
				purposes: [],
				specialPurposes: [],
				specialFeatures: [],
				features: [],
				stacks: [] as ProcessedStack[],
				standalonePurposes: [],
			};
		}

		const gvl = iabState.gvl;
		const customVendors = iabState.nonIABVendors || [];

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
			cookieRefresh: vendor.cookieRefresh,
			legitimateInterestUrl:
				vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
			specialPurposes: vendor.specialPurposes || [],
			specialFeatures: vendor.specialFeatures || [],
			features: vendor.features || [],
			purposes: vendor.purposes || [],
			legIntPurposes: vendor.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (vendor.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			dataRetention: vendor.dataRetention,
			isCustom: false,
		});

		// Helper to map custom vendor to ProcessedVendor
		const mapCustomVendor = (
			cv: (typeof customVendors)[number],
			purposeId?: number
		): ProcessedVendor => ({
			id: cv.id,
			name: cv.name,
			policyUrl: cv.privacyPolicyUrl,
			usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
			deviceStorageDisclosureUrl: null,
			usesCookies: cv.usesCookies ?? false,
			cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
			cookieRefresh: undefined,
			legitimateInterestUrl: null,
			specialPurposes: [],
			specialFeatures: cv.specialFeatures || [],
			features: cv.features || [],
			purposes: cv.purposes || [],
			legIntPurposes: cv.legIntPurposes || [],
			usesLegitimateInterest: purposeId
				? (cv.legIntPurposes?.includes(purposeId) ?? false)
				: false,
			dataRetention: undefined,
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

		// Process features (informational, no consent toggle)
		const processedFeatures: ProcessedFeature[] = Object.entries(
			gvl.features || {}
		)
			.map(([id, feature]) => {
				const vendorsForFeature: ProcessedVendor[] = Object.entries(gvl.vendors)
					.filter(([, vendor]) => {
						return vendor.features?.includes(Number(id));
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
			.filter((f) => f.vendors.length > 0);

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
			features: processedFeatures,
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
		(vendorId: VendorId, value: boolean) => {
			iabState?.setVendorConsent(vendorId, value);
		},
		[iabState]
	);

	const handleVendorLegitimateInterestToggle = useCallback(
		(vendorId: VendorId, value: boolean) => {
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
		void performDialogAction('accept');
	};

	const handleRejectAll = () => {
		void performDialogAction('reject');
	};

	const handleSave = () => {
		void performDialogAction('customize');
	};

	const handleClose = () => {
		closeUI();
	};

	const handleVendorClick = (vendorId: VendorId) => {
		setSelectedVendorId(vendorId);
		setActiveTab('vendors');
		openDialog({ tab: 'vendors' });
	};

	// Focus trap
	useFocusTrap(
		Boolean(isOpen && config.trapFocus),
		cardRef as RefObject<HTMLElement>
	);

	// Scroll lock
	useScrollLock(Boolean(isOpen && config.scrollLock));

	// Mount state for portal
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Visibility animation
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
		} else if (config.disableAnimation) {
			setIsVisible(false);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isOpen, config.disableAnimation]);

	useEffect(() => {
		if (isOpen && iabState?.preferenceCenterTab) {
			setActiveTab(iabState.preferenceCenterTab);
		}
	}, [isOpen, iabState?.preferenceCenterTab]);

	// Smooth height animation when switching tabs
	// biome-ignore lint/correctness/useExhaustiveDependencies: activeTab is intentionally used as a trigger
	useLayoutEffect(() => {
		const content = contentRef.current;
		if (!content || previousHeightRef.current === null) {
			return;
		}

		const previousHeight = previousHeightRef.current;
		previousHeightRef.current = null;

		// Check for reduced motion preference
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		if (prefersReducedMotion) {
			return;
		}

		// Lock at previous height immediately
		content.style.height = `${previousHeight}px`;
		content.style.overflow = 'hidden';
		content.style.transition = 'none';

		// Use double-RAF to ensure browser has laid out new content
		let rafId1: number;
		let rafId2: number;

		rafId1 = requestAnimationFrame(() => {
			rafId2 = requestAnimationFrame(() => {
				if (!content) {
					return;
				}

				// Now measure the natural height of the new content
				content.style.height = 'auto';
				const newHeight = content.getBoundingClientRect().height;
				content.style.height = `${previousHeight}px`;

				// Skip animation if heights are the same
				if (Math.abs(previousHeight - newHeight) < 1) {
					content.style.height = '';
					content.style.overflow = '';
					content.style.transition = '';
					return;
				}

				// Force reflow before enabling transition
				content.offsetHeight;

				// Animate to new height
				content.style.transition =
					'height 180ms cubic-bezier(0.33, 1, 0.68, 1)';
				content.style.height = `${newHeight}px`;

				const handleTransitionEnd = (e: TransitionEvent) => {
					if (e.propertyName !== 'height') {
						return;
					}
					content.style.height = '';
					content.style.overflow = '';
					content.style.transition = '';
				};

				content.addEventListener('transitionend', handleTransitionEnd, {
					once: true,
				});
			});
		});

		return () => {
			cancelAnimationFrame(rafId1);
			cancelAnimationFrame(rafId2);
		};
	}, [activeTab]);

	// Capture height before tab change
	const handleTabChange = useCallback(
		(tab: 'purposes' | 'vendors') => {
			if (contentRef.current) {
				previousHeightRef.current = contentRef.current.offsetHeight;
			}
			setActiveTab(tab);
			openDialog({ tab });
		},
		[openDialog]
	);

	// Don't render if not mounted, no IAB state, or IAB is disabled (e.g., server returned null GVL)
	if (!isMounted || !iabState?.config.enabled) {
		return null;
	}

	const isLoading = iabState.isLoadingGVL || !iabState.gvl;

	const dialogContent = (
		<ConsentTrackingContext.Provider
			value={{ uiSource: _uiSource ?? 'iab_dialog' }}
		>
			<IABConsentDialogOverlay isOpen={isOpen} />
			<div
				className={`${styles.root} ${isVisible ? styles.dialogVisible : styles.dialogHidden}`}
				data-testid="iab-consent-dialog-root"
				dir={textDirection}
			>
				<div
					ref={cardRef}
					className={`${styles.card} ${isVisible ? styles.contentVisible : styles.contentHidden}`}
					role="dialog"
					aria-modal={config.trapFocus ? 'true' : undefined}
					aria-label={iabTranslations.preferenceCenter.title}
					tabIndex={0}
					data-testid="iab-consent-dialog-card"
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
							aria-label={common.close}
						>
							<svg
								aria-hidden="true"
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

					<Tabs.Root
						className={styles.body}
						noStyle
						onValueChange={(value) =>
							handleTabChange(value as 'purposes' | 'vendors')
						}
						value={activeTab}
					>
						{/* Segmented Control Tabs */}
						<div className={styles.tabsContainer}>
							<Tabs.List className={styles.tabsList} noStyle>
								<Tabs.Trigger
									className={styles.tabButton}
									noStyle
									value="purposes"
								>
									{iabTranslations.preferenceCenter.tabs.purposes}
									{!isLoading &&
										` (${purposes.length + specialPurposes.length + specialFeatures.length + features.length})`}
								</Tabs.Trigger>
								<Tabs.Trigger
									className={styles.tabButton}
									noStyle
									value="vendors"
								>
									{iabTranslations.preferenceCenter.tabs.vendors}
									{!isLoading && ` (${totalVendors})`}
								</Tabs.Trigger>
								<div
									aria-hidden="true"
									className={styles.tabIndicator}
									data-active-tab={activeTab}
								/>
							</Tabs.List>
						</div>

						<div ref={contentRef} className={styles.content}>
							{isLoading ? (
								<div className={styles.loadingContainer}>
									<div className={styles.loadingSpinner} />
									<p className={styles.loadingText}>
										{iabTranslations.common.loading}
									</p>
								</div>
							) : (
								<>
									<Tabs.Content
										className={styles.tabPanel}
										forceMount
										noStyle
										value="purposes"
									>
										{/* Standalone purposes */}
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

										{/* Stacks */}
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

										{/* Special Features */}
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

										{/* Essential Functions: Special Purposes + Features (locked) */}
										{(specialPurposes.length > 0 || features.length > 0) && (
											<div className={styles.specialPurposesSection}>
												<div className={styles.specialPurposesHeader}>
													<button
														type="button"
														onClick={() =>
															setSpecialPurposesExpanded(
																!specialPurposesExpanded
															)
														}
														className={styles.purposeTrigger}
													>
														<svg
															aria-hidden="true"
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
																	iabTranslations.preferenceCenter
																		.specialPurposes.title
																}
																<svg
																	aria-hidden="true"
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
																	new Set([
																		...specialPurposes.flatMap((sp) =>
																			sp.vendors.map((v) => v.id)
																		),
																		...features.flatMap((f) =>
																			f.vendors.map((v) => v.id)
																		),
																	]).size
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
														{/* Special Purposes */}
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

														{/* Features */}
														{features.map((feature) => (
															<PurposeItem
																key={`feature-${feature.id}`}
																purpose={{
																	id: feature.id,
																	name: feature.name,
																	description: feature.description,
																	illustrations: feature.illustrations,
																	vendors: feature.vendors,
																}}
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
									</Tabs.Content>
									<Tabs.Content
										className={styles.tabPanel}
										forceMount
										noStyle
										value="vendors"
									>
										<VendorList
											vendorData={iabState.gvl}
											purposes={purposes}
											vendorConsents={iabState.vendorConsents}
											onVendorToggle={handleVendorToggle}
											selectedVendorId={selectedVendorId}
											onClearSelection={() => setSelectedVendorId(null)}
											customVendors={iabState.nonIABVendors}
											vendorLegitimateInterests={
												iabState.vendorLegitimateInterests
											}
											onVendorLegitimateInterestToggle={
												handleVendorLegitimateInterestToggle
											}
										/>
									</Tabs.Content>
								</>
							)}
						</div>
					</Tabs.Root>

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

					<Branding
						hideBranding={hideBranding ?? false}
						variant="dialog-tag"
						themeKey="iabConsentDialogTag"
						data-testid="iab-consent-dialog-branding"
					/>
				</div>
			</div>
		</ConsentTrackingContext.Provider>
	);

	// Resolve trigger props
	const triggerProps: ConsentDialogTriggerProps | null =
		showTrigger === true
			? {} // Use defaults
			: showTrigger === false
				? null
				: showTrigger;

	// Render trigger even when dialog is closed
	const triggerElement = triggerProps ? (
		<ConsentDialogTrigger {...triggerProps} />
	) : null;

	if (!isOpen && !isVisible) {
		return triggerElement;
	}

	return (
		<>
			{triggerElement}
			{createPortal(dialogContent, document.body)}
		</>
	);
};
