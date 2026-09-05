'use client';

import type * as C15tCoreTypes from '@c15t/core';
/**
 * @packageDocumentation
 * Provides the IAB TCF 2.3 compliant consent dialog component.
 * Implements an accessible, pre-built consent dialog following IAB requirements.
 */
import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { ComponentPropsWithoutRef, FC, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useHeadlessIABConsentUI } from '~/component-hooks/use-headless-iab-consent-ui';
import { useTranslations } from '~/component-hooks/use-translations';
import { ConsentDialogTrigger } from '~/components/consent-dialog-trigger';
import type { ConsentDialogTriggerProps } from '~/components/consent-dialog-trigger';
import { Branding } from '~/components/consent-dialog/atoms/card';
import * as Button from '~/components/shared/ui/button';
import * as Tabs from '~/components/shared/ui/tabs';
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useComponentConfig } from '~/hooks/use-component-config';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useIABConsentManager } from '~/hooks/use-iab-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { IABConsentDialogOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { StackItem } from './atoms/stack-item';
import { VendorList } from './atoms/vendor-list';
import { useIABDisplayModel } from './hooks/use-display-model';
import type { VendorId } from './types';
import { useIABTranslations } from './use-iab-translations';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['iab'];

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
	 * Which tab the preference centre opens on. Lets a "N partners" link
	 * land on the vendor list instead of purposes.
	 * @default 'purposes'
	 */
	initialTab?: 'purposes' | 'vendors';

	/**
	 * Which consent models this dialog responds to.
	 * @default ['iab']
	 */
	models?: C15tCoreTypes.Model[];

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
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const IABConsentDialog: FC<IABConsentDialogProps> = ({
	open,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	hideBranding,
	initialTab,
	showTrigger = false,
	models = DEFAULT_MODELS,
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
		initialTab ?? iabState?.preferenceCenterTab ?? 'purposes'
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
		disableAnimation: localDisableAnimation,
		noStyle: localNoStyle,
		scrollLock: resolvedScrollLock,
		trapFocus: localTrapFocus,
	});

	const {
		consentRows,
		essentialRows,
		essentialPartnerCount,
		purposeTabCount,
		vendorTabCount,
		data: { purposes },
	} = useIABDisplayModel();

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
		const frame = requestAnimationFrame(() => setIsMounted(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	// Visibility animation
	useEffect(() => {
		if (isOpen) {
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}

		if (config.disableAnimation) {
			const frame = requestAnimationFrame(() => setIsVisible(false));
			return () => cancelAnimationFrame(frame);
		}

		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 150);
		return () => clearTimeout(timer);
	}, [isOpen, config.disableAnimation]);

	useEffect(() => {
		const preferenceCenterTab = iabState?.preferenceCenterTab;
		if (isOpen && preferenceCenterTab) {
			const frame = requestAnimationFrame(() => {
				setActiveTab(preferenceCenterTab);
			});
			return () => cancelAnimationFrame(frame);
		}
	}, [isOpen, iabState?.preferenceCenterTab]);

	// Smooth height animation when switching tabs
	useLayoutEffect(() => {
		if (activeTab !== 'purposes' && activeTab !== 'vendors') {
			return;
		}
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
		// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
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
				content.getBoundingClientRect();

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
	const trackingContextValue = useMemo(
		() => ({ uiSource: _uiSource ?? 'iab_dialog' }),
		[_uiSource]
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
		<ConsentTrackingContext.Provider value={trackingContextValue}>
			<LocalThemeContext.Provider value={config}>
				<IABConsentDialogOverlay isOpen={isOpen} />
				<div
					{...rootProps}
					data-testid="iab-consent-dialog-root"
					dir={textDirection}
				>
					{/* A `div`, not a `dialog`: the user agent's dialog padding
					    is 1em, which the card sets for itself. */}
					<div
						{...cardProps}
						ref={cardRef}
						aria-label={iabTranslations.preferenceCenter.title}
						aria-modal={config.trapFocus ? 'true' : undefined}
						// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A native `dialog` brings the user agent's 1em padding, which the card sets for itself.
						role="dialog"
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
									style={{ height: '1rem', width: '1rem' }}
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
										{!isLoading && ` (${purposeTabCount})`}
									</Tabs.Trigger>
									<Tabs.Trigger
										{...tabTriggerProps}
										noStyle
										value="vendors"
									>
										{iabTranslations.preferenceCenter.tabs.vendors}
										{!isLoading && ` (${vendorTabCount})`}
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
											{/* Standalone purposes, stacks and special features */}
											{consentRows.map((row) =>
												row.kind === 'stack' ? (
													<StackItem
														key={row.testId}
														stack={row}
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
												) : (
													<PurposeItem
														key={row.testId}
														purpose={row}
														testId={row.testId}
														isEnabled={
															row.toggle === 'special-feature'
																? (iabState.specialFeatureOptIns[row.id] ??
																	false)
																: (iabState.purposeConsents[row.id] ?? false)
														}
														onToggle={(value) => {
															if (row.toggle === 'special-feature') {
																handleSpecialFeatureToggle(row.id, value);
																return;
															}
															handlePurposeToggle(row.id, value);
														}}
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
															row.kind === 'purpose'
																? iabState.purposeLegitimateInterests
																: undefined
														}
														onPurposeLegitimateInterestToggle={
															row.kind === 'purpose'
																? handlePurposeLegitimateInterestToggle
																: undefined
														}
													/>
												)
											)}

											{/* Essential Functions: Special Purposes + Features (locked) */}
											{essentialRows.length > 0 && (
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
																	{essentialPartnerCount}{' '}
																	{essentialPartnerCount === 1
																		? iabTranslations.preferenceCenter
																				.vendorList.partnerSingular
																		: iabTranslations.preferenceCenter
																				.vendorList.partnerPlural}
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
															{essentialRows.map((row) => (
																<PurposeItem
																	key={row.testId}
																	purpose={row}
																	testId={row.testId}
																	isEnabled={true}
																	onToggle={() => {
																		/* locked: no consent to give */
																	}}
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
		// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
		showTrigger === true
			? // oxlint-disable-next-line no-inline-comments -- Preserve declaration order, interface shape, and public compatibility.
				// Use defaults
				{}
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
