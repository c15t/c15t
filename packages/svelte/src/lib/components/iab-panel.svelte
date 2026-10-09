<script lang="ts">
	import {
		defaultTranslationConfig,
		resolveConsentPresentation,
		resolveIABBannerSummary,
	} from '@c15t/core';
	import type { Model } from '@c15t/core';
	import { saveIABConsentSurface } from '@c15t/core/surface-actions';
	import { applyPublisherRestrictionsToGVL } from '@c15t/iab/headless';
	import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
	import actionStyles from '@c15t/ui/styles/components/consent-actions';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';
	import { buttonVariants } from '@c15t/ui/styles/primitives';
	import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';

	import { focusTrap } from '../actions/focus-trap';
	import { portal } from '../actions/portal';
	import { scrollLock } from '../actions/scroll-lock';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { IAB_DIALOG_SHEETS } from '../iab-dialog-sheets';
	import { getIABTranslations } from '../iab-translations';
	import { resolveIABDialogDisplayModel } from '../iab-types';
	import type { VendorId } from '../iab-types';
	import { Tabs } from '../primitives';
	import { resolveComponentStyles, toStyleAttribute } from '../utils';
	import Branding from './branding.svelte';
	import IABFeatureItem from './iab-feature-item.svelte';
	import IABPurposeItem from './iab-purpose-item.svelte';
	import IABStackItem from './iab-stack-item.svelte';
	import IABVendorList from './iab-vendor-list.svelte';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';
	import CloseIcon from './icons/close-icon.svelte';
	import InfoIcon from './icons/info-icon.svelte';
	import LockIcon from './icons/lock-icon.svelte';
	import Overlay from './overlay.svelte';
	import SurfaceStyles from './surface-styles.svelte';

	let {
		open: openProp,
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		hideBranding,
		initialTab,
		models = ['iab'] as Model[],
		class: className,
	}: {
		open?: boolean;
		noStyle?: boolean;
		/**
		 * Skip the backdrop's fade-in. Defaults to the provider's
		 * `disableAnimation`, which follows `prefers-reduced-motion`.
		 */
		disableAnimation?: boolean;
		hideBranding?: boolean;
		/**
		 * Which tab the preference centre opens on. Lets a "N partners"
		 * link land on the vendor list instead of purposes.
		 */
		initialTab?: 'purposes' | 'vendors';
		models?: Model[];
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const disableAnimation = $derived(
		localDisableAnimation ?? theme.disableAnimation ?? false
	);

	// Per-part theme slots, as on the stock consent dialog.
	const rootStyle = $derived(
		resolveComponentStyles(
			'iabConsentDialog',
			theme.theme,
			{ baseClassName: [styles.root, styles.dialogVisible], noStyle },
			noStyle
		)
	);
	const cardStyle = $derived(
		resolveComponentStyles(
			'iabConsentDialogCard',
			theme.theme,
			{
				baseClassName: [styles.card, styles.contentVisible],
				className,
				noStyle,
			},
			noStyle
		)
	);
	const headerStyle = $derived(
		resolveComponentStyles(
			'iabConsentDialogHeader',
			theme.theme,
			{ baseClassName: styles.header, noStyle },
			noStyle
		)
	);
	const footerStyle = $derived(
		resolveComponentStyles(
			'iabConsentDialogFooter',
			theme.theme,
			{ baseClassName: [styles.footer, actionStyles.actionRoot], noStyle },
			noStyle
		)
	);

	const preferences = $derived(
		resolveConsentPresentation({
			policy: consent.snapshot.policyRule,
			presentation: {
				preferences: {
					scrollLock: theme.scrollLock,
					trapFocus: theme.trapFocus,
					...consent.state.presentation?.preferences,
				},
			},
			surface: 'preferences',
		})
	);

	// IAB state
	const iabState = $derived(consent.state.iab);

	// Translations
	const iabT = $derived(getIABTranslations(consent.state.translationConfig));
	const coreTranslations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);
	const textDirection = $derived(
		getTextDirection(consent.state.translationConfig?.defaultLanguage)
	);

	// Open state
	const isOpen = $derived(
		consent.state.hasConsentUi &&
			models.includes(consent.state.model) &&
			(openProp ?? consent.state.activeUI === 'dialog') &&
			iabState?.config.enabled === true
	);

	// Tab state
	let activeTab = $state<string | null>('purposes');
	let selectedVendorId = $state<VendorId | null>(null);
	let specialPurposesExpanded = $state(false);

	// One writer for the active tab. A caller-supplied `initialTab` outranks
	// the provider's remembered one — that is what makes a "N partners"
	// deep link land on the vendor list — and the effect below mirrors
	// whatever wins back into the provider, so a reopened dialog remembers.
	$effect(() => {
		if (initialTab) {
			activeTab = initialTab;
			return;
		}
		if (isOpen && iabState?.preferenceCenterTab) {
			activeTab = iabState.preferenceCenterTab;
		}
	});

	const handleClose = function handleClose() {
		consent.state.setActiveUI('none');
	};

	const handleDialogKeydown = function handleDialogKeydown(
		event: KeyboardEvent
	) {
		if (isDialogDismissKey(event.key)) {
			event.preventDefault();
			handleClose();
		}
	};

	$effect(() => {
		if (activeTab === 'purposes' || activeTab === 'vendors') {
			iabState?.setPreferenceCenterTab(activeTab);
		}
	});

	// The rows this surface renders, from the shared display model.
	const display = $derived(
		resolveIABDialogDisplayModel(
			iabState
				? {
						customVendors: iabState.nonIABVendors ?? [],
						gvl: iabState.gvl,
						isLoadingGVL: iabState.isLoadingGVL,
						publisherRestrictions: iabState.publisherRestrictions,
					}
				: null
		)
	);
	// The vendor tab reads declarations directly, so give it the ones
	// publisher restrictions leave.
	const vendorData = $derived(
		iabState?.gvl
			? applyPublisherRestrictionsToGVL(
					iabState.gvl,
					iabState.publisherRestrictions
				)
			: null
	);

	const summary = $derived(resolveIABBannerSummary(iabState));
	const isLoading = $derived(iabState?.isLoadingGVL || !iabState?.gvl);

	const handlePurposeToggle = function handlePurposeToggle(
		purposeId: number,
		value: boolean
	) {
		iabState?.setPurposeConsent(purposeId, value);
	};

	const handleSpecialFeatureToggle = function handleSpecialFeatureToggle(
		featureId: number,
		value: boolean
	) {
		iabState?.setSpecialFeatureOptIn(featureId, value);
	};

	const handleVendorToggle = function handleVendorToggle(
		vendorId: VendorId,
		value: boolean
	) {
		iabState?.setVendorConsent(vendorId, value);
	};

	const handleVendorLegitimateInterestToggle =
		function handleVendorLegitimateInterestToggle(
			vendorId: VendorId,
			value: boolean
		) {
			iabState?.setVendorLegitimateInterest(vendorId, value);
		};

	const handlePurposeLegitimateInterestToggle =
		function handlePurposeLegitimateInterestToggle(
			purposeId: number,
			value: boolean
		) {
			iabState?.setPurposeLegitimateInterest(purposeId, value);
		};

	const handleSave = async function handleSave() {
		if (!iabState) {
			return;
		}
		const state = iabState;
		try {
			await saveIABConsentSurface(consent.kernel, () => state.save());
		} catch {
			// Keep the prompt available so a later action can retry the failed load/save.
		}
	};

	const handleAcceptAll = function handleAcceptAll() {
		iabState?.acceptAll();
		return handleSave();
	};

	const handleRejectAll = function handleRejectAll() {
		iabState?.rejectAll();
		return handleSave();
	};

	const handleVendorClick = function handleVendorClick(vendorId: VendorId) {
		selectedVendorId = vendorId;
		activeTab = 'vendors';
		iabState?.setPreferenceCenterTab('vendors');
	};

	const secondaryButtonClass = buttonVariants({
		mode: 'stroke',
		size: 'small',
		variant: 'neutral',
	}).root();
	const primaryButtonClass = buttonVariants({
		mode: 'filled',
		size: 'small',
		variant: 'primary',
	}).root();
