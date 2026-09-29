<script setup lang="ts">
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';

import '@c15t/ui/styles/components/iab-consent-dialog.css';
/**
 * One informational IAB Feature row.
 *
 * TCF Policies v5.0.b forbid showing Features next to a control that cannot
 * be disabled, so this row has no switch, no lock and no per-vendor toggles.
 * It shows the name, the description, the illustrations and the names of
 * the vendors that use the feature, with the same `PreferenceItem` structure
 * and classes as the purpose rows.
 */
import { ref } from 'vue';

import { useConsentConfig, useIabTranslations } from '#c15t/composables';

import {
	PreferenceItemContent,
	PreferenceItemHeader,
	PreferenceItemLeading,
	PreferenceItemMeta,
	PreferenceItemRoot,
	PreferenceItemTitle,
	PreferenceItemTrigger,
} from '../primitives';
import type { IabProcessedPurpose } from './iab-purpose-item.vue';
import ChevronRightIcon from './icons/chevron-right-icon.vue';

defineProps<{
	feature: IabProcessedPurpose;
	/** The row's `data-testid`, from the shared display model. */
	testId?: string;
}>();

const config = useConsentConfig();
const isExpanded = ref(false);
const showExamples = ref(false);
const showVendors = ref(false);

const iabT = useIabTranslations();

const interpolate = function interpolate(
	template: string | undefined,
	count: number
) {
	return (template ?? '').replace('{count}', String(count));
};
</script>

<template>
	<PreferenceItemRoot
		v-model:open="isExpanded"
		v-bind="config.components?.['iab-purpose-item']?.root"
		:class="dialogStyles.purposeItem"
		:data-testid="testId ?? `feature-item-${feature.id}`"
		no-style
	>
		<div
			v-bind="config.components?.['iab-purpose-item']?.header"
			:class="dialogStyles.purposeHeader"
		>
			<PreferenceItemTrigger
				v-bind="config.components?.['iab-purpose-item']?.trigger"
				:class="dialogStyles.purposeTrigger"
			>
				<PreferenceItemLeading>
					<ChevronRightIcon
						:class="dialogStyles.purposeArrow"
						:expanded="isExpanded"
					/>
				</PreferenceItemLeading>
				<PreferenceItemHeader :class="dialogStyles.purposeInfo">
					<PreferenceItemTitle :class="dialogStyles.purposeName">
						{{ feature.name }}
					</PreferenceItemTitle>
					<PreferenceItemMeta :class="dialogStyles.purposeMeta">
						{{
							interpolate(
								iabT?.preferenceCenter?.purposeItem?.partners,
								feature.vendors.length
							)
						}}
					</PreferenceItemMeta>
				</PreferenceItemHeader>
			</PreferenceItemTrigger>
		</div>

		<PreferenceItemContent
			:inner-attrs="config.components?.['iab-purpose-item']?.content"
			:inner-class="dialogStyles.purposeContent"
			:no-style="false"
		>
			<p :class="dialogStyles.purposeDescription">{{ feature.description }}</p>

			<div
				v-if="feature.illustrations.length > 0"
				v-bind="config.components?.['iab-purpose-item']?.examples"
			>
				<PreferenceItemRoot
					v-model:open="showExamples"
					no-style
				>
					<PreferenceItemTrigger :class="dialogStyles.examplesToggle">
						<ChevronRightIcon
							style="height: 0.75rem; width: 0.75rem"
							:expanded="showExamples"
						/>
						{{ iabT?.preferenceCenter?.purposeItem?.examples }} ({{
							feature.illustrations.length
						}})
					</PreferenceItemTrigger>
					<PreferenceItemContent :no-style="false">
						<ul :class="dialogStyles.examplesList">
							<li
								v-for="illustration in feature.illustrations"
								:key="illustration"
							>
								{{ illustration }}
							</li>
						</ul>
					</PreferenceItemContent>
				</PreferenceItemRoot>
			</div>

			<!-- Vendors using the feature: names only, no controls -->
			<div
				v-if="feature.vendors.length > 0"
				v-bind="config.components?.['iab-purpose-item']?.vendors"
			>
				<PreferenceItemRoot
					v-model:open="showVendors"
					no-style
				>
					<PreferenceItemTrigger :class="dialogStyles.vendorsToggle">
						<ChevronRightIcon
							style="height: 0.75rem; width: 0.75rem"
							:expanded="showVendors"
						/>
						{{ iabT?.preferenceCenter?.vendorList?.iabVendorsHeading }} ({{
							feature.vendors.length
						}})
					</PreferenceItemTrigger>
					<PreferenceItemContent :no-style="false">
						<ul :class="dialogStyles.examplesList">
							<li
								v-for="vendor in feature.vendors"
								:key="vendor.id"
							>
								{{ vendor.name }}
							</li>
						</ul>
					</PreferenceItemContent>
				</PreferenceItemRoot>
			</div>
		</PreferenceItemContent>
	</PreferenceItemRoot>
</template>
