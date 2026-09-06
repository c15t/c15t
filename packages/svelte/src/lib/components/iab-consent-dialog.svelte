<script lang="ts">
	import { defaultTranslationConfig } from '@c15t/core';
	import type { Model } from '@c15t/core';
	import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
	import actionStyles from '@c15t/ui/styles/components/consent-actions';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';
	import { buttonVariants } from '@c15t/ui/styles/primitives';
	import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';

	import { focusTrap } from '../actions/focus-trap';
	import { portal } from '../actions/portal';
	import { scrollLock } from '../actions/scroll-lock';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { getIABTranslations } from '../iab-translations';
	import { resolveIABDialogDisplayModel } from '../iab-types';
	import type { VendorId } from '../iab-types';
	import { Tabs } from '../primitives';
	import Branding from './branding.svelte';
	import IABPurposeItem from './iab-purpose-item.svelte';
	import IABStackItem from './iab-stack-item.svelte';
	import IABVendorList from './iab-vendor-list.svelte';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';
	import CloseIcon from './icons/close-icon.svelte';
	import InfoIcon from './icons/info-icon.svelte';
	import LockIcon from './icons/lock-icon.svelte';
	import Overlay from './overlay.svelte';

	let {
		open: openProp,
		noStyle: localNoStyle,
		hideBranding,
		initialTab,
		models = ['iab'] as Model[],
		class: className,
	}: {
		open?: boolean;
		noStyle?: boolean;
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
					}
				: null
		)
	);

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

	const handleAcceptAll = function handleAcceptAll() {
		iabState?.acceptAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	};

	const handleRejectAll = function handleRejectAll() {
		iabState?.rejectAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	};

	const handleSave = function handleSave() {
		iabState?.save();
		consent.state.setActiveUI('none');
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
		<Overlay
			variant="iab-dialog"
			visible={isOpen}
		/>
		<div
			class={noStyle
				? ''
				: `${styles.root || ''} ${styles.dialogVisible || ''}`}
			data-testid="iab-consent-dialog-root"
			dir={textDirection}
		>
			<!-- A `div`, not a `dialog`: the user agent's dialog padding is
			     1em, which the card sets for itself. -->
			<div
				class={noStyle
					? className || ''
					: `${styles.card || ''} ${className || ''} ${styles.contentVisible || ''}`}
				data-testid="iab-consent-dialog-card"
				role="dialog"
				aria-modal="true"
				aria-label={iabT.preferenceCenter.title}
				tabindex="-1"
				use:focusTrap={true}
				use:scrollLock={true}
				onkeydown={handleDialogKeydown}
			>
				<!-- Header -->
				<div class={noStyle ? '' : styles.header || ''}>
					<div class={noStyle ? '' : styles.headerContent || ''}>
						<h2 class={noStyle ? '' : styles.title || ''}>
							{iabT.preferenceCenter.title}
						</h2>
						<p class={noStyle ? '' : styles.description || ''}>
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

								<!-- Essential Functions: Special Purposes + Features (locked) -->
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
									vendorData={iabState.gvl}
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
								/>
							{/if}
						</Tabs.Content>
					</div>
				</Tabs.Root>

				<!-- Footer -->
				<div
					class={noStyle ? '' : `${styles.footer} ${actionStyles.actionRoot}`}
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
							disabled={isLoading}
							data-action="reject"
						>
							{iabT.common.rejectAll}
						</button>
						<button
							type="button"
							class={noStyle ? '' : secondaryButtonClass}
							onclick={handleAcceptAll}
							disabled={isLoading}
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