</script>

<!--
	Plain elements, not the Ark dialog: React's IAB preference centre is
	hand-rolled, and a primitive library's `data-slot`/`data-state`
	bookkeeping is exactly the kind of difference the cross-framework gate
	is there to catch. The behaviour the primitive provided — portal, focus
	trap, scroll lock, Escape to close — comes from the same actions the
	IAB banner uses.
-->
{#if isOpen}
	<div use:portal>
		<SurfaceStyles
			sheets={IAB_DIALOG_SHEETS}
			{noStyle}
		/>
		{#if preferences.blocking}
			<Overlay
				entering={!disableAnimation}
				{styles}
				variant="iab-dialog"
				visible={isOpen}
			/>
		{/if}
		<div
			class={rootStyle.className || ''}
			style={toStyleAttribute(rootStyle.style)}
			data-testid="iab-consent-dialog-root"
			dir={textDirection}
		>
			<!-- A `div`, not a `dialog`: the user agent's dialog padding is
			     1em, which the card sets for itself. -->
			<div
				class={cardStyle.className || ''}
				style={toStyleAttribute(cardStyle.style)}
				data-testid="iab-consent-dialog-card"
				role="dialog"
				aria-modal={preferences.blocking ? 'true' : undefined}
				aria-label={iabT.preferenceCenter.title}
				aria-describedby="iab-consent-dialog-description"
				tabindex="-1"
				use:focusTrap={{
					enabled: preferences.blocking,
					initialFocus: 'first-tabbable',
				}}
				use:scrollLock={preferences.blocking}
				onkeydown={handleDialogKeydown}
			>
				<!-- Header -->
				<div
					class={headerStyle.className || ''}
					style={toStyleAttribute(headerStyle.style)}
				>
					<div class={noStyle ? '' : styles.headerContent || ''}>
						<h2 class={noStyle ? '' : styles.title || ''}>
							{iabT.preferenceCenter.title}
						</h2>
						<p
							class={noStyle ? '' : styles.description || ''}
							id="iab-consent-dialog-description"
						>
							{iabT.preferenceCenter.description}
						</p>
					</div>
					<button
						type="button"
						class={noStyle ? '' : styles.closeButton || ''}
						aria-label={coreTranslations.common.close}
						data-testid="iab-consent-dialog-close"
						onclick={handleClose}
					>
						<CloseIcon
							style="height:1rem;width:1rem"
							aria-hidden={true}
						/>
					</button>
				</div>

				<Tabs.Root
					bind:value={activeTab}
					class={noStyle ? '' : styles.body || ''}
				>
					<div class={noStyle ? '' : styles.tabsContainer || ''}>
						<Tabs.List class={noStyle ? '' : styles.tabsList || ''}>
							<Tabs.Trigger
								value="purposes"
								class={noStyle ? '' : styles.tabButton || ''}
							>
								{iabT.preferenceCenter.tabs.purposes}
								{#if !isLoading}
									({display.purposeTabCount})
								{/if}
							</Tabs.Trigger>
							<Tabs.Trigger
								value="vendors"
								class={noStyle ? '' : styles.tabButton || ''}
							>
								{iabT.preferenceCenter.tabs.vendors}
								{#if !isLoading}
									({display.vendorTabCount})
								{/if}
							</Tabs.Trigger>
							<div
								aria-hidden="true"
								class={noStyle ? '' : styles.tabIndicator || ''}
								data-active-tab={activeTab}
							></div>
						</Tabs.List>
					</div>

					<div class={noStyle ? '' : styles.content || ''}>
						<Tabs.Content
							value="purposes"
							forceMount
							class={noStyle ? '' : styles.tabPanel || ''}
						>
							{#if isLoading}
								<div class={noStyle ? '' : styles.loadingContainer || ''}>
									<div class={noStyle ? '' : styles.loadingSpinner || ''}></div>
									<p class={noStyle ? '' : styles.loadingText || ''}>
										{iabT.common.loading}
									</p>
								</div>
							{:else if display.isReady && iabState}
								<!-- Purposes, stacks and special features, from the
								     shared display model so every adapter lists the
								     same rows in the same order. -->
								{#each display.consentRows as row (row.testId)}
									{#if row.kind === 'stack'}
										<IABStackItem
											stack={row}
											consents={iabState.purposeConsents}
											onToggle={handlePurposeToggle}
											vendorConsents={iabState.vendorConsents}
											onVendorToggle={handleVendorToggle}
											onVendorClick={handleVendorClick}
											vendorLegitimateInterests={iabState.vendorLegitimateInterests}
											onVendorLegitimateInterestToggle={handleVendorLegitimateInterestToggle}
											purposeLegitimateInterests={iabState.purposeLegitimateInterests}
											onPurposeLegitimateInterestToggle={handlePurposeLegitimateInterestToggle}
											{noStyle}
											{iabT}
										/>
									{:else if row.toggle === 'special-feature'}
										<IABPurposeItem
											purpose={row}
											testId={row.testId}
											isEnabled={iabState.specialFeatureOptIns[row.id] ?? false}
											onToggle={(value) =>
												handleSpecialFeatureToggle(row.id, value)}
											vendorConsents={iabState.vendorConsents}
											onVendorToggle={handleVendorToggle}
											onVendorClick={handleVendorClick}
											vendorLegitimateInterests={iabState.vendorLegitimateInterests}
											onVendorLegitimateInterestToggle={handleVendorLegitimateInterestToggle}
											{noStyle}
											{iabT}
										/>
									{:else}
										<IABPurposeItem
											purpose={row}
											testId={row.testId}
											isEnabled={iabState.purposeConsents[row.id] ?? false}
											onToggle={(value) => handlePurposeToggle(row.id, value)}
											vendorConsents={iabState.vendorConsents}
											onVendorToggle={handleVendorToggle}
											onVendorClick={handleVendorClick}
											vendorLegitimateInterests={iabState.vendorLegitimateInterests}
											onVendorLegitimateInterestToggle={handleVendorLegitimateInterestToggle}
											purposeLegitimateInterests={iabState.purposeLegitimateInterests}
											onPurposeLegitimateInterestToggle={handlePurposeLegitimateInterestToggle}
											{noStyle}
											{iabT}
										/>
									{/if}
								{/each}

								<!-- Essential Functions: Special Purposes (locked) -->
								{#if display.essentialRows.length > 0}
									<div
										class={noStyle ? '' : styles.specialPurposesSection || ''}
									>
										<div
											class={noStyle ? '' : styles.specialPurposesHeader || ''}
										>
											<button
												type="button"
												aria-expanded={specialPurposesExpanded}
												class={noStyle ? '' : styles.purposeTrigger || ''}
												onclick={() =>
													(specialPurposesExpanded = !specialPurposesExpanded)}
											>
												<ChevronRightIcon
													class={noStyle ? '' : styles.purposeArrow || ''}
													aria-hidden={true}
													expanded={specialPurposesExpanded}
												/>
												<div class={noStyle ? '' : styles.purposeInfo || ''}>
													<h3
														class={noStyle
															? ''
															: styles.specialPurposesTitle || ''}
													>
														{iabT.preferenceCenter.specialPurposes.title}
														<LockIcon
															class={noStyle ? '' : styles.lockIcon || ''}
															aria-hidden={true}
														/>
													</h3>
													<p class={noStyle ? '' : styles.purposeMeta || ''}>
														{display.essentialPartnerCount}
														{display.essentialPartnerCount === 1
															? iabT.preferenceCenter.vendorList.partnerSingular
															: iabT.preferenceCenter.vendorList.partnerPlural}
													</p>
												</div>
											</button>
											<div style="position:relative">
												<InfoIcon
													class={noStyle ? '' : styles.infoIcon || ''}
													aria-label={iabT.preferenceCenter.specialPurposes
														.tooltip}
												/>
											</div>
										</div>

										{#if specialPurposesExpanded}
											<div style="padding:0.75rem">
												{#each display.essentialRows as row (row.testId)}
													<IABPurposeItem
														purpose={row}
														testId={row.testId}
														isEnabled={true}
														onToggle={() => {}}
														vendorConsents={iabState.vendorConsents}
														onVendorToggle={handleVendorToggle}
														onVendorClick={handleVendorClick}
														isLocked={true}
														{noStyle}
														{iabT}
													/>
												{/each}
											</div>
										{/if}
									</div>
								{/if}

								<!-- Features: informational, no controls (TCF Policies v5.0.b) -->
								{#if display.featureRows.length > 0}
									<section
										aria-label={iabT.preferenceCenter.features.title}
										class={noStyle ? '' : styles.featuresSection || ''}
										data-testid="iab-consent-dialog-features"
									>
										<div class={noStyle ? '' : styles.featuresHeader || ''}>
											<h3 class={noStyle ? '' : styles.featuresTitle || ''}>
												{iabT.preferenceCenter.features.title}
											</h3>
											<p
												class={noStyle ? '' : styles.featuresDescription || ''}
											>
												{display.featuresStandardText ??
													iabT.preferenceCenter.features.description}
											</p>
										</div>
										<div class={noStyle ? '' : styles.featuresList || ''}>
											{#each display.featureRows as row (row.testId)}
												<IABFeatureItem
													feature={row}
													testId={row.testId}
													{noStyle}
													{iabT}
												/>
											{/each}
										</div>
									</section>
								{/if}

								<!-- Consent storage notice -->
								<div class={noStyle ? '' : styles.consentNotice || ''}>
									<p class={noStyle ? '' : styles.consentNoticeText || ''}>
										{iabT.preferenceCenter.footer.consentStorage}
									</p>
								</div>
							{/if}
						</Tabs.Content>

						<Tabs.Content
							value="vendors"
							forceMount
							class={noStyle ? '' : styles.tabPanel || ''}
						>
							{#if iabState}
								<IABVendorList
									{vendorData}
									purposes={display.data.purposes}
									vendorConsents={iabState.vendorConsents}
									onVendorToggle={handleVendorToggle}
									{selectedVendorId}
									onClearSelection={() => (selectedVendorId = null)}
									customVendors={iabState.nonIABVendors}
									vendorLegitimateInterests={iabState.vendorLegitimateInterests}
									onVendorLegitimateInterestToggle={handleVendorLegitimateInterestToggle}
									{noStyle}
									{iabT}
									language={consent.snapshot.translations?.language}
								/>
							{/if}
						</Tabs.Content>
					</div>
				</Tabs.Root>

				<!-- Footer -->
				<div
					class={footerStyle.className || ''}
					style={toStyleAttribute(footerStyle.style)}
					data-direction="row"
					data-split
				>
					<div
						class={noStyle ? '' : actionStyles.actionGroup}
						data-direction="row"
					>
						<button
							type="button"
							class={noStyle ? '' : secondaryButtonClass}
							onclick={handleRejectAll}
							disabled={!summary.isReady}
							data-action="reject"
						>
							{iabT.common.rejectAll}
						</button>
						<button
							type="button"
							class={noStyle ? '' : secondaryButtonClass}
							onclick={handleAcceptAll}
							disabled={!summary.isReady}
							data-action="accept"
						>
							{iabT.common.acceptAll}
						</button>
					</div>
					<div
						class={noStyle ? '' : actionStyles.actionGroup}
						data-direction="row"
					>
						<button
							type="button"
							class={noStyle ? '' : primaryButtonClass}
							onclick={handleSave}
							disabled={isLoading}
							data-action="customize"
						>
							{iabT.common.saveSettings}
						</button>
					</div>
				</div>
				<Branding
					{hideBranding}
					{noStyle}
					variant="dialog-tag"
					themeKey="iabConsentDialogTag"
					data-testid="iab-consent-dialog-branding"
				/>
			</div>
		</div>
	</div>
{/if}
