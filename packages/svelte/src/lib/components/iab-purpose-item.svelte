<script lang="ts">
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';
	import switchStyles from '@c15t/ui/styles/components/switch';

	import type { IABTranslations } from '../iab-translations';
	import type { ProcessedPurpose, VendorId } from '../iab-types';
	import { PreferenceItem, Switch } from '../primitives';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';
	import GlobeIcon from './icons/globe-icon.svelte';
	import LegitimateInterestIcon from './icons/legitimate-interest-icon.svelte';
	import LockIcon from './icons/lock-icon.svelte';

	// The shared switch stylesheet, keyed off `data-size`, which is what
	// the React and Vue switches use. The primitives sheet renders the same
	// control through appended `root-small`/`track-small` classes; two
	// sheets for one control is drift the IAB rows cannot afford.
	const sw = switchStyles;

	let {
		purpose,
		testId,
		isEnabled,
		onToggle,
		vendorConsents,
		onVendorToggle,
		onVendorClick,
		isLocked = false,
		vendorLegitimateInterests = {},
		onVendorLegitimateInterestToggle,
		purposeLegitimateInterests = {},
		onPurposeLegitimateInterestToggle,
		noStyle = false,
		iabT,
	}: {
		purpose: ProcessedPurpose;
		/**
		 * The row's `data-testid`, from the shared display model. A purpose,
		 * a special purpose and a special feature can all be numbered `1`,
		 * so the id alone does not identify the row.
		 */
		testId?: string;
		isEnabled: boolean;
		onToggle: (value: boolean) => void;
		vendorConsents: Record<string, boolean>;
		onVendorToggle: (vendorId: VendorId, value: boolean) => void;
		onVendorClick: (vendorId: VendorId) => void;
		isLocked?: boolean;
		vendorLegitimateInterests?: Record<string, boolean>;
		onVendorLegitimateInterestToggle?: (
			vendorId: VendorId,
			value: boolean
		) => void;
		purposeLegitimateInterests?: Record<number, boolean>;
		onPurposeLegitimateInterestToggle?: (
			purposeId: number,
			value: boolean
		) => void;
		noStyle?: boolean;
		iabT: IABTranslations;
	} = $props();

	let isExpanded = $state(false);
	let showExamples = $state(false);
	let showVendors = $state(false);
	let purposeChecked = $state(false);

	const legIntVendors = $derived(
		purpose.vendors.filter((v) => v.usesLegitimateInterest)
	);
	const consentVendors = $derived(
		purpose.vendors.filter((v) => !v.usesLegitimateInterest)
	);

	const getVendorConsent = function getVendorConsent(
		vendorId: VendorId
	): boolean {
		return vendorConsents[String(vendorId)] ?? false;
	};

	const getVendorLegitimateInterest = function getVendorLegitimateInterest(
		vendorId: VendorId
	): boolean {
		return vendorLegitimateInterests[String(vendorId)] ?? true;
	};

	// Check if purpose-level LI is allowed (not objected)
	const isPurposeLIAllowed = $derived(
		purposeLegitimateInterests[purpose.id] ?? true
	);

	// Handler for purpose-level LI objection
	const handlePurposeLIObjection = function handlePurposeLIObjection() {
		const newValue = !isPurposeLIAllowed;
		onPurposeLegitimateInterestToggle?.(purpose.id, newValue);
		if (onVendorLegitimateInterestToggle) {
			for (const vendor of legIntVendors) {
				onVendorLegitimateInterestToggle(vendor.id, newValue);
			}
		}
	};

	// Separate IAB and custom vendors
	const iabConsentVendors = $derived(consentVendors.filter((v) => !v.isCustom));
	const customConsentVendors = $derived(
		consentVendors.filter((v) => v.isCustom)
	);
	const iabLegIntVendors = $derived(legIntVendors.filter((v) => !v.isCustom));
	const customLegIntVendors = $derived(legIntVendors.filter((v) => v.isCustom));

	$effect(() => {
		purposeChecked = isEnabled;
	});

	// Handle purpose toggle - also toggles all consent-based vendors
	const handlePurposeToggle = function handlePurposeToggle(value: boolean) {
		onToggle(value);
		for (const vendor of consentVendors) {
			onVendorToggle(vendor.id, value);
		}
	};
</script>

<PreferenceItem.Root
	bind:open={isExpanded}
	class={noStyle ? '' : styles.purposeItem || ''}
	data-testid={testId ?? `purpose-item-${purpose.id}`}
	noStyle
