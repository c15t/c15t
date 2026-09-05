<script lang="ts">
	import { defaultTranslationConfig } from '@c15t/core';
	import type { Model } from '@c15t/core';
	import actionStyles from '@c15t/ui/styles/components/consent-actions';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';
	import { buttonVariants } from '@c15t/ui/styles/primitives';
	import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';

	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { getIABTranslations } from '../iab-translations';
	import { resolveIABDialogDisplayModel } from '../iab-types';
	import type { VendorId } from '../iab-types';
	import { Collapsible, Dialog, Portal, Tabs } from '../primitives';
	import Branding from './branding.svelte';
	import IABPurposeItem from './iab-purpose-item.svelte';
	import IABStackItem from './iab-stack-item.svelte';
	import IABVendorList from './iab-vendor-list.svelte';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';
	import CloseIcon from './icons/close-icon.svelte';
	import InfoIcon from './icons/info-icon.svelte';
	import LockIcon from './icons/lock-icon.svelte';

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
	let dialogOpen = $state(false);
	let lastResolvedOpen = $state(false);

	// Tab state
	let activeTab = $state<string | null>('purposes');
	let selectedVendorId = $state<VendorId | null>(null);
	let specialPurposesExpanded = $state(false);

	// Sync tab from iabState when dialog opens
	$effect(() => {
		if (isOpen && iabState?.preferenceCenterTab) {
			activeTab = iabState.preferenceCenterTab;
		}
	});

	// A caller-supplied tab outranks the provider's remembered one, which
	// is what makes a "N partners" deep link land on the vendor list. It
	// goes through the provider rather than straight into `activeTab` so
	// the effect above stays the single writer.
	$effect(() => {
		if (initialTab) {
			iabState?.setPreferenceCenterTab(initialTab);
		}
	});

	$effect(() => {
		if (isOpen !== lastResolvedOpen) {
			dialogOpen = isOpen;
			lastResolvedOpen = isOpen;
		}
	});

	$effect(() => {
		if (lastResolvedOpen && !dialogOpen) {
			consent.state.setActiveUI('none');
			lastResolvedOpen = false;
		}
	});

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

<Dialog.Root
	bind:open={dialogOpen}
	closeOnInteractOutside={false}
	closeOnEscape={true}
	trapFocus={true}
	preventScroll={true}
	lazyMount
	unmountOnExit
>
	<Portal>
		<Dialog.Backdrop
			class={noStyle ? '' : styles.overlay || ''}
			data-testid="iab-consent-dialog-overlay"
		/>
		<Dialog.Positioner
			class={noStyle
				? ''
				: `${styles.root || ''} ${isOpen ? styles.dialogVisible || '' : styles.dialogHidden || ''}`}
			data-testid="iab-consent-dialog-root"
		>
			<Dialog.Content
				class={noStyle
					? className || ''
					: `${styles.card || ''} ${className || ''} ${isOpen ? styles.contentVisible || '' : styles.contentHidden || ''}`}
				dir={textDirection}
				data-testid="iab-consent-dialog-card"
			>
				<!-- Header -->
				<div class={noStyle ? '' : styles.header || ''}>
					<div class={noStyle ? '' : styles.headerContent || ''}>
						<Dialog.Title class={noStyle ? '' : styles.title || ''}>
							{iabT.preferenceCenter.title}
						</Dialog.Title>
						<Dialog.Description class={noStyle ? '' : styles.description || ''}>
							{iabT.preferenceCenter.description}
						</Dialog.Description>
					</div>
					<Dialog.CloseTrigger
						class={noStyle ? '' : styles.closeButton || ''}
						aria-label={coreTranslations.common.close}
					>
						<CloseIcon
							width="16"
							height="16"
							aria-hidden={true}
						/>
					</Dialog.CloseTrigger>
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
									<Collapsible.Root
										bind:open={specialPurposesExpanded}
										class={noStyle ? '' : styles.specialPurposesSection || ''}
									>
										<div
											class={noStyle ? '' : styles.specialPurposesHeader || ''}
										>
											<Collapsible.Trigger
												class={noStyle ? '' : styles.purposeTrigger || ''}
											>
												<Collapsible.Indicator
													class={noStyle ? '' : styles.purposeArrow || ''}
												>
													<ChevronRightIcon aria-hidden={true} />
												</Collapsible.Indicator>
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
											</Collapsible.Trigger>
											<InfoIcon
												class={noStyle ? '' : styles.infoIcon || ''}
												aria-label={iabT.preferenceCenter.specialPurposes
													.tooltip}
											/>
										</div>

										<Collapsible.Content>
											<!-- Rendered only while open, the way the React and
											     Vue surfaces do: a closed section that still
											     mounts its rows put every row's test-id in the
											     DOM twice. -->
											{#if specialPurposesExpanded}
												<div>
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
										</Collapsible.Content>
									</Collapsible.Root>
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
				<Branding
					{hideBranding}
					{noStyle}
					variant="dialog-tag"
					themeKey="iabConsentDialogTag"
					data-testid="iab-consent-dialog-branding"
				/>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
