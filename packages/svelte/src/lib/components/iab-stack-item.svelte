<script lang="ts">
import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { switchVariants } from '@c15t/ui/styles/primitives';
import type { IABTranslations } from '../iab-translations';
import type { ProcessedStack, VendorId } from '../iab-types';
import { PreferenceItem, Switch } from '../primitives';
import IABPurposeItem from './iab-purpose-item.svelte';
import ChevronRightIcon from './icons/chevron-right-icon.svelte';

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

<PreferenceItem.Root
	open={isExpanded}
	onOpenChange={(details) => {
		isExpanded = details.open;
	}}
	class={noStyle ? '' : styles.stackItem || ''}
	data-testid={`stack-item-${stack.id}`}
	noStyle
>
	<div class={noStyle ? '' : styles.stackHeader || ''}>
		<PreferenceItem.Trigger class={noStyle ? '' : styles.stackTrigger || ''}>
			<PreferenceItem.Leading class={noStyle ? '' : styles.purposeArrow || ''}>
				<ChevronRightIcon aria-hidden={true} />
			</PreferenceItem.Leading>
			<PreferenceItem.Header class={noStyle ? '' : styles.stackInfo || ''}>
				<PreferenceItem.Title class={noStyle ? '' : styles.stackName || ''}>
					{stack.name}
				</PreferenceItem.Title>
				{#if !isExpanded}
					<PreferenceItem.Meta class={noStyle ? '' : styles.stackMeta || ''}>
						{totalVendors}
						{totalVendors === 1
							? iabT.preferenceCenter.vendorList.partnerSingular
							: iabT.preferenceCenter.vendorList.partnerPlural}
					</PreferenceItem.Meta>
				{/if}
			</PreferenceItem.Header>
		</PreferenceItem.Trigger>
		<PreferenceItem.Control class={noStyle ? '' : styles.stackControls || ''}>
			{#if someEnabled}
				<span class="sr-only">Partially enabled</span>
				<div class={noStyle ? '' : styles.partialIndicator || ''} aria-hidden={true}></div>
			{/if}
			<Switch.Root
				aria-label={stack.name}
				checked={allEnabled}
				onCheckedChange={(details: { checked: boolean }) =>
					handleStackToggle(details.checked)}
				class={noStyle ? '' : sw.root()}
			>
				<Switch.Control class={noStyle ? '' : sw.track()}>
					<Switch.Thumb class={noStyle ? '' : sw.thumb()} />
				</Switch.Control>
				<Switch.HiddenInput />
			</Switch.Root>
		</PreferenceItem.Control>
	</div>

	<PreferenceItem.Content>
		<div class={noStyle ? '' : styles.stackDescription || ''}>
			<p>{stack.description}</p>
			<p class={noStyle ? '' : styles.stackMeta || ''}>
				{totalVendors}
				{totalVendors === 1
					? iabT.preferenceCenter.vendorList.partnerSingular
					: iabT.preferenceCenter.vendorList.partnerPlural}
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
	</PreferenceItem.Content>
</PreferenceItem.Root>
