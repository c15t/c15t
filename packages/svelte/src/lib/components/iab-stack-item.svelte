<script lang="ts">
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';
	import switchStyles from '@c15t/ui/styles/components/switch';

	import type { IABTranslations } from '../iab-translations';
	import type { ProcessedStack, VendorId } from '../iab-types';
	import { PreferenceItem, Switch } from '../primitives';
	import IABPurposeItem from './iab-purpose-item.svelte';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';

	const sw = switchStyles;

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
		/** A stack, or a display-model row whose purposes carry `hasConsentBasis`. */
		stack: Omit<ProcessedStack, 'purposes'> & {
			purposes: (ProcessedStack['purposes'][number] & {
				hasConsentBasis?: boolean;
			})[];
		};
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
	let stackChecked = $state(false);

	// The stack switch covers the purposes some vendor processes on consent.
	// The others offer only their own objection control.
	const consentPurposes = $derived(
		stack.purposes.filter((p) => p.hasConsentBasis !== false)
	);
	const allEnabled = $derived(
		consentPurposes.every((p) => consents[p.id] ?? false)
	);
	const someEnabled = $derived(
		consentPurposes.some((p) => consents[p.id] ?? false) && !allEnabled
	);

	$effect(() => {
		stackChecked = allEnabled;
	});

	const handleStackToggle = function handleStackToggle(value: boolean) {
		for (const purpose of consentPurposes) {
			onToggle(purpose.id, value);
			for (const vendor of purpose.vendors) {
				if (!vendor.usesLegitimateInterest) {
					onVendorToggle(vendor.id, value);
				}
			}
		}
	};

	const totalVendors = $derived(
		new Set(stack.purposes.flatMap((p) => p.vendors.map((v) => v.id))).size
	);
</script>

<PreferenceItem.Root
	bind:open={isExpanded}
	class={noStyle ? '' : styles.stackItem || ''}
	data-testid={`stack-item-${stack.id}`}
	noStyle
>
	<div class={noStyle ? '' : styles.stackHeader || ''}>
		<PreferenceItem.Trigger class={noStyle ? '' : styles.stackTrigger || ''}>
			<PreferenceItem.Leading>
				<ChevronRightIcon
					class={noStyle ? '' : styles.purposeArrow || ''}
					expanded={isExpanded}
				/>
			</PreferenceItem.Leading>
			<PreferenceItem.Header class={noStyle ? '' : styles.stackInfo || ''}>
				<PreferenceItem.Title class={noStyle ? '' : styles.stackName || ''}>
					{stack.name}
				</PreferenceItem.Title>
				<PreferenceItem.Meta class={noStyle ? '' : styles.stackMeta || ''}>
					{totalVendors}
					{totalVendors === 1
						? iabT.preferenceCenter.vendorList.partnerSingular
						: iabT.preferenceCenter.vendorList.partnerPlural}
				</PreferenceItem.Meta>
			</PreferenceItem.Header>
		</PreferenceItem.Trigger>
		<PreferenceItem.Control class={noStyle ? '' : styles.stackControls || ''}>
			{#if someEnabled}
				<span class={noStyle ? '' : styles.srOnly || ''}>Partially enabled</span
				>
				<div class={noStyle ? '' : styles.partialIndicator || ''}></div>
			{/if}
			{#if consentPurposes.length > 0 || !onPurposeLegitimateInterestToggle}
				<Switch.Root
					aria-label={stack.name}
					bind:checked={stackChecked}
					onclick={() => handleStackToggle(stackChecked)}
					class={noStyle ? '' : sw.root}
					data-size="medium"
				>
					<Switch.Control class={noStyle ? '' : sw.track}>
						<Switch.Thumb class={noStyle ? '' : sw.thumb} />
					</Switch.Control>
				</Switch.Root>
			{/if}
		</PreferenceItem.Control>
	</div>

	<PreferenceItem.Content {noStyle}>
		<div class={noStyle ? '' : styles.stackDescription || ''}>
			<p>{stack.description}</p>
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
