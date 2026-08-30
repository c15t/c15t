'use client';

/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant consent dialog component.
 * Implements an accessible, pre-built consent dialog following IAB requirements.
 */

import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import {
	type ComponentPropsWithoutRef,
	type FC,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useHeadlessIABConsentUI } from '~/v3/component-hooks/use-headless-iab-consent-ui';
import { useTranslations } from '~/v3/component-hooks/use-translations';
import { Branding } from '~/v3/components/consent-dialog/atoms/card';
import {
	ConsentDialogTrigger,
	type ConsentDialogTriggerProps,
} from '~/v3/components/consent-dialog-trigger';
import * as Button from '~/v3/components/shared/ui/button';
import * as Tabs from '~/v3/components/shared/ui/tabs';
import { ConsentTrackingContext } from '~/v3/context/consent-tracking-context';
import { LocalThemeContext } from '~/v3/context/theme-context';
import { useComponentConfig } from '~/v3/hooks/use-component-config';
import { useFocusTrap } from '~/v3/hooks/use-focus-trap';
import { useIABConsentManager } from '~/v3/hooks/use-iab-consent-manager';
import { useScrollLock } from '~/v3/hooks/use-scroll-lock';
import { useTextDirection } from '~/v3/hooks/use-text-direction';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';
import { IABConsentDialogOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { StackItem } from './atoms/stack-item';
import { VendorList } from './atoms/vendor-list';
import { useGVLData } from './hooks/use-gvl-data';
import type { VendorId } from './types';
import { useIABTranslations } from './use-iab-translations';

const dialogFocusTargetProps = { tabIndex: -1 } as const;

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
	models?: import('@c15t/core').Model[];

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
	const { components } = useUIConfig();
	const {
		iab: iabState,
		activeUI,
		policyDialog,
		translationConfig,
		model,
	} = useIABConsentManager();
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

	const {
		purposes,
		specialPurposes,
		specialFeatures,
		features,
		stacks,
		standalonePurposes,
		totalVendors,
	} = useGVLData();

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

	const handleClose = useCallback(() => {
		closeUI();
	}, [closeUI]);

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

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isDialogDismissKey(event.key)) {
				event.preventDefault();
				handleClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [handleClose, isOpen]);

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
	// oxlint-disable-next-line react/exhaustive-deps -- activeTab is intentionally used as a trigger
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
	const rootProps = mergeSlotProps(components?.['iab-dialog']?.root, {
		baseClassName: `${styles.root} ${isVisible ? styles.dialogVisible : styles.dialogHidden}`,
		noStyle: config.noStyle,
	});
	const cardProps = mergeSlotProps(components?.['iab-dialog']?.card, {
		baseClassName: `${styles.card} ${isVisible ? styles.contentVisible : styles.contentHidden}`,
		noStyle: config.noStyle,
	});
	const headerProps = mergeSlotProps(components?.['iab-dialog']?.header, {
		baseClassName: styles.header,
		noStyle: config.noStyle,
	});
	const headerContentProps = mergeSlotProps(
		components?.['iab-dialog']?.headerContent,
		{
			baseClassName: styles.headerContent,
			noStyle: config.noStyle,
		}
	);
	const titleProps = mergeSlotProps(components?.['iab-dialog']?.title, {
		baseClassName: styles.title,
		noStyle: config.noStyle,
	});
	const descriptionProps = mergeSlotProps(
		components?.['iab-dialog']?.description,
		{
			baseClassName: styles.description,
			noStyle: config.noStyle,
		}
	);
	const closeButtonProps = mergeSlotProps(
		components?.['iab-dialog']?.closeButton,
		{
			baseClassName: styles.closeButton,
			noStyle: config.noStyle,
		}
	);
	const bodyProps = mergeSlotProps(components?.['iab-dialog']?.body, {
		baseClassName: styles.body,
		noStyle: config.noStyle,
	}) as Omit<
		ComponentPropsWithoutRef<typeof Tabs.Root>,
		'children' | 'onValueChange' | 'value'
	>;
	const tabsProps = mergeSlotProps(components?.['iab-dialog']?.tabs, {
		baseClassName: styles.tabsContainer,
		noStyle: config.noStyle,
	});
	const tabsListProps = mergeSlotProps(components?.['iab-dialog']?.tabsList, {
		baseClassName: styles.tabsList,
		noStyle: config.noStyle,
	});
	const tabTriggerProps = mergeSlotProps(
		components?.['iab-dialog']?.tabTrigger,
		{
			baseClassName: styles.tabButton,
			noStyle: config.noStyle,
		}
	);
	const tabIndicatorProps = mergeSlotProps(
		components?.['iab-dialog']?.tabIndicator,
		{
			baseClassName: styles.tabIndicator,
			noStyle: config.noStyle,
		}
	);
	const contentProps = mergeSlotProps(components?.['iab-dialog']?.content, {
		baseClassName: styles.content,
		noStyle: config.noStyle,
	});
	const loadingProps = mergeSlotProps(components?.['iab-dialog']?.loading, {
		baseClassName: styles.loadingContainer,
		noStyle: config.noStyle,
	});
	const tabPanelProps = mergeSlotProps(components?.['iab-dialog']?.tabPanel, {
		baseClassName: styles.tabPanel,
		noStyle: config.noStyle,
	});
	const specialPurposesProps = mergeSlotProps(
		components?.['iab-dialog']?.specialPurposes,
		{
			baseClassName: styles.specialPurposesSection,
			noStyle: config.noStyle,
		}
	);
	const consentNoticeProps = mergeSlotProps(
		components?.['iab-dialog']?.consentNotice,
		{
			baseClassName: styles.consentNotice,
			noStyle: config.noStyle,
		}
	);
	const footerActionProps = mergeSlotProps(
		components?.['iab-dialog']?.actions,
		{
			baseClassName: actionStyles.actionRoot,
			noStyle: config.noStyle,
		}
	);
	const footerProps = mergeSlotProps(components?.['iab-dialog']?.footer, {
		baseClassName: styles.footer,
		noStyle: config.noStyle,
		...footerActionProps,
	});
	const actionGroupProps = mergeSlotProps(
		components?.['iab-dialog']?.actionGroup,
		{
			baseClassName: actionStyles.actionGroup,
			'data-direction': 'row',
			noStyle: config.noStyle,
		}
	);

	const dialogContent = (
		<ConsentTrackingContext.Provider
			value={{ uiSource: _uiSource ?? 'iab_dialog' }}
		>
			<LocalThemeContext.Provider value={config}>
				<IABConsentDialogOverlay isOpen={isOpen} />
				<div
					{...rootProps}
					data-testid="iab-consent-dialog-root"
					dir={textDirection}
				>
					<div
						{...cardProps}
						ref={cardRef}
						role="dialog"
						aria-modal={config.trapFocus ? 'true' : undefined}
						aria-label={iabTranslations.preferenceCenter.title}
						{...dialogFocusTargetProps}
						data-testid="iab-consent-dialog-card"
					>
						{/* Header */}
						<div {...headerProps}>
							<div {...headerContentProps}>
								<h2 {...titleProps}>
									{iabTranslations.preferenceCenter.title}
								</h2>
								<p {...descriptionProps}>
									{iabTranslations.preferenceCenter.description}
								</p>
							</div>
							<button
								{...closeButtonProps}
								type="button"
								onClick={handleClose}
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
									<line
										x1="18"
										y1="6"
										x2="6"
										y2="18"
									/>
									<line
										x1="6"
										y1="6"
										x2="18"
										y2="18"
									/>
								</svg>
							</button>
						</div>

						<Tabs.Root
							{...bodyProps}
							noStyle
							onValueChange={(value) =>
								handleTabChange(value as 'purposes' | 'vendors')
							}
							value={activeTab}
						>
							{/* Segmented Control Tabs */}
							<div {...tabsProps}>
								<Tabs.List
									{...tabsListProps}
									noStyle
								>
									<Tabs.Trigger
										{...tabTriggerProps}
										noStyle
										value="purposes"
									>
										{iabTranslations.preferenceCenter.tabs.purposes}
										{!isLoading &&
											` (${purposes.length + specialPurposes.length + specialFeatures.length + features.length})`}
									</Tabs.Trigger>
									<Tabs.Trigger
										{...tabTriggerProps}
										noStyle
										value="vendors"
									>
										{iabTranslations.preferenceCenter.tabs.vendors}
										{!isLoading && ` (${totalVendors})`}
									</Tabs.Trigger>
									<div
										{...tabIndicatorProps}
										aria-hidden="true"
										data-active-tab={activeTab}
									/>
								</Tabs.List>
							</div>

							<div
								{...contentProps}
								ref={contentRef}
							>
								{isLoading ? (
									<div {...loadingProps}>
										<div className={styles.loadingSpinner} />
										<p className={styles.loadingText}>
											{iabTranslations.common.loading}
										</p>
									</div>
								) : (
									<>
										<Tabs.Content
											{...tabPanelProps}
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
												<div {...specialPurposesProps}>
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
																	iabTranslations.preferenceCenter
																		.specialPurposes.tooltip
																}
															>
																<circle
																	cx="12"
																	cy="12"
																	r="10"
																/>
																<line
																	x1="12"
																	y1="16"
																	x2="12"
																	y2="12"
																/>
																<line
																	x1="12"
																	y1="8"
																	x2="12.01"
																	y2="8"
																/>
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
											<div {...consentNoticeProps}>
												<p className={styles.consentNoticeText}>
													{
														iabTranslations.preferenceCenter.footer
															.consentStorage
													}
												</p>
											</div>
										</Tabs.Content>
										<Tabs.Content
											{...tabPanelProps}
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
						<div {...footerProps}>
							<div {...actionGroupProps}>
								<Button.Root
									variant="neutral"
									mode="stroke"
									size="small"
									onClick={handleRejectAll}
									disabled={isLoading}
									data-action="reject"
								>
									{iabTranslations.common.rejectAll}
								</Button.Root>
								<Button.Root
									variant="neutral"
									mode="stroke"
									size="small"
									onClick={handleAcceptAll}
									disabled={isLoading}
									data-action="accept"
								>
									{iabTranslations.common.acceptAll}
								</Button.Root>
							</div>
							<Button.Root
								variant="primary"
								mode="filled"
								size="small"
								onClick={handleSave}
								disabled={isLoading}
								data-action="customize"
							>
								{iabTranslations.common.saveSettings}
							</Button.Root>
						</div>

						<Branding
							hideBranding={hideBranding ?? false}
							variant="dialog-tag"
							slotContext="iab-dialog"
							data-testid="iab-consent-dialog-branding"
						/>
					</div>
				</div>
			</LocalThemeContext.Provider>
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
