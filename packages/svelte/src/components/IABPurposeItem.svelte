<script lang="ts">
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import { Switch } from '@ark-ui/svelte/switch';
	import { switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
	import type { ProcessedPurpose, VendorId } from '../iab-types';
	import type { IABTranslations } from '../iab-translations';

	const sw = switchVariants();
	const swSmall = switchVariants({ size: 'small' });

	let {
		purpose,
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

	const legIntVendors = $derived(
		purpose.vendors.filter((v) => v.usesLegitimateInterest)
	);
	const consentVendors = $derived(
		purpose.vendors.filter((v) => !v.usesLegitimateInterest)
	);

	function getVendorConsent(vendorId: VendorId): boolean {
		return vendorConsents[String(vendorId)] ?? false;
	}

	function getVendorLegitimateInterest(vendorId: VendorId): boolean {
		return vendorLegitimateInterests[String(vendorId)] ?? true;
	}

	// Check if purpose-level LI is allowed (not objected)
	const isPurposeLIAllowed = $derived(
		purposeLegitimateInterests[purpose.id] ?? true
	);

	// Handler for purpose-level LI objection
	function handlePurposeLIObjection() {
		const newValue = !isPurposeLIAllowed;
		onPurposeLegitimateInterestToggle?.(purpose.id, newValue);
		if (onVendorLegitimateInterestToggle) {
			for (const vendor of legIntVendors) {
				onVendorLegitimateInterestToggle(vendor.id, newValue);
			}
		}
	}

	// Separate IAB and custom vendors
	const iabConsentVendors = $derived(
		consentVendors.filter((v) => !v.isCustom)
	);
	const customConsentVendors = $derived(
		consentVendors.filter((v) => v.isCustom)
	);
	const iabLegIntVendors = $derived(
		legIntVendors.filter((v) => !v.isCustom)
	);
	const customLegIntVendors = $derived(
		legIntVendors.filter((v) => v.isCustom)
	);

	// Handle purpose toggle - also toggles all consent-based vendors
	function handlePurposeToggle(value: boolean) {
		onToggle(value);
		for (const vendor of consentVendors) {
			onVendorToggle(vendor.id, value);
		}
	}
</script>

<Collapsible.Root
	bind:open={isExpanded}
	class={noStyle ? '' : styles.purposeItem || ''}
	data-testid={`purpose-item-${purpose.id}`}
>
	<div class={noStyle ? '' : styles.purposeHeader || ''}>
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
				<h3 class={noStyle ? '' : styles.purposeName || ''}>
					{purpose.name}
					{#if isLocked}
						<svg
							class={noStyle ? '' : styles.lockIcon || ''}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					{/if}
				</h3>
				<p class={noStyle ? '' : styles.purposeMeta || ''}>
					{iabT.preferenceCenter.purposeItem.partners.replace(
						'{count}',
						String(purpose.vendors.length)
					)}
				</p>
				{#if legIntVendors.length > 0}
					<div class={noStyle ? '' : styles.legitimateInterestBadge || ''}>
						<svg
							class={noStyle ? '' : styles.legitimateInterestIcon || ''}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
							/>
						</svg>
						{iabT.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
							'{count}',
							String(legIntVendors.length)
						)}
					</div>
				{/if}
			</div>
		</Collapsible.Trigger>
		<Switch.Root
			checked={isEnabled}
			onCheckedChange={(details) => handlePurposeToggle(details.checked)}
			disabled={isLocked}
			class={noStyle ? '' : sw.root()}
		>
			<Switch.Control class={noStyle ? '' : sw.track({ disabled: isLocked })}>
				<Switch.Thumb class={noStyle ? '' : sw.thumb({ disabled: isLocked })} />
			</Switch.Control>
			<Switch.HiddenInput />
		</Switch.Root>
	</div>

	<Collapsible.Content class={noStyle ? '' : styles.purposeContent || ''}>
		<p class={noStyle ? '' : styles.purposeDescription || ''}>
			{purpose.description}
		</p>

		<!-- Purpose-level Legitimate Interest Objection -->
		{#if legIntVendors.length > 0 && onPurposeLegitimateInterestToggle}
			<div class={noStyle ? '' : styles.purposeLISection || ''}>
				<div class={noStyle ? '' : styles.purposeLISectionHeader || ''}>
					<div class={noStyle ? '' : styles.purposeLIInfo || ''}>
						<svg
							class={noStyle ? '' : styles.legitimateInterestIcon || ''}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
							/>
						</svg>
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
				<svg
					class={noStyle ? '' : styles.legitimateInterestIcon || ''}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
					/>
				</svg>
				{iabT.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
					'{count}',
					String(legIntVendors.length)
				)}
			</div>
		{/if}

		<!-- Illustrations / Examples -->
		{#if purpose.illustrations && purpose.illustrations.length > 0}
			<Collapsible.Root bind:open={showExamples}>
				<Collapsible.Trigger
					class={noStyle ? '' : styles.examplesToggle || ''}
				>
					<Collapsible.Indicator>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M9 5l7 7-7 7" />
						</svg>
					</Collapsible.Indicator>
					{iabT.preferenceCenter.purposeItem.examples} ({purpose
						.illustrations.length})
				</Collapsible.Trigger>
				<Collapsible.Content>
					<ul class={noStyle ? '' : styles.examplesList || ''}>
						{#each purpose.illustrations as illustration}
							<li>{illustration}</li>
						{/each}
					</ul>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}

		<!-- Vendor list within purpose -->
		<Collapsible.Root bind:open={showVendors}>
			<Collapsible.Trigger
				class={noStyle ? '' : styles.vendorsToggle || ''}
			>
				<Collapsible.Indicator>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 5l7 7-7 7" />
					</svg>
				</Collapsible.Indicator>
				{iabT.preferenceCenter.purposeItem.partnersUsingPurpose} ({purpose
					.vendors.length})
			</Collapsible.Trigger>
			<Collapsible.Content>
				<div class={noStyle ? '' : styles.vendorSection || ''}>
					<!-- IAB Consent Vendors -->
					{#if iabConsentVendors.length > 0}
						<h5 class={noStyle ? '' : styles.vendorSectionTitle || ''}>
							{iabT.preferenceCenter.purposeItem.withYourPermission} ({iabConsentVendors.length})
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
									checked={isConsented}
									onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
									class={noStyle ? '' : swSmall.root()}
								>
									<Switch.Control class={noStyle ? '' : swSmall.track()}>
										<Switch.Thumb class={noStyle ? '' : swSmall.thumb()} />
									</Switch.Control>
									<Switch.HiddenInput />
								</Switch.Root>
							</div>
						{/each}
					{/if}

					<!-- IAB Legitimate Interest Vendors -->
					{#if iabLegIntVendors.length > 0}
						<h5
							class={noStyle
								? ''
								: `${styles.vendorSectionTitle || ''} ${styles.vendorSectionTitleLI || ''}`}
						>
							<svg
								class={noStyle ? '' : styles.legitimateInterestIcon || ''}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
								/>
							</svg>
							{iabT.preferenceCenter.purposeItem.legitimateInterest} ({iabLegIntVendors.length})
						</h5>
						<p class={noStyle ? '' : styles.liExplanation || ''}>
							{iabT.preferenceCenter.purposeItem.rightToObject}
						</p>
						{#each iabLegIntVendors as vendor (vendor.id)}
							{@const isConsented = getVendorConsent(vendor.id)}
							{@const isLIAllowed = getVendorLegitimateInterest(vendor.id)}
							{@const showLIControl =
								!!onVendorLegitimateInterestToggle}
							<div
								class={noStyle
									? ''
									: `${styles.vendorRow || ''} ${styles.vendorRowLI || ''}`}
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
												: `${styles.vendorDetail || ''} ${styles.vendorDetailLI || ''}`}
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
										checked={isConsented}
										onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
										class={noStyle ? '' : swSmall.root()}
									>
										<Switch.Control class={noStyle ? '' : swSmall.track()}>
											<Switch.Thumb class={noStyle ? '' : swSmall.thumb()} />
										</Switch.Control>
										<Switch.HiddenInput />
									</Switch.Root>
								{/if}
							</div>
						{/each}
					{/if}

					<!-- Custom Vendors -->
					{#if customConsentVendors.length > 0 || customLegIntVendors.length > 0}
						<div
							class={noStyle
								? ''
								: styles.customVendorPurposeSection || ''}
						>
							<h5
								class={noStyle
									? ''
									: styles.vendorSectionTitleCustom || ''}
							>
								<svg
									class={noStyle ? '' : styles.legitimateInterestIcon || ''}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="2" y1="12" x2="22" y2="12" />
									<path
										d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
									/>
								</svg>
								{iabT.preferenceCenter.vendorList.customVendorsHeading} ({customConsentVendors.length +
									customLegIntVendors.length})
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
											<svg
												class={noStyle
													? ''
													: styles.customVendorIcon || ''}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												aria-label={iabT.common.customPartner}
											>
												<circle cx="12" cy="12" r="10" />
												<line x1="2" y1="12" x2="22" y2="12" />
												<path
													d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
												/>
											</svg>
										</button>
									</div>
									<Switch.Root
										checked={isConsented}
										onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
										class={noStyle ? '' : swSmall.root()}
									>
										<Switch.Control class={noStyle ? '' : swSmall.track()}>
											<Switch.Thumb class={noStyle ? '' : swSmall.thumb()} />
										</Switch.Control>
										<Switch.HiddenInput />
									</Switch.Root>
								</div>
							{/each}
							{#each customLegIntVendors as vendor (vendor.id)}
								{@const isConsented = getVendorConsent(vendor.id)}
								{@const isLIAllowed = getVendorLegitimateInterest(
									vendor.id
								)}
								{@const showLIControl =
									!!onVendorLegitimateInterestToggle}
								<div
									class={noStyle
										? ''
										: `${styles.vendorRow || ''} ${styles.vendorRowLI || ''}`}
								>
									<div class={noStyle ? '' : styles.vendorInfo || ''}>
										<button
											type="button"
											onclick={() => onVendorClick(vendor.id)}
											class={noStyle ? '' : styles.vendorName || ''}
										>
											<span>{vendor.name}</span>
											<svg
												class={noStyle
													? ''
													: styles.customVendorIcon || ''}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												aria-label={iabT.common.customPartner}
											>
												<circle cx="12" cy="12" r="10" />
												<line x1="2" y1="12" x2="22" y2="12" />
												<path
													d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
												/>
											</svg>
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
											checked={isConsented}
											onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
											class={noStyle ? '' : swSmall.root()}
										>
											<Switch.Control class={noStyle ? '' : swSmall.track()}>
												<Switch.Thumb
													class={noStyle ? '' : swSmall.thumb()}
												/>
											</Switch.Control>
											<Switch.HiddenInput />
										</Switch.Root>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	</Collapsible.Content>
</Collapsible.Root>