>
	<div class={noStyle ? '' : styles.purposeHeader || ''}>
		<PreferenceItem.Trigger class={noStyle ? '' : styles.purposeTrigger || ''}>
			<PreferenceItem.Leading>
				<ChevronRightIcon
					class={noStyle ? '' : styles.purposeArrow || ''}
					expanded={isExpanded}
				/>
			</PreferenceItem.Leading>
			<PreferenceItem.Header class={noStyle ? '' : styles.purposeInfo || ''}>
				<PreferenceItem.Title class={noStyle ? '' : styles.purposeName || ''}>
					{purpose.name}
					{#if isLocked}
						<LockIcon class={noStyle ? '' : styles.lockIcon || ''} />
					{/if}
				</PreferenceItem.Title>
				<PreferenceItem.Meta class={noStyle ? '' : styles.purposeMeta || ''}>
					{iabT.preferenceCenter.purposeItem.partners.replace(
						'{count}',
						String(purpose.vendors.length)
					)}
				</PreferenceItem.Meta>
				{#if legIntVendors.length > 0}
					<PreferenceItem.Auxiliary
						class={noStyle ? '' : styles.legitimateInterestBadge || ''}
					>
						<LegitimateInterestIcon
							class={noStyle ? '' : styles.legitimateInterestIcon || ''}
						/>
						{iabT.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
							'{count}',
							String(legIntVendors.length)
						)}
					</PreferenceItem.Auxiliary>
				{/if}
			</PreferenceItem.Header>
		</PreferenceItem.Trigger>
		<PreferenceItem.Control>
			<Switch.Root
				aria-label={purpose.name}
				bind:checked={purposeChecked}
				onclick={() => handlePurposeToggle(purposeChecked)}
				disabled={isLocked}
				class={noStyle ? '' : sw.root}
				data-size="medium"
			>
				<Switch.Control class={noStyle ? '' : sw.track}>
					<Switch.Thumb class={noStyle ? '' : sw.thumb} />
				</Switch.Control>
			</Switch.Root>
		</PreferenceItem.Control>
	</div>

	<!-- The surface's padding goes on the inner element: the outer one is
	     the collapsing grid, and padding there keeps a closed item open by
	     its own padding's worth. -->
	<PreferenceItem.Content
		innerClassName={noStyle ? '' : styles.purposeContent || ''}
	>
		<p class={noStyle ? '' : styles.purposeDescription || ''}>
			{purpose.description}
		</p>

		<!-- Purpose-level Legitimate Interest Objection -->
		{#if legIntVendors.length > 0 && onPurposeLegitimateInterestToggle}
			<div class={noStyle ? '' : styles.purposeLiSection || ''}>
				<div class={noStyle ? '' : styles.purposeLiSectionHeader || ''}>
					<div class={noStyle ? '' : styles.purposeLiInfo || ''}>
						<LegitimateInterestIcon
							class={noStyle ? '' : styles.legitimateInterestIcon || ''}
						/>
						<span>
							{iabT.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
								'{count}',
								String(legIntVendors.length)
							)}
						</span>
					</div>
					<button
						type="button"
						onclick={handlePurposeLIObjection}
						class={noStyle
							? ''
							: `${styles.objectButton || ''} ${!isPurposeLIAllowed ? styles.objectButtonActive || '' : ''}`}
						aria-pressed={!isPurposeLIAllowed}
					>
						{isPurposeLIAllowed
							? iabT.preferenceCenter.purposeItem.objectButton
							: iabT.preferenceCenter.purposeItem.objected}
					</button>
				</div>
				<p class={noStyle ? '' : styles.liExplanation || ''}>
					{iabT.preferenceCenter.purposeItem.rightToObject}
				</p>
			</div>
		{/if}

		<!-- Legacy badge when no toggle handler -->
		{#if legIntVendors.length > 0 && !onPurposeLegitimateInterestToggle}
			<div class={noStyle ? '' : styles.legitimateInterestBadge || ''}>
				<LegitimateInterestIcon
					class={noStyle ? '' : styles.legitimateInterestIcon || ''}
				/>
				{iabT.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
					'{count}',
					String(legIntVendors.length)
				)}
			</div>
		{/if}

		<!-- Illustrations / Examples -->
		{#if purpose.illustrations && purpose.illustrations.length > 0}
			<div>
				<PreferenceItem.Root
					bind:open={showExamples}
					noStyle
				>
					<PreferenceItem.Trigger
						class={noStyle ? '' : styles.examplesToggle || ''}
					>
						<ChevronRightIcon
							style="height:0.75rem;width:0.75rem"
							expanded={showExamples}
						/>
						{iabT.preferenceCenter.purposeItem.examples}
						({purpose.illustrations.length})
					</PreferenceItem.Trigger>
					<PreferenceItem.Content>
						<ul class={noStyle ? '' : styles.examplesList || ''}>
							{#each purpose.illustrations as illustration (illustration)}
								<li>{illustration}</li>
							{/each}
						</ul>
					</PreferenceItem.Content>
				</PreferenceItem.Root>
			</div>
		{/if}

		<!-- Vendor list within purpose -->
		<div>
			<PreferenceItem.Root
				bind:open={showVendors}
				noStyle
			>
				<PreferenceItem.Trigger
					class={noStyle ? '' : styles.vendorsToggle || ''}
				>
					<ChevronRightIcon
						style="height:0.75rem;width:0.75rem"
						expanded={showVendors}
					/>
					{iabT.preferenceCenter.purposeItem.partnersUsingPurpose}
					({purpose.vendors.length})
				</PreferenceItem.Trigger>
				<PreferenceItem.Content
					innerClassName={noStyle ? '' : styles.vendorSection || ''}
				>
					<!-- IAB Consent Vendors -->
					{#if iabConsentVendors.length > 0}
						<h5 class={noStyle ? '' : styles.vendorSectionTitle || ''}>
							{iabT.preferenceCenter.purposeItem.withYourPermission}
							({iabConsentVendors.length})
						</h5>
						{#each iabConsentVendors as vendor (vendor.id)}
							{@const isConsented = getVendorConsent(vendor.id)}
							<div class={noStyle ? '' : styles.vendorRow || ''}>
								<div class={noStyle ? '' : styles.vendorInfo || ''}>
									<button
										type="button"
										onclick={() => onVendorClick(vendor.id)}
										class={noStyle ? '' : styles.vendorName || ''}
									>
										<span>{vendor.name}</span>
									</button>
									<div class={noStyle ? '' : styles.vendorDetails || ''}>
										{#if vendor.usesCookies}
											<span class={noStyle ? '' : styles.vendorDetail || ''}>
												{iabT.preferenceCenter.vendorList.usesCookies}
											</span>
										{/if}
										{#if vendor.usesNonCookieAccess}
											<span class={noStyle ? '' : styles.vendorDetail || ''}>
												{iabT.preferenceCenter.vendorList.nonCookieAccess}
											</span>
										{/if}
									</div>
								</div>
								<Switch.Root
									aria-label={vendor.name}
									checked={isConsented}
									onclick={() => onVendorToggle(vendor.id, !isConsented)}
									class={noStyle ? '' : sw.root}
									data-size="small"
								>
									<Switch.Control class={noStyle ? '' : sw.track}>
										<Switch.Thumb class={noStyle ? '' : sw.thumb} />
									</Switch.Control>
								</Switch.Root>
							</div>
						{/each}
					{/if}

					<!-- IAB Legitimate Interest Vendors -->
					{#if iabLegIntVendors.length > 0}
						<h5
							class={noStyle
								? ''
								: `${styles.vendorSectionTitle || ''} ${styles.vendorSectionTitleLi || ''}`}
						>
							<LegitimateInterestIcon
								class={noStyle ? '' : styles.legitimateInterestIcon || ''}
							/>
							{iabT.preferenceCenter.purposeItem.legitimateInterest}
							({iabLegIntVendors.length})
						</h5>
						<p class={noStyle ? '' : styles.liExplanation || ''}>
							{iabT.preferenceCenter.purposeItem.rightToObject}
						</p>
						{#each iabLegIntVendors as vendor (vendor.id)}
							{@const isConsented = getVendorConsent(vendor.id)}
							{@const isLIAllowed = getVendorLegitimateInterest(vendor.id)}
							{@const showLIControl = !!onVendorLegitimateInterestToggle}
							<div
								class={noStyle
									? ''
									: `${styles.vendorRow || ''} ${styles.vendorRowLi || ''}`}
							>
								<div class={noStyle ? '' : styles.vendorInfo || ''}>
									<button
										type="button"
										onclick={() => onVendorClick(vendor.id)}
										class={noStyle ? '' : styles.vendorName || ''}
									>
										<span>{vendor.name}</span>
									</button>
									<div class={noStyle ? '' : styles.vendorDetails || ''}>
										<span
											class={noStyle
												? ''
												: `${styles.vendorDetail || ''} ${styles.vendorDetailLi || ''}`}
										>
											{iabT.preferenceCenter.purposeItem.legitimateInterest}
										</span>
										{#if vendor.usesCookies}
											<span class={noStyle ? '' : styles.vendorDetail || ''}>
												{iabT.preferenceCenter.vendorList.usesCookies}
											</span>
										{/if}
									</div>
								</div>
								{#if showLIControl}
									<button
										type="button"
										onclick={() =>
											onVendorLegitimateInterestToggle?.(
												vendor.id,
												!isLIAllowed
											)}
										class={noStyle
											? ''
											: `${styles.objectButton || ''} ${!isLIAllowed ? styles.objectButtonActive || '' : ''}`}
										aria-pressed={!isLIAllowed}
									>
										{isLIAllowed
											? iabT.preferenceCenter.purposeItem.objectButton
											: iabT.preferenceCenter.purposeItem.objected}
									</button>
								{:else}
									<Switch.Root
										aria-label={vendor.name}
										checked={isConsented}
										onclick={() => onVendorToggle(vendor.id, !isConsented)}
										class={noStyle ? '' : sw.root}
										data-size="small"
									>
										<Switch.Control class={noStyle ? '' : sw.track}>
											<Switch.Thumb class={noStyle ? '' : sw.thumb} />
										</Switch.Control>
									</Switch.Root>
								{/if}
							</div>
						{/each}
					{/if}

					<!-- Custom Vendors -->
					{#if customConsentVendors.length > 0 || customLegIntVendors.length > 0}
						<div class={noStyle ? '' : styles.customVendorPurposeSection || ''}>
							<h5 class={noStyle ? '' : styles.vendorSectionTitleCustom || ''}>
								<GlobeIcon
									class={noStyle ? '' : styles.legitimateInterestIcon || ''}
								/>
								{iabT.preferenceCenter.vendorList.customVendorsHeading}
								({customConsentVendors.length + customLegIntVendors.length})
							</h5>
							{#each customConsentVendors as vendor (vendor.id)}
								{@const isConsented = getVendorConsent(vendor.id)}
								<div class={noStyle ? '' : styles.vendorRow || ''}>
									<div class={noStyle ? '' : styles.vendorInfo || ''}>
										<button
											type="button"
											onclick={() => onVendorClick(vendor.id)}
											class={noStyle ? '' : styles.vendorName || ''}
										>
											<span>{vendor.name}</span>
											<GlobeIcon
												class={noStyle ? '' : styles.customVendorIcon || ''}
												aria-label={iabT.common.customPartner}
											/>
										</button>
									</div>
									<Switch.Root
										aria-label={vendor.name}
										checked={isConsented}
										onclick={() => onVendorToggle(vendor.id, !isConsented)}
										class={noStyle ? '' : sw.root}
										data-size="small"
									>
										<Switch.Control class={noStyle ? '' : sw.track}>
											<Switch.Thumb class={noStyle ? '' : sw.thumb} />
										</Switch.Control>
									</Switch.Root>
								</div>
							{/each}
							{#each customLegIntVendors as vendor (vendor.id)}
								{@const isConsented = getVendorConsent(vendor.id)}
								{@const isLIAllowed = getVendorLegitimateInterest(vendor.id)}
								{@const showLIControl = !!onVendorLegitimateInterestToggle}
								<div
									class={noStyle
										? ''
										: `${styles.vendorRow || ''} ${styles.vendorRowLi || ''}`}
								>
									<div class={noStyle ? '' : styles.vendorInfo || ''}>
										<button
											type="button"
											onclick={() => onVendorClick(vendor.id)}
											class={noStyle ? '' : styles.vendorName || ''}
										>
											<span>{vendor.name}</span>
											<GlobeIcon
												class={noStyle ? '' : styles.customVendorIcon || ''}
												aria-label={iabT.common.customPartner}
											/>
										</button>
									</div>
									{#if showLIControl}
										<button
											type="button"
											onclick={() =>
												onVendorLegitimateInterestToggle?.(
													vendor.id,
													!isLIAllowed
												)}
											class={noStyle
												? ''
												: `${styles.objectButton || ''} ${!isLIAllowed ? styles.objectButtonActive || '' : ''}`}
											aria-pressed={!isLIAllowed}
										>
											{isLIAllowed
												? iabT.preferenceCenter.purposeItem.objectButton
												: iabT.preferenceCenter.purposeItem.objected}
										</button>
									{:else}
										<Switch.Root
											aria-label={vendor.name}
											checked={isConsented}
											onclick={() => onVendorToggle(vendor.id, !isConsented)}
											class={noStyle ? '' : sw.root}
											data-size="small"
										>
											<Switch.Control class={noStyle ? '' : sw.track}>
												<Switch.Thumb class={noStyle ? '' : sw.thumb} />
											</Switch.Control>
										</Switch.Root>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</PreferenceItem.Content>
			</PreferenceItem.Root>
		</div>
	</PreferenceItem.Content>
</PreferenceItem.Root>
