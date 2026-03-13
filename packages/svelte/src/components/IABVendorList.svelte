<script lang="ts">
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import { Switch } from '@ark-ui/svelte/switch';
	import { switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
	import type { GlobalVendorList } from 'c15t';
	import type {
		ProcessedPurpose,
		ProcessedVendor,
		VendorId,
		NonIABVendor,
	} from '../iab-types';
	import type { IABTranslations } from '../iab-translations';

	const sw = switchVariants();

	let {
		vendorData,
		purposes,
		vendorConsents,
		onVendorToggle,
		selectedVendorId,
		onClearSelection,
		customVendors = [],
		vendorLegitimateInterests = {},
		onVendorLegitimateInterestToggle,
		noStyle = false,
		iabT,
	}: {
		vendorData: GlobalVendorList | null;
		purposes: ProcessedPurpose[];
		vendorConsents: Record<string, boolean>;
		onVendorToggle: (vendorId: VendorId, value: boolean) => void;
		selectedVendorId: VendorId | null;
		onClearSelection: () => void;
		customVendors?: NonIABVendor[];
		vendorLegitimateInterests?: Record<string, boolean>;
		onVendorLegitimateInterestToggle?: (
			vendorId: VendorId,
			value: boolean
		) => void;
		noStyle?: boolean;
		iabT: IABTranslations;
	} = $props();

	let searchTerm = $state('');
	let expandedVendors = $state(new Set<VendorId>());

	// Map IAB vendors
	const iabVendors = $derived.by((): ProcessedVendor[] => {
		if (!vendorData) return [];
		return Object.entries(vendorData.vendors).map(([id, vendor]) => ({
			id: Number(id),
			name: vendor.name,
			policyUrl:
				(vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
			usesNonCookieAccess: vendor.usesNonCookieAccess,
			deviceStorageDisclosureUrl:
				vendor.deviceStorageDisclosureUrl ?? null,
			usesCookies: vendor.usesCookies,
			cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
			cookieRefresh: vendor.cookieRefresh,
			specialPurposes: vendor.specialPurposes || [],
			specialFeatures: vendor.specialFeatures || [],
			features: vendor.features || [],
			purposes: vendor.purposes || [],
			legIntPurposes: vendor.legIntPurposes || [],
			isCustom: false,
			legitimateInterestUrl:
				vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
			dataRetention: vendor.dataRetention,
			dataDeclaration:
				(vendor as unknown as { dataDeclaration?: number[] })
					.dataDeclaration || [],
		}));
	});

	// Map custom vendors
	const mappedCustomVendors = $derived.by((): ProcessedVendor[] =>
		customVendors.map((cv) => ({
			id: cv.id,
			name: cv.name,
			policyUrl: cv.privacyPolicyUrl,
			usesNonCookieAccess: cv.usesNonCookieAccess ?? false,
			deviceStorageDisclosureUrl: null,
			usesCookies: cv.usesCookies ?? false,
			cookieMaxAgeSeconds: cv.cookieMaxAgeSeconds ?? null,
			cookieRefresh: undefined,
			specialPurposes: [],
			specialFeatures: cv.specialFeatures || [],
			features: cv.features || [],
			purposes: cv.purposes || [],
			legIntPurposes: cv.legIntPurposes || [],
			isCustom: true,
			legitimateInterestUrl: null,
			dataRetention: undefined,
			dataDeclaration: cv.dataCategories || [],
		}))
	);

	// Combine and sort all vendors
	const vendors = $derived(
		[...iabVendors, ...mappedCustomVendors].sort((a, b) =>
			a.name.localeCompare(b.name)
		)
	);

	// Scroll to selected vendor
	$effect(() => {
		if (selectedVendorId !== null) {
			expandedVendors = new Set(expandedVendors).add(selectedVendorId);
			setTimeout(() => {
				const element = document.getElementById(
					`vendor-${String(selectedVendorId)}`
				);
				element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
		}
	});

	const filteredVendors = $derived.by(() => {
		if (selectedVendorId !== null) {
			return vendors.filter(
				(v) => String(v.id) === String(selectedVendorId)
			);
		}
		return vendors.filter((vendor) =>
			vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	const filteredIABVendors = $derived(
		filteredVendors.filter((v) => !v.isCustom)
	);
	const filteredCustomVendors = $derived(
		filteredVendors.filter((v) => v.isCustom)
	);

	function handleVendorOpenChange(vendorId: VendorId, open: boolean) {
		const newSet = new Set(expandedVendors);
		if (open) {
			newSet.add(vendorId);
		} else {
			newSet.delete(vendorId);
		}
		expandedVendors = newSet;
	}

	function getVendorPurposes(vendorId: VendorId) {
		const vendor = vendors.find(
			(v) => String(v.id) === String(vendorId)
		);
		if (!vendor) return [];

		return purposes
			.filter((purpose) =>
				purpose.vendors.some(
					(v) => String(v.id) === String(vendorId)
				)
			)
			.map((purpose) => ({
				...purpose,
				usesLegitimateInterest: vendor.legIntPurposes.includes(
					purpose.id
				),
			}));
	}

	function getVendorSpecialPurposes(vendorId: VendorId) {
		const vendor = vendors.find(
			(v) => String(v.id) === String(vendorId)
		);
		if (!vendor || !vendorData) return [];

		return vendor.specialPurposes
			.map((id) => vendorData.specialPurposes[id])
			.filter((sp): sp is NonNullable<typeof sp> => sp != null)
			.map((sp) => ({ id: sp.id, name: sp.name, description: sp.description }));
	}

	function getVendorSpecialFeatures(vendorId: VendorId) {
		const vendor = vendors.find(
			(v) => String(v.id) === String(vendorId)
		);
		if (!vendor || !vendorData) return [];

		return vendor.specialFeatures
			.map((id) => vendorData.specialFeatures[id])
			.filter((sf): sf is NonNullable<typeof sf> => sf != null)
			.map((sf) => ({ id: sf.id, name: sf.name, description: sf.description }));
	}

	function getVendorFeatures(vendorId: VendorId) {
		const vendor = vendors.find(
			(v) => String(v.id) === String(vendorId)
		);
		if (!vendor || !vendorData) return [];

		return (vendor.features || [])
			.map((id) => vendorData.features[id])
			.filter((f): f is NonNullable<typeof f> => f != null)
			.map((f) => ({ id: f.id, name: f.name, description: f.description }));
	}

	function getMaxAgeText(vendor: ProcessedVendor): string | null {
		if (!vendor.cookieMaxAgeSeconds) return null;
		let text = iabT.preferenceCenter.vendorList.maxAge.replace(
			'{days}',
			String(Math.floor(vendor.cookieMaxAgeSeconds / 86400))
		);
		if (vendor.cookieRefresh) {
			text = `${text} (refreshes)`;
		}
		return text;
	}
</script>

<div>
	{#if selectedVendorId !== null}
		<div class={noStyle ? '' : styles.selectedVendorBanner || ''}>
			<p class={noStyle ? '' : styles.selectedVendorText || ''}>
				{iabT.common.showingSelectedVendor}
			</p>
			<button
				type="button"
				onclick={onClearSelection}
				class={noStyle ? '' : styles.clearSelectionButton || ''}
			>
				<svg
					class={noStyle ? '' : styles.clearIcon || ''}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
				{iabT.common.clearSelection}
			</button>
		</div>
	{:else}
		<div class={noStyle ? '' : styles.vendorListHeader || ''}>
			<div class={noStyle ? '' : styles.searchContainer || ''}>
				<svg
					class={noStyle ? '' : styles.searchIcon || ''}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					placeholder={iabT.preferenceCenter.vendorList.search}
					bind:value={searchTerm}
					class={noStyle ? '' : styles.searchInput || ''}
				/>
			</div>
			<p class={noStyle ? '' : styles.vendorCount || ''}>
				{iabT.preferenceCenter.vendorList.showingCount
					.replace('{filtered}', String(filteredVendors.length))
					.replace('{total}', String(vendors.length))}
			</p>
		</div>
	{/if}

	<!-- IAB Registered Vendors -->
	{#if filteredIABVendors.length > 0}
		<div class={noStyle ? '' : styles.vendorSection || ''}>
			<div class={noStyle ? '' : styles.iabVendorSectionHeader || ''}>
				<h3 class={noStyle ? '' : styles.vendorSectionHeading || ''}>
					<svg
						class={noStyle ? '' : styles.vendorSectionIcon || ''}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M12 2L2 7l10 5 10-5-10-5z" />
						<path d="M2 17l10 5 10-5" />
						<path d="M2 12l10 5 10-5" />
					</svg>
					{iabT.preferenceCenter.vendorList.iabVendorsHeading} ({filteredIABVendors.length})
				</h3>
				<p class={noStyle ? '' : styles.iabVendorNotice || ''}>
					{iabT.preferenceCenter.vendorList.iabVendorsNotice}
				</p>
			</div>
			<div>
				{#each filteredIABVendors as vendor (vendor.id)}
					{@const vendorKey = String(vendor.id)}
					{@const vendorPurposes = getVendorPurposes(vendor.id)}
					{@const vendorSpecialPurposes = getVendorSpecialPurposes(vendor.id)}
					{@const vendorSpecialFeatures = getVendorSpecialFeatures(vendor.id)}
					{@const vendorFeatures = getVendorFeatures(vendor.id)}
					{@const legIntCount = vendorPurposes.filter((p) => p.usesLegitimateInterest).length}
					{@const hasLegitimateInterest = vendor.legIntPurposes.length > 0}
					{@const isLegitimateInterestAllowed = vendorLegitimateInterests[vendorKey] ?? true}
					{@const standardRetentionDays = vendor.dataRetention?.stdRetention}
					{@const maxAgeText = getMaxAgeText(vendor)}

					<Collapsible.Root
						open={expandedVendors.has(vendor.id)}
						onOpenChange={(details) => handleVendorOpenChange(vendor.id, details.open)}
						id={`vendor-${vendorKey}`}
						class={noStyle
							? ''
							: `${styles.vendorListItem || ''} ${vendor.isCustom ? styles.customVendorItem || '' : ''}`}
					>
						<div class={noStyle ? '' : styles.vendorListItemHeader || ''}>
							<Collapsible.Trigger
								class={noStyle ? '' : styles.vendorListTrigger || ''}
							>
								<div class={noStyle ? '' : styles.vendorListInfo || ''}>
									<h3 class={noStyle ? '' : styles.vendorListName || ''}>
										{vendor.name}
									</h3>
									<div class={noStyle ? '' : styles.vendorListMeta || ''}>
										<span class={noStyle ? '' : styles.vendorListMetaText || ''}>
											{vendorPurposes.length} purpose{vendorPurposes.length !== 1 ? 's' : ''}
											{#if vendorSpecialPurposes.length > 0}, {vendorSpecialPurposes.length} special{/if}
											{#if vendorSpecialFeatures.length > 0}, {vendorSpecialFeatures.length} feature{vendorSpecialFeatures.length !== 1 ? 's' : ''}{/if}
										</span>
										{#if legIntCount > 0}
											<span class={noStyle ? '' : styles.vendorListLIBadge || ''}>
												<svg
													width="10"
													height="10"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
												</svg>
												{legIntCount} {iabT.preferenceCenter.vendorList.legitimateInterest}
											</span>
										{/if}
									</div>
								</div>
								<Collapsible.Indicator class={noStyle ? '' : styles.purposeArrow || ''}>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M19 9l-7 7-7-7" />
									</svg>
								</Collapsible.Indicator>
							</Collapsible.Trigger>
							<Switch.Root
								checked={vendorConsents[vendorKey] ?? false}
								onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
								class={noStyle ? '' : sw.root()}
							>
								<Switch.Control class={noStyle ? '' : sw.track()}>
									<Switch.Thumb class={noStyle ? '' : sw.thumb()} />
								</Switch.Control>
								<Switch.HiddenInput />
							</Switch.Root>
						</div>

						<Collapsible.Content class={noStyle ? '' : styles.vendorListContent || ''}>
							<!-- Links -->
							<div class={noStyle ? '' : styles.vendorLinks || ''}>
								<a
									href={vendor.policyUrl}
									target="_blank"
									rel="noopener noreferrer"
									class={noStyle ? '' : styles.vendorLink || ''}
								>
									<svg class={noStyle ? '' : styles.vendorLinkIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
										<polyline points="15 3 21 3 21 9" />
										<line x1="10" y1="14" x2="21" y2="3" />
									</svg>
									{iabT.preferenceCenter.vendorList.privacyPolicy}
								</a>
								{#if vendor.legitimateInterestUrl}
									<a
										href={vendor.legitimateInterestUrl}
										target="_blank"
										rel="noopener noreferrer"
										class={noStyle ? '' : styles.vendorLink || ''}
									>
										<svg class={noStyle ? '' : styles.vendorLinkIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
										{iabT.preferenceCenter.purposeItem.legitimateInterest}
									</a>
								{/if}
								{#if vendor.deviceStorageDisclosureUrl}
									<a
										href={vendor.deviceStorageDisclosureUrl}
										target="_blank"
										rel="noopener noreferrer"
										class={noStyle ? '' : styles.vendorLink || ''}
									>
										<svg class={noStyle ? '' : styles.vendorLinkIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
										{iabT.preferenceCenter.vendorList.storageDisclosure}
									</a>
								{/if}
							</div>

							<!-- Badges -->
							<div class={noStyle ? '' : styles.vendorBadges || ''}>
								{#if vendor.usesCookies}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>
										{iabT.preferenceCenter.vendorList.usesCookies}
									</span>
								{/if}
								{#if vendor.usesNonCookieAccess}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>
										{iabT.preferenceCenter.vendorList.nonCookieAccess}
									</span>
								{/if}
								{#if maxAgeText}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>
										{maxAgeText}
									</span>
								{/if}
								{#if standardRetentionDays}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>
										{iabT.preferenceCenter.vendorList.retention.replace('{days}', String(standardRetentionDays))}
									</span>
								{/if}
							</div>

							<!-- Purposes -->
							{#if vendorPurposes.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.purposes} ({vendorPurposes.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorPurposes as purpose (purpose.id)}
											{@const retentionDays = vendor.dataRetention?.purposes?.[purpose.id] ?? vendor.dataRetention?.stdRetention}
											<li class={noStyle ? '' : `${styles.vendorPurposeItem || ''} ${purpose.usesLegitimateInterest ? styles.vendorPurposeItemLI || '' : ''}`}>
												<span>
													{purpose.name}
													{#if retentionDays}
														<span class={noStyle ? '' : styles.vendorRetention || ''}>
															(Retained: {retentionDays}d)
														</span>
													{/if}
												</span>
												{#if purpose.usesLegitimateInterest}
													<span class={noStyle ? '' : styles.vendorListLIBadge || ''}>
														<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
															<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
														</svg>
														{iabT.preferenceCenter.vendorList.legitimateInterest}
													</span>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Legitimate Interest Objection -->
							{#if hasLegitimateInterest && onVendorLegitimateInterestToggle}
								<div class={noStyle ? '' : styles.vendorLISection || ''}>
									<div class={noStyle ? '' : styles.vendorLISectionHeader || ''}>
										<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
											<svg class={noStyle ? '' : styles.legitimateInterestIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
											</svg>
											{iabT.preferenceCenter.purposeItem.legitimateInterest}
										</h4>
										<button
											type="button"
											onclick={() => onVendorLegitimateInterestToggle?.(vendor.id, !isLegitimateInterestAllowed)}
											class={noStyle ? '' : `${styles.objectButton || ''} ${!isLegitimateInterestAllowed ? styles.objectButtonActive || '' : ''}`}
											aria-pressed={!isLegitimateInterestAllowed}
										>
											{isLegitimateInterestAllowed
												? iabT.preferenceCenter.purposeItem.objectButton
												: iabT.preferenceCenter.purposeItem.objected}
										</button>
									</div>
									<p class={noStyle ? '' : styles.liExplanation || ''}>
										{iabT.preferenceCenter.purposeItem.rightToObject}
									</p>
								</div>
							{/if}

							<!-- Data Categories -->
							{#if vendor.dataDeclaration && vendor.dataDeclaration.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.dataCategories} ({vendor.dataDeclaration.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendor.dataDeclaration as categoryId}
											{@const category = vendorData?.dataCategories?.[categoryId]}
											<li
												class={noStyle ? '' : styles.vendorPurposeItem || ''}
												title={category?.description}
											>
												{category?.name || `Data Category ${categoryId}`}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Special Purposes -->
							{#if vendorSpecialPurposes.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										<svg
											aria-label={iabT.preferenceCenter.vendorList.specialPurposes}
											role="img"
											class={noStyle ? '' : styles.legitimateInterestIcon || ''}
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<title>{iabT.preferenceCenter.vendorList.specialPurposes}</title>
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
											<path d="M7 11V7a5 5 0 0 1 10 0v4" />
										</svg>
										{iabT.preferenceCenter.vendorList.specialPurposes} ({vendorSpecialPurposes.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorSpecialPurposes as sp (sp.id)}
											{@const retentionDays = vendor.dataRetention?.specialPurposes?.[sp.id] ?? vendor.dataRetention?.stdRetention}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>
												<span>
													{sp.name}
													{#if retentionDays}
														<span class={noStyle ? '' : styles.vendorRetention || ''}>
															(Retained: {retentionDays}d)
														</span>
													{/if}
												</span>
											</li>
										{/each}
									</ul>
									<p class={noStyle ? '' : styles.liExplanation || ''}>
										{iabT.preferenceCenter.vendorList.requiredNotice}
									</p>
								</div>
							{/if}

							<!-- Special Features -->
							{#if vendorSpecialFeatures.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.specialFeatures} ({vendorSpecialFeatures.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorSpecialFeatures as sf (sf.id)}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>
												{sf.name}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Features -->
							{#if vendorFeatures.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.features} ({vendorFeatures.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorFeatures as f (f.id)}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>
												{f.name}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Custom/Non-IAB Vendors -->
	{#if filteredCustomVendors.length > 0}
		<div class={noStyle ? '' : styles.vendorSection || ''}>
			<div class={noStyle ? '' : styles.customVendorSectionHeader || ''}>
				<h3 class={noStyle ? '' : styles.vendorSectionHeading || ''}>
					<svg
						class={noStyle ? '' : styles.vendorSectionIcon || ''}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="2" y1="12" x2="22" y2="12" />
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
					</svg>
					{iabT.preferenceCenter.vendorList.customVendorsHeading} ({filteredCustomVendors.length})
				</h3>
				<p class={noStyle ? '' : styles.customVendorNotice || ''}>
					{iabT.preferenceCenter.vendorList.customVendorsNotice}
				</p>
			</div>
			<div>
				{#each filteredCustomVendors as vendor (vendor.id)}
					{@const vendorKey = String(vendor.id)}
					{@const vendorPurposes = getVendorPurposes(vendor.id)}
					{@const vendorSpecialFeatures = getVendorSpecialFeatures(vendor.id)}
					{@const vendorFeatures = getVendorFeatures(vendor.id)}
					{@const hasLegitimateInterest = vendor.legIntPurposes.length > 0}
					{@const isLegitimateInterestAllowed = vendorLegitimateInterests[vendorKey] ?? true}
					{@const maxAgeText = getMaxAgeText(vendor)}

					<Collapsible.Root
						open={expandedVendors.has(vendor.id)}
						onOpenChange={(details) => handleVendorOpenChange(vendor.id, details.open)}
						id={`vendor-${vendorKey}`}
						class={noStyle ? '' : `${styles.vendorListItem || ''} ${styles.customVendorItem || ''}`}
					>
						<div class={noStyle ? '' : styles.vendorListItemHeader || ''}>
							<Collapsible.Trigger
								class={noStyle ? '' : styles.vendorListTrigger || ''}
							>
								<div class={noStyle ? '' : styles.vendorListInfo || ''}>
									<h3 class={noStyle ? '' : styles.vendorListName || ''}>
										{vendor.name}
										<svg
											class={noStyle ? '' : styles.customVendorIcon || ''}
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-label={iabT.common.customPartner}
										>
											<circle cx="12" cy="12" r="10" />
											<line x1="2" y1="12" x2="22" y2="12" />
											<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
										</svg>
									</h3>
								</div>
								<Collapsible.Indicator class={noStyle ? '' : styles.purposeArrow || ''}>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M19 9l-7 7-7-7" />
									</svg>
								</Collapsible.Indicator>
							</Collapsible.Trigger>
							<Switch.Root
								checked={vendorConsents[vendorKey] ?? false}
								onCheckedChange={(details) => onVendorToggle(vendor.id, details.checked)}
								class={noStyle ? '' : sw.root()}
							>
								<Switch.Control class={noStyle ? '' : sw.track()}>
									<Switch.Thumb class={noStyle ? '' : sw.thumb()} />
								</Switch.Control>
								<Switch.HiddenInput />
							</Switch.Root>
						</div>

						<Collapsible.Content class={noStyle ? '' : styles.vendorListContent || ''}>
							<div class={noStyle ? '' : styles.vendorLinks || ''}>
								<a
									href={vendor.policyUrl}
									target="_blank"
									rel="noopener noreferrer"
									class={noStyle ? '' : styles.vendorLink || ''}
								>
									<svg class={noStyle ? '' : styles.vendorLinkIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
										<polyline points="15 3 21 3 21 9" />
										<line x1="10" y1="14" x2="21" y2="3" />
									</svg>
									{iabT.preferenceCenter.vendorList.privacyPolicy}
								</a>
							</div>

							<div class={noStyle ? '' : styles.vendorBadges || ''}>
								{#if vendor.usesCookies}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>{iabT.preferenceCenter.vendorList.usesCookies}</span>
								{/if}
								{#if vendor.usesNonCookieAccess}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>{iabT.preferenceCenter.vendorList.nonCookieAccess}</span>
								{/if}
								{#if maxAgeText}
									<span class={noStyle ? '' : styles.vendorBadge || ''}>{maxAgeText}</span>
								{/if}
							</div>

							{#if vendorPurposes.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.purposes} ({vendorPurposes.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorPurposes as purpose (purpose.id)}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>
												{purpose.name}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if hasLegitimateInterest && onVendorLegitimateInterestToggle}
								<div class={noStyle ? '' : styles.vendorLISection || ''}>
									<div class={noStyle ? '' : styles.vendorLISectionHeader || ''}>
										<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
											<svg class={noStyle ? '' : styles.legitimateInterestIcon || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
											</svg>
											{iabT.preferenceCenter.purposeItem.legitimateInterest}
										</h4>
										<button
											type="button"
											onclick={() => onVendorLegitimateInterestToggle?.(vendor.id, !isLegitimateInterestAllowed)}
											class={noStyle ? '' : `${styles.objectButton || ''} ${!isLegitimateInterestAllowed ? styles.objectButtonActive || '' : ''}`}
											aria-pressed={!isLegitimateInterestAllowed}
										>
											{isLegitimateInterestAllowed
												? iabT.preferenceCenter.purposeItem.objectButton
												: iabT.preferenceCenter.purposeItem.objected}
										</button>
									</div>
									<p class={noStyle ? '' : styles.liExplanation || ''}>
										{iabT.preferenceCenter.purposeItem.rightToObject}
									</p>
								</div>
							{/if}

							{#if vendorSpecialFeatures.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.specialFeatures} ({vendorSpecialFeatures.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorSpecialFeatures as sf (sf.id)}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>{sf.name}</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if vendorFeatures.length > 0}
								<div class={noStyle ? '' : styles.vendorPurposesList || ''}>
									<h4 class={noStyle ? '' : styles.vendorPurposesTitle || ''}>
										{iabT.preferenceCenter.vendorList.features} ({vendorFeatures.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorFeatures as f (f.id)}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>{f.name}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</div>
		</div>
	{/if}

	{#if filteredVendors.length === 0}
		<div class={noStyle ? '' : styles.emptyState || ''}>
			<p class={noStyle ? '' : styles.emptyStateText || ''}>
				No vendors found matching "{searchTerm}"
			</p>
		</div>
	{/if}
</div>
