<script lang="ts">
	/**
	 * One informational IAB Feature row.
	 *
	 * TCF Policies v5.0.b forbid showing Features next to a control that
	 * cannot be disabled, so this row has no switch, no lock and no
	 * per-vendor toggles. It shows the name, the description, the
	 * illustrations and the names of the vendors that use the feature.
	 */
	import styles from '@c15t/ui/styles/components/iab-consent-dialog';

	import type { IABTranslations } from '../iab-translations';
	import type { ProcessedFeature } from '../iab-types';
	import { PreferenceItem } from '../primitives';
	import ChevronRightIcon from './icons/chevron-right-icon.svelte';

	let {
		feature,
		testId,
		noStyle = false,
		iabT,
	}: {
		feature: ProcessedFeature;
		/** The row's `data-testid`, from the shared display model. */
		testId?: string;
		noStyle?: boolean;
		iabT: IABTranslations;
	} = $props();

	let isExpanded = $state(false);
	let showExamples = $state(false);
	let showVendors = $state(false);
</script>

<PreferenceItem.Root
	bind:open={isExpanded}
	class={noStyle ? '' : styles.purposeItem || ''}
	data-testid={testId ?? `feature-item-${feature.id}`}
	noStyle
>
	<div class={noStyle ? '' : styles.purposeHeader || ''}>
		<PreferenceItem.Trigger class={noStyle ? '' : styles.purposeTrigger || ''}>
			<PreferenceItem.Leading>
				<ChevronRightIcon
					class={noStyle ? '' : styles.purposeArrow || ''}
					aria-hidden={true}
					expanded={isExpanded}
				/>
			</PreferenceItem.Leading>
			<PreferenceItem.Header class={noStyle ? '' : styles.purposeInfo || ''}>
				<PreferenceItem.Title class={noStyle ? '' : styles.purposeName || ''}>
					{feature.name}
				</PreferenceItem.Title>
				<PreferenceItem.Meta class={noStyle ? '' : styles.purposeMeta || ''}>
					{iabT.preferenceCenter.purposeItem.partners.replace(
						'{count}',
						String(feature.vendors.length)
					)}
				</PreferenceItem.Meta>
			</PreferenceItem.Header>
		</PreferenceItem.Trigger>
	</div>

	<PreferenceItem.Content
		innerClassName={noStyle ? '' : styles.purposeContent || ''}
		{noStyle}
	>
		<p class={noStyle ? '' : styles.purposeDescription || ''}>
			{feature.description}
		</p>

		<!-- Illustrations / Examples -->
		{#if feature.illustrations.length > 0}
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
							aria-hidden={true}
							expanded={showExamples}
						/>
						{iabT.preferenceCenter.purposeItem.examples}
						({feature.illustrations.length})
					</PreferenceItem.Trigger>
					<PreferenceItem.Content {noStyle}>
						<ul class={noStyle ? '' : styles.examplesList || ''}>
							{#each feature.illustrations as illustration (illustration)}
								<li>{illustration}</li>
							{/each}
						</ul>
					</PreferenceItem.Content>
				</PreferenceItem.Root>
			</div>
		{/if}

		<!-- Vendors using the feature: names only, no controls -->
		{#if feature.vendors.length > 0}
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
							aria-hidden={true}
							expanded={showVendors}
						/>
						{iabT.preferenceCenter.vendorList.iabVendorsHeading}
						({feature.vendors.length})
					</PreferenceItem.Trigger>
					<PreferenceItem.Content {noStyle}>
						<ul class={noStyle ? '' : styles.examplesList || ''}>
							{#each feature.vendors as vendor (vendor.id)}
								<li>{vendor.name}</li>
							{/each}
						</ul>
					</PreferenceItem.Content>
				</PreferenceItem.Root>
			</div>
		{/if}
	</PreferenceItem.Content>
</PreferenceItem.Root>
