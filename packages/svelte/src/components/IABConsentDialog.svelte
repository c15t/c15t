<script lang="ts">
	import type { Model } from 'c15t';
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import { Tabs } from '@ark-ui/svelte/tabs';
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
	import { getTextDirection } from '@c15t/ui/utils';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { getIABTranslations } from '../iab-translations';
	import { processGVLData, type VendorId } from '../iab-types';
	import IABPurposeItem from './IABPurposeItem.svelte';
	import IABStackItem from './IABStackItem.svelte';
	import IABVendorList from './IABVendorList.svelte';
	import ConsentIconOnly from './icons/ConsentIconOnly.svelte';
	import C15TIcon from './icons/C15TIcon.svelte';

	let {
		open: openProp,
		noStyle: localNoStyle,
		hideBranding,
		models = ['iab'] as Model[],
		class: className,
	}: {
		open?: boolean;
		noStyle?: boolean;
		hideBranding?: boolean;
		models?: Model[];
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

	// IAB state
	const iabState = $derived(consent.state.iab);

	// Translations
	const iabT = $derived(
		getIABTranslations(consent.state.translationConfig)
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

	// Sync tab from iabState when dialog opens
	$effect(() => {
		if (isOpen && iabState?.preferenceCenterTab) {
			activeTab = iabState.preferenceCenterTab;
		}
	});

	// Process GVL data
	const gvlData = $derived.by(() => {
		if (!iabState?.gvl) return null;
		return processGVLData(iabState.gvl, iabState.nonIABVendors || []);
	});

	// Total vendor count
	const totalVendors = $derived.by(() => {
		if (!iabState?.gvl) return 0;
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	});

	const isLoading = $derived(iabState?.isLoadingGVL || !iabState?.gvl);

	// Handlers
	function handleOpenChange(details: { open: boolean }) {
		if (!details.open) {
			consent.state.setActiveUI('none');
		}
	}

	function handleTabChange(details: { value: string | null }) {
		if (details.value === 'purposes' || details.value === 'vendors') {
			activeTab = details.value;
			iabState?.setPreferenceCenterTab(details.value);
		}
	}

	function handlePurposeToggle(purposeId: number, value: boolean) {
		iabState?.setPurposeConsent(purposeId, value);
	}

	function handleSpecialFeatureToggle(featureId: number, value: boolean) {
		iabState?.setSpecialFeatureOptIn(featureId, value);
	}

	function handleVendorToggle(vendorId: VendorId, value: boolean) {
		iabState?.setVendorConsent(vendorId, value);
	}

	function handleVendorLegitimateInterestToggle(
		vendorId: VendorId,
		value: boolean
	) {
		iabState?.setVendorLegitimateInterest(vendorId, value);
	}

	function handlePurposeLegitimateInterestToggle(
		purposeId: number,
		value: boolean
	) {
		iabState?.setPurposeLegitimateInterest(purposeId, value);
	}

	function handleAcceptAll() {
		iabState?.acceptAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	}

	function handleRejectAll() {
		iabState?.rejectAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	}

	function handleSave() {
		iabState?.save();
		consent.state.setActiveUI('none');
	}

	function handleVendorClick(vendorId: VendorId) {
		selectedVendorId = vendorId;
		activeTab = 'vendors';
		iabState?.setPreferenceCenterTab('vendors');
	}

	// Branding
	const branding = $derived(consent.state.branding);
	const showBranding = $derived(!hideBranding && branding !== 'none');
	const brandingHref = $derived.by(() => {
		const refParam =
			typeof window !== 'undefined'
				? `?ref=${window.location.hostname}`
				: '';
		return branding === 'consent'
			? `https://consent.io${refParam}`
			: `https://c15t.com${refParam}`;
	});
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={handleOpenChange}
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
			data-testid="consent-overlay"
		/>
		<Dialog.Positioner
			class={noStyle ? '' : styles.root || ''}
			data-testid="iab-consent-dialog-root"
		>
			<Dialog.Content
				class={noStyle
					? className || ''
					: `${styles.card || ''} ${className || ''}`}
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
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</Dialog.CloseTrigger>
				</div>

				<!-- Tabs -->
				<Tabs.Root
					value={activeTab}
					onValueChange={handleTabChange}
					class={noStyle ? '' : styles.tabsContainer || ''}
				>
					<Tabs.List class={noStyle ? '' : styles.tabsList || ''}>
						<Tabs.Trigger
							value="purposes"
							class={noStyle ? '' : styles.tabButton || ''}
						>
							{iabT.preferenceCenter.tabs.purposes}
							{#if !isLoading && gvlData}
								({gvlData.purposes.length +
									gvlData.specialPurposes.length +
									gvlData.specialFeatures.length +
									gvlData.features.length})
							{/if}
						</Tabs.Trigger>
						<Tabs.Trigger
							value="vendors"
							class={noStyle ? '' : styles.tabButton || ''}
						>
							{iabT.preferenceCenter.tabs.vendors}
							{#if !isLoading}
								({totalVendors})
							{/if}
						</Tabs.Trigger>
					</Tabs.List>

					<!-- Purposes Tab Content -->
					<Tabs.Content
						value="purposes"
						class={noStyle ? '' : styles.content || ''}
					>
						{#if isLoading}
							<div class={noStyle ? '' : styles.loadingContainer || ''}>
								<div class={noStyle ? '' : styles.loadingSpinner || ''}></div>
								<p class={noStyle ? '' : styles.loadingText || ''}>
									{iabT.common.loading}
								</p>
							</div>
						{:else if gvlData && iabState}
							<!-- Standalone purposes -->
							{#each gvlData.standalonePurposes as purpose (purpose.id)}
								<IABPurposeItem
									{purpose}
									isEnabled={iabState.purposeConsents[purpose.id] ?? false}
									onToggle={(value) =>
										handlePurposeToggle(purpose.id, value)}
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
							{/each}

							<!-- Stacks -->
							{#each gvlData.stacks as stack (stack.id)}
								<IABStackItem
									{stack}
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
							{/each}

							<!-- Special Features -->
							{#each gvlData.specialFeatures as feature (feature.id)}
								<IABPurposeItem
									purpose={{
										id: feature.id,
										name: feature.name,
										description: feature.description,
										illustrations: feature.illustrations,
										vendors: feature.vendors,
									}}
									isEnabled={iabState.specialFeatureOptIns[feature.id] ??
										false}
									onToggle={(value) =>
										handleSpecialFeatureToggle(feature.id, value)}
									vendorConsents={iabState.vendorConsents}
									onVendorToggle={handleVendorToggle}
									onVendorClick={handleVendorClick}
									vendorLegitimateInterests={iabState.vendorLegitimateInterests}
									onVendorLegitimateInterestToggle={handleVendorLegitimateInterestToggle}
									{noStyle}
									{iabT}
								/>
							{/each}

							<!-- Essential Functions: Special Purposes + Features (locked) -->
							{#if gvlData.specialPurposes.length > 0 || gvlData.features.length > 0}
								<Collapsible.Root
									bind:open={specialPurposesExpanded}
									class={noStyle
										? ''
										: styles.specialPurposesSection || ''}
								>
									<div
										class={noStyle
											? ''
											: styles.specialPurposesHeader || ''}
									>
										<Collapsible.Trigger
											class={noStyle ? '' : styles.purposeTrigger || ''}
										>
											<Collapsible.Indicator class={noStyle ? '' : styles.purposeArrow || ''}>
												<svg
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path d="M9 5l7 7-7 7" />
												</svg>
											</Collapsible.Indicator>
											<div class={noStyle ? '' : styles.purposeInfo || ''}>
												<h3
													class={noStyle
														? ''
														: styles.specialPurposesTitle || ''}
												>
													{iabT.preferenceCenter.specialPurposes.title}
													<svg
														class={noStyle ? '' : styles.lockIcon || ''}
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
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
												<p class={noStyle ? '' : styles.purposeMeta || ''}>
													{new Set([
														...gvlData.specialPurposes.flatMap((sp) =>
															sp.vendors.map((v) => v.id)
														),
														...gvlData.features.flatMap((f) =>
															f.vendors.map((v) => v.id)
														),
													]).size} partners
												</p>
											</div>
										</Collapsible.Trigger>
										<svg
											class={noStyle ? '' : styles.infoIcon || ''}
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-label={iabT.preferenceCenter.specialPurposes
												.tooltip}
										>
											<circle cx="12" cy="12" r="10" />
											<line x1="12" y1="16" x2="12" y2="12" />
											<line x1="12" y1="8" x2="12.01" y2="8" />
										</svg>
									</div>

									<Collapsible.Content>
										<div class={noStyle ? '' : styles.specialPurposesContent || ''}>
											<!-- Special Purposes -->
											{#each gvlData.specialPurposes as purpose (purpose.id)}
												<IABPurposeItem
													{purpose}
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

											<!-- Features -->
											{#each gvlData.features as feature (feature.id)}
												<IABPurposeItem
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
													{noStyle}
													{iabT}
												/>
											{/each}
										</div>
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

					<!-- Vendors Tab Content -->
					<Tabs.Content
						value="vendors"
						class={noStyle ? '' : styles.content || ''}
					>
						{#if iabState}
							<IABVendorList
								vendorData={iabState.gvl}
								purposes={gvlData?.purposes ?? []}
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
				</Tabs.Root>

				<!-- Footer -->
				<div class={noStyle ? '' : styles.footer || ''}>
					<div class={noStyle ? '' : styles.footerButtons || ''}>
						<button
							type="button"
							class={noStyle ? '' : styles.footerButton || ''}
							onclick={handleRejectAll}
							disabled={isLoading}
						>
							{iabT.common.rejectAll}
						</button>
						<button
							type="button"
							class={noStyle ? '' : styles.footerButton || ''}
							onclick={handleAcceptAll}
							disabled={isLoading}
						>
							{iabT.common.acceptAll}
						</button>
					</div>
					<div class={noStyle ? '' : styles.footerSpacer || ''}></div>
					<button
						type="button"
						class={noStyle
							? ''
							: `${styles.footerButton || ''} ${styles.footerButtonPrimary || ''}`}
						onclick={handleSave}
						disabled={isLoading}
					>
						{iabT.common.saveSettings}
					</button>
				</div>

				<!-- Branding -->
				{#if showBranding}
					<div class={noStyle ? '' : styles.branding || ''}>
						<a
							dir="ltr"
							href={brandingHref}
						>
							Secured by
								{#if branding === 'consent'}
									<ConsentIconOnly class={styles.brandingConsent || ''} />
								{:else}
									<C15TIcon class={styles.brandingC15T || ''} />
								{/if}
						</a>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
