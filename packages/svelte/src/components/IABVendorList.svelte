<script lang="ts">
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import { Switch } from '@ark-ui/svelte/switch';
	import { switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
	import type { GlobalVendorList } from 'c15t';
	import { untrack } from 'svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import type { ProcessedPurpose, ProcessedVendor, VendorId, NonIABVendor } from '../iab-types';
	import type { IABTranslations } from '../iab-translations';
	import CloseIcon from './icons/CloseIcon.svelte';
	import SearchIcon from './icons/SearchIcon.svelte';
	import LayersIcon from './icons/LayersIcon.svelte';
	import LegitimateInterestIcon from './icons/LegitimateInterestIcon.svelte';
	import ChevronDownIcon from './icons/ChevronDownIcon.svelte';
	import ExternalLinkIcon from './icons/ExternalLinkIcon.svelte';
	import LockIcon from './icons/LockIcon.svelte';
	import GlobeIcon from './icons/GlobeIcon.svelte';

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
		onVendorLegitimateInterestToggle?: (vendorId: VendorId, value: boolean) => void;
		noStyle?: boolean;
		iabT: IABTranslations;
	} = $props();

	let searchTerm = $state('');
	let expandedVendors = new SvelteSet<VendorId>();

	// Map IAB vendors
	const iabVendors = $derived.by((): ProcessedVendor[] => {
		if (!vendorData) return [];
		return Object.entries(vendorData.vendors).map(([id, vendor]) => ({
			id: Number(id),
			name: vendor.name,
			policyUrl: (vendor as unknown as { policyUrl?: string }).policyUrl ?? '',
			usesNonCookieAccess: vendor.usesNonCookieAccess,
			deviceStorageDisclosureUrl: vendor.deviceStorageDisclosureUrl ?? null,
			usesCookies: vendor.usesCookies,
			cookieMaxAgeSeconds: vendor.cookieMaxAgeSeconds,
			cookieRefresh: vendor.cookieRefresh,
			specialPurposes: vendor.specialPurposes || [],
			specialFeatures: vendor.specialFeatures || [],
			features: vendor.features || [],
			purposes: vendor.purposes || [],
			legIntPurposes: vendor.legIntPurposes || [],
			isCustom: false,
			legitimateInterestUrl: vendor.urls?.find((url) => url.legIntClaim)?.legIntClaim ?? null,
			dataRetention: vendor.dataRetention,
			dataDeclaration: (vendor as unknown as { dataDeclaration?: number[] }).dataDeclaration || [],
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
		})),
	);

	// Combine and sort all vendors
	const vendors = $derived(
		[...iabVendors, ...mappedCustomVendors].sort((a, b) => a.name.localeCompare(b.name)),
	);

	// Scroll to selected vendor.
	// Uses untrack for expandedVendors write to avoid reactive cycle,
	// and cleans up the timeout if selectedVendorId changes rapidly.
	$effect(() => {
		if (selectedVendorId !== null) {
			const id = selectedVendorId;
			untrack(() => {
				expandedVendors.add(id);
			});
			const timer = setTimeout(() => {
				const element = document.getElementById(`vendor-${String(id)}`);
				element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
			return () => clearTimeout(timer);
		}
	});

	const filteredVendors = $derived.by(() => {
		if (selectedVendorId !== null) {
			return vendors.filter((v) => String(v.id) === String(selectedVendorId));
		}
		return vendors.filter((vendor) => vendor.name.toLowerCase().includes(searchTerm.toLowerCase()));
	});

	const filteredIABVendors = $derived(filteredVendors.filter((v) => !v.isCustom));
	const filteredCustomVendors = $derived(filteredVendors.filter((v) => v.isCustom));

	function handleVendorOpenChange(vendorId: VendorId, open: boolean) {
		if (open) {
			expandedVendors.add(vendorId);
		} else {
			expandedVendors.delete(vendorId);
		}
	}

	// Precompute vendor lookup maps once (O(V+P)) instead of per-vendor-per-render (O(V×P)).
	type VendorPurposeEntry = ProcessedPurpose & { usesLegitimateInterest: boolean };
	type SimpleEntry = { id: number; name: string; description: string };

	const vendorPurposesMap = $derived.by(() => {
		const map = new SvelteMap<string, VendorPurposeEntry[]>();
		for (const vendor of vendors) {
			const key = String(vendor.id);
			const matched = purposes
				.filter((purpose) => purpose.vendors.some((v) => String(v.id) === key))
				.map((purpose) => ({
					...purpose,
					usesLegitimateInterest: vendor.legIntPurposes.includes(purpose.id),
				}));
			map.set(key, matched);
		}
		return map;
	});

	const vendorSpecialPurposesMap = $derived.by(() => {
		const map = new SvelteMap<string, SimpleEntry[]>();
		if (!vendorData) return map;
		for (const vendor of vendors) {
			const entries = vendor.specialPurposes
				.map((id) => vendorData.specialPurposes[id])
				.filter((sp): sp is NonNullable<typeof sp> => sp != null)
				.map((sp) => ({ id: sp.id, name: sp.name, description: sp.description }));
			map.set(String(vendor.id), entries);
		}
		return map;
	});

	const vendorSpecialFeaturesMap = $derived.by(() => {
		const map = new SvelteMap<string, SimpleEntry[]>();
		if (!vendorData) return map;
		for (const vendor of vendors) {
			const entries = vendor.specialFeatures
				.map((id) => vendorData.specialFeatures[id])
				.filter((sf): sf is NonNullable<typeof sf> => sf != null)
				.map((sf) => ({ id: sf.id, name: sf.name, description: sf.description }));
			map.set(String(vendor.id), entries);
		}
		return map;
	});

	const vendorFeaturesMap = $derived.by(() => {
		const map = new SvelteMap<string, SimpleEntry[]>();
		if (!vendorData) return map;
		for (const vendor of vendors) {
			const entries = (vendor.features || [])
				.map((id) => vendorData.features[id])
				.filter((f): f is NonNullable<typeof f> => f != null)
				.map((f) => ({ id: f.id, name: f.name, description: f.description }));
			map.set(String(vendor.id), entries);
		}
		return map;
	});

	function getVendorPurposes(vendorId: VendorId) {
		return vendorPurposesMap.get(String(vendorId)) ?? [];
	}

	function getVendorSpecialPurposes(vendorId: VendorId) {
		return vendorSpecialPurposesMap.get(String(vendorId)) ?? [];
	}

	function getVendorSpecialFeatures(vendorId: VendorId) {
		return vendorSpecialFeaturesMap.get(String(vendorId)) ?? [];
	}

	function getVendorFeatures(vendorId: VendorId) {
		return vendorFeaturesMap.get(String(vendorId)) ?? [];
	}

	function getMaxAgeText(vendor: ProcessedVendor): string | null {
		if (!vendor.cookieMaxAgeSeconds) return null;
		let text = iabT.preferenceCenter.vendorList.maxAge.replace(
			'{days}',
			String(Math.floor(vendor.cookieMaxAgeSeconds / 86400)),
		);
		if (vendor.cookieRefresh) {
			text = `${text} ${iabT.preferenceCenter.vendorList.maxAgeRefreshes}`;
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
				<CloseIcon class={noStyle ? '' : styles.clearIcon || ''} aria-hidden={true} />
				{iabT.common.clearSelection}
			</button>
		</div>
	{:else}
		<div class={noStyle ? '' : styles.vendorListHeader || ''}>
			<div class={noStyle ? '' : styles.searchContainer || ''}>
				<SearchIcon class={noStyle ? '' : styles.searchIcon || ''} aria-hidden={true} />
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
					<LayersIcon class={noStyle ? '' : styles.vendorSectionIcon || ''} aria-hidden={true} />
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
							<Collapsible.Trigger class={noStyle ? '' : styles.vendorListTrigger || ''}>
								<div class={noStyle ? '' : styles.vendorListInfo || ''}>
									<h3 class={noStyle ? '' : styles.vendorListName || ''}>
										{vendor.name}
									</h3>
									<div class={noStyle ? '' : styles.vendorListMeta || ''}>
										<span class={noStyle ? '' : styles.vendorListMetaText || ''}>
											{vendorPurposes.length} purpose{vendorPurposes.length !== 1 ? 's' : ''}
											{#if vendorSpecialPurposes.length > 0}, {vendorSpecialPurposes.length} special{/if}
											{#if vendorSpecialFeatures.length > 0}, {vendorSpecialFeatures.length} feature{vendorSpecialFeatures.length !==
												1
													? 's'
													: ''}{/if}
										</span>
										{#if legIntCount > 0}
											<span class={noStyle ? '' : styles.vendorListLIBadge || ''}>
												<LegitimateInterestIcon width="10" height="10" aria-hidden={true} />
												{legIntCount}
												{iabT.preferenceCenter.vendorList.legitimateInterest}
											</span>
										{/if}
									</div>
								</div>
								<Collapsible.Indicator class={noStyle ? '' : styles.purposeArrow || ''}>
									<ChevronDownIcon aria-hidden={true} />
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
									<ExternalLinkIcon class={noStyle ? '' : styles.vendorLinkIcon || ''} />
									{iabT.preferenceCenter.vendorList.privacyPolicy}
								</a>
								{#if vendor.legitimateInterestUrl}
									<a
										href={vendor.legitimateInterestUrl}
										target="_blank"
										rel="noopener noreferrer"
										class={noStyle ? '' : styles.vendorLink || ''}
									>
										<ExternalLinkIcon class={noStyle ? '' : styles.vendorLinkIcon || ''} />
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
										<ExternalLinkIcon class={noStyle ? '' : styles.vendorLinkIcon || ''} />
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
										{iabT.preferenceCenter.vendorList.retention.replace(
											'{days}',
											String(standardRetentionDays),
										)}
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
											{@const retentionDays =
												vendor.dataRetention?.purposes?.[purpose.id] ??
												vendor.dataRetention?.stdRetention}
											<li
												class={noStyle
													? ''
													: `${styles.vendorPurposeItem || ''} ${purpose.usesLegitimateInterest ? styles.vendorPurposeItemLI || '' : ''}`}
											>
												<span>
													{purpose.name}
													{#if retentionDays}
														<span class={noStyle ? '' : styles.vendorRetention || ''}>
															({iabT.preferenceCenter.vendorList.retainedDays.replace(
																'{days}',
																String(retentionDays),
															)})
														</span>
													{/if}
												</span>
												{#if purpose.usesLegitimateInterest}
													<span class={noStyle ? '' : styles.vendorListLIBadge || ''}>
														<LegitimateInterestIcon width="10" height="10" />
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
											<LegitimateInterestIcon
												class={noStyle ? '' : styles.legitimateInterestIcon || ''}
											/>
											{iabT.preferenceCenter.purposeItem.legitimateInterest}
										</h4>
										<button
											type="button"
											onclick={() =>
												onVendorLegitimateInterestToggle?.(vendor.id, !isLegitimateInterestAllowed)}
											class={noStyle
												? ''
												: `${styles.objectButton || ''} ${!isLegitimateInterestAllowed ? styles.objectButtonActive || '' : ''}`}
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
										{iabT.preferenceCenter.vendorList.dataCategories} ({vendor.dataDeclaration
											.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendor.dataDeclaration as categoryId (categoryId)}
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
										<LockIcon
											aria-label={iabT.preferenceCenter.vendorList.specialPurposes}
											role="img"
											class={noStyle ? '' : styles.legitimateInterestIcon || ''}
										/>
										{iabT.preferenceCenter.vendorList.specialPurposes} ({vendorSpecialPurposes.length})
									</h4>
									<ul class={noStyle ? '' : styles.vendorPurposesItems || ''}>
										{#each vendorSpecialPurposes as sp (sp.id)}
											{@const retentionDays =
												vendor.dataRetention?.specialPurposes?.[sp.id] ??
												vendor.dataRetention?.stdRetention}
											<li class={noStyle ? '' : styles.vendorPurposeItem || ''}>
												<span>
													{sp.name}
													{#if retentionDays}
														<span class={noStyle ? '' : styles.vendorRetention || ''}>
															({iabT.preferenceCenter.vendorList.retainedDays.replace(
																'{days}',
																String(retentionDays),
															)})
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
					<GlobeIcon class={noStyle ? '' : styles.vendorSectionIcon || ''} aria-hidden={true} />
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
							<Collapsible.Trigger class={noStyle ? '' : styles.vendorListTrigger || ''}>
								<div class={noStyle ? '' : styles.vendorListInfo || ''}>
									<h3 class={noStyle ? '' : styles.vendorListName || ''}>
										{vendor.name}
										<GlobeIcon
											class={noStyle ? '' : styles.customVendorIcon || ''}
											aria-label={iabT.common.customPartner}
										/>
									</h3>
								</div>
								<Collapsible.Indicator class={noStyle ? '' : styles.purposeArrow || ''}>
									<ChevronDownIcon aria-hidden={true} />
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
									<ExternalLinkIcon class={noStyle ? '' : styles.vendorLinkIcon || ''} />
									{iabT.preferenceCenter.vendorList.privacyPolicy}
								</a>
							</div>

							<div class={noStyle ? '' : styles.vendorBadges || ''}>
								{#if vendor.usesCookies}
									<span class={noStyle ? '' : styles.vendorBadge || ''}
										>{iabT.preferenceCenter.vendorList.usesCookies}</span
									>
								{/if}
								{#if vendor.usesNonCookieAccess}
									<span class={noStyle ? '' : styles.vendorBadge || ''}
										>{iabT.preferenceCenter.vendorList.nonCookieAccess}</span
									>
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
											<LegitimateInterestIcon
												class={noStyle ? '' : styles.legitimateInterestIcon || ''}
											/>
											{iabT.preferenceCenter.purposeItem.legitimateInterest}
										</h4>
										<button
											type="button"
											onclick={() =>
												onVendorLegitimateInterestToggle?.(vendor.id, !isLegitimateInterestAllowed)}
											class={noStyle
												? ''
												: `${styles.objectButton || ''} ${!isLegitimateInterestAllowed ? styles.objectButtonActive || '' : ''}`}
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
				{iabT.preferenceCenter.vendorList.noVendorsFound.replace('{searchTerm}', searchTerm)}
			</p>
		</div>
	{/if}
</div>
