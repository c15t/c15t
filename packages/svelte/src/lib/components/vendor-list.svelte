<script lang="ts">
	/**
	 * Vendor cards nested inside one category's accordion content. Each is a
	 * collapsed card of its own that opens for its description and privacy
	 * policy link, with a switch on the header. The markup, class names,
	 * `data-slot`s and ARIA attributes mirror the React
	 * `ConsentWidgetVendorList` so the cross-framework parity runner sees
	 * identical DOM.
	 */
	import type { AllConsentNames, ResolvedVendor } from '@c15t/core';
	import { defaultTranslationConfig } from '@c15t/core';
	import switchStyles from '@c15t/ui/styles/components/switch';
	import vendorListStyles from '@c15t/ui/styles/components/vendor-list';
	import { resolveTranslations } from '@c15t/ui/utils';

	import { getConsentContext } from '../context.svelte';
	import { PreferenceItem, Switch } from '../primitives';

	let {
		category,
		noStyle = false,
	}: {
		/** Category whose vendors to list. */
		category: AllConsentNames;
		/** Drop the built-in styling. */
		noStyle?: boolean;
	} = $props();

	const consent = getConsentContext();
	const uid = $props.id();

	const DEFAULT_COPY = {
		disabledByCategory: 'Turn on this category to choose vendors.',
		privacyPolicy: 'Privacy policy',
		switchLabel: 'Allow {vendor}',
		title: 'Vendors ({count})',
	};

	const copy = $derived({
		...DEFAULT_COPY,
		...resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		).consentManagerDialog.vendors,
	});
	const vendors = $derived(consent.state.getDisplayedVendors(category));
	const categoryOn = $derived(
		consent.state.selectedConsents[category] === true
	);
	const styles = $derived(noStyle ? undefined : vendorListStyles);
	const title = $derived(copy.title.replace('{count}', String(vendors.length)));

	// A set, not an object: a vendor id is any slug, and one such as
	// `constructor` would read an inherited member off a plain object as open.
	let openItems = $state<ReadonlySet<string>>(new Set());
	const toggleOpen = (id: string) => {
		const next = new Set(openItems);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		openItems = next;
	};

	const vendorName = (vendor: ResolvedVendor) => vendor.name ?? vendor.id;
	const hasDetails = (vendor: ResolvedVendor) =>
		Boolean(vendor.description || vendor.privacyPolicyUrl);
	// A `disabled` vendor is presented without a toggle: the kernel ignores
	// grants for it, so a switch would only mislead.
	const toggleable = (vendor: ResolvedVendor) => vendor.disabled !== true;
	const isChecked = (vendor: ResolvedVendor) =>
		consent.state.selectedVendors[vendor.id] ?? true;
	const labelId = (vendor: ResolvedVendor) =>
		`${uid}vendor-${category}-${vendor.id}`;
</script>

{#if vendors.length > 0}
	<section
		class={styles?.root}
		aria-label={title}
		data-testid={`consent-widget-vendor-list-${category}`}
	>
		{#if !categoryOn}
			<p
				class={styles?.hint}
				data-testid={`consent-widget-vendor-hint-${category}`}
			>
				{copy.disabledByCategory}
			</p>
		{/if}
		{#each vendors as vendor (vendor.id)}
			{@const open = openItems.has(vendor.id)}
			{@const details = hasDetails(vendor)}
			{@const checked = isChecked(vendor)}
			<PreferenceItem.Root
				class={styles?.item}
				disabled={!details}
				{noStyle}
				{open}
				data-testid={`consent-widget-vendor-item-${category}-${vendor.id}`}
			>
				<div class={styles?.header}>
					<PreferenceItem.Trigger
						class={styles?.trigger}
						onclick={() => {
							toggleOpen(vendor.id);
						}}
						data-testid={`consent-widget-vendor-trigger-${category}-${vendor.id}`}
					>
						<PreferenceItem.Leading class={styles?.arrow}>
							<svg
								aria-hidden="true"
								fill="none"
								focusable="false"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<title>{open ? 'Close' : 'Open'}</title>
								{#if open}
									<path d="M5 12h14" />
								{:else}
									<path d="M5 12h14M12 5v14" />
								{/if}
							</svg>
						</PreferenceItem.Leading>
						<span
							id={labelId(vendor)}
							class={styles?.name}
							data-testid={`consent-widget-vendor-name-${category}-${vendor.id}`}
						>
							{vendorName(vendor)}
						</span>
					</PreferenceItem.Trigger>
					{#if toggleable(vendor)}
						<div class={styles?.control}>
							<Switch.Root
								aria-label={copy.switchLabel.replace(
									'{vendor}',
									vendorName(vendor)
								)}
								aria-describedby={labelId(vendor)}
								{checked}
								class={noStyle ? undefined : switchStyles.root}
								data-size={noStyle ? undefined : 'small'}
								disabled={!categoryOn}
								onclick={() =>
									consent.state.setSelectedVendor(vendor.id, !checked)}
								data-testid={`consent-widget-vendor-switch-${category}-${vendor.id}`}
							>
								<Switch.Control
									class={noStyle ? undefined : switchStyles.track}
								>
									<Switch.Thumb
										class={noStyle ? undefined : switchStyles.thumb}
									/>
								</Switch.Control>
							</Switch.Root>
						</div>
					{/if}
				</div>
				{#if details}
					<PreferenceItem.Content
						class={styles?.content}
						innerClassName={styles?.contentInner}
						{noStyle}
						data-testid={`consent-widget-vendor-content-${category}-${vendor.id}`}
					>
						{#if vendor.description}
							<p class={styles?.description}>{vendor.description}</p>
						{/if}
						{#if vendor.privacyPolicyUrl}
							<a
								class={styles?.link}
								href={vendor.privacyPolicyUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								{copy.privacyPolicy}
							</a>
						{/if}
					</PreferenceItem.Content>
				{/if}
			</PreferenceItem.Root>
		{/each}
	</section>
{/if}
