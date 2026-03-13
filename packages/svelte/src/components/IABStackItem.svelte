<script lang="ts">
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import { Switch } from '@ark-ui/svelte/switch';
	import { switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
	import type { ProcessedStack, VendorId } from '../iab-types';
	import type { IABTranslations } from '../iab-translations';
	import IABPurposeItem from './IABPurposeItem.svelte';

	const sw = switchVariants();

	let {
		stack,
		consents,
		onToggle,
		vendorConsents,
		onVendorToggle,
		onVendorClick,
		vendorLegitimateInterests = {},
		onVendorLegitimateInterestToggle,
		purposeLegitimateInterests = {},
		onPurposeLegitimateInterestToggle,
		noStyle = false,
		iabT,
	}: {
		stack: ProcessedStack;
		consents: Record<number, boolean>;
		onToggle: (purposeId: number, value: boolean) => void;
		vendorConsents: Record<string, boolean>;
		onVendorToggle: (vendorId: VendorId, value: boolean) => void;
		onVendorClick: (vendorId: VendorId) => void;
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

	const allEnabled = $derived(
		stack.purposes.every((p) => consents[p.id] ?? false)
	);
	const someEnabled = $derived(
		stack.purposes.some((p) => consents[p.id] ?? false) && !allEnabled
	);

	function handleStackToggle(value: boolean) {
		for (const purpose of stack.purposes) {
			onToggle(purpose.id, value);
			for (const vendor of purpose.vendors) {
				if (!vendor.usesLegitimateInterest) {
					onVendorToggle(vendor.id, value);
				}
			}
		}
	}

	const totalVendors = $derived(
		new Set(stack.purposes.flatMap((p) => p.vendors.map((v) => v.id))).size
	);
</script>

<Collapsible.Root
	bind:open={isExpanded}
	class={noStyle ? '' : styles.stackItem || ''}
	data-testid={`stack-item-${stack.id}`}
>
	<div class={noStyle ? '' : styles.stackHeader || ''}>
		<Collapsible.Trigger
			class={noStyle ? '' : styles.stackTrigger || ''}
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
			<div class={noStyle ? '' : styles.stackInfo || ''}>
				<h3 class={noStyle ? '' : styles.stackName || ''}>{stack.name}</h3>
				{#if !isExpanded}
					<p class={noStyle ? '' : styles.stackMeta || ''}>
						{totalVendors}
						{totalVendors === 1 ? 'partner' : 'partners'}
					</p>
				{/if}
			</div>
		</Collapsible.Trigger>
		<div class={noStyle ? '' : styles.stackControls || ''}>
			{#if someEnabled}
				<div
					class={noStyle ? '' : styles.partialIndicator || ''}
					title="Partially enabled"
				></div>
			{/if}
			<Switch.Root
				checked={allEnabled}
				onCheckedChange={(details) => handleStackToggle(details.checked)}
				class={noStyle ? '' : sw.root()}
			>
				<Switch.Control class={noStyle ? '' : sw.track()}>
					<Switch.Thumb class={noStyle ? '' : sw.thumb()} />
				</Switch.Control>
				<Switch.HiddenInput />
			</Switch.Root>
		</div>
	</div>

	<Collapsible.Content>
		<div class={noStyle ? '' : styles.stackDescription || ''}>
			<p>{stack.description}</p>
			<p class={noStyle ? '' : styles.stackMeta || ''}>
				{totalVendors}
				{totalVendors === 1 ? 'partner' : 'partners'}
			</p>
		</div>
		<div class={noStyle ? '' : styles.stackContent || ''}>
			{#each stack.purposes as purpose (purpose.id)}
				<IABPurposeItem
					{purpose}
					isEnabled={consents[purpose.id] ?? false}
					onToggle={(value) => onToggle(purpose.id, value)}
					{vendorConsents}
					{onVendorToggle}
					{onVendorClick}
					{vendorLegitimateInterests}
					{onVendorLegitimateInterestToggle}
					{purposeLegitimateInterests}
					{onPurposeLegitimateInterestToggle}
					{noStyle}
					{iabT}
				/>
			{/each}
		</div>
	</Collapsible.Content>
</Collapsible.Root>
