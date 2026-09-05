<script setup lang="ts">
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';
/**
 * A TCF stack: one toggle standing for the purposes it absorbed.
 *
 * Built on the same `PreferenceItem` primitive as the purpose rows, so the
 * purposes it nests stay in the DOM while it is closed — which is what
 * lets the four adapters be compared row for row.
 */
import switchStyles from '@c15t/ui/styles/components/switch';
import { computed, ref, toValue } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import {
	PreferenceItemContent,
	PreferenceItemControl,
	PreferenceItemHeader,
	PreferenceItemLeading,
	PreferenceItemMeta,
	PreferenceItemRoot,
	PreferenceItemTitle,
	PreferenceItemTrigger,
	SwitchRoot,
	SwitchThumb,
} from '../primitives';
import type { IabProcessedPurpose, IabVendorId } from './iab-purpose-item.vue';
import IabPurposeItem from './iab-purpose-item.vue';
import ChevronRightIcon from './icons/chevron-right-icon.vue';

export interface IabProcessedStack {
	id: number;
	name: string;
	description: string;
	purposes: IabProcessedPurpose[];
}

const props = defineProps<{
	stack: IabProcessedStack;
	consents: Record<number, boolean>;
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests?: Record<string, boolean>;
	purposeLegitimateInterests?: Record<number, boolean>;
}>();

const emit = defineEmits<{
	toggle: [purposeId: number, value: boolean];
	vendorToggle: [vendorId: IabVendorId, value: boolean];
	vendorClick: [vendorId: IabVendorId];
	purposeLegitimateInterestToggle: [purposeId: number, value: boolean];
	vendorLegitimateInterestToggle: [vendorId: IabVendorId, value: boolean];
}>();

const isExpanded = ref(false);
const config = useConsentConfig();
const init = useConsentInit();

const iabT = computed(
	() =>
		(
			toValue(init)?.translations?.translations as {
				iab?: Record<string, unknown>;
			}
		)?.iab as
			| {
					preferenceCenter?: {
						vendorList?: {
							partnerSingular?: string;
							partnerPlural?: string;
						};
					};
			  }
			| undefined
);

const allEnabled = computed(() =>
	props.stack.purposes.every((purpose) => props.consents[purpose.id] ?? false)
);

const someEnabled = computed(
	() =>
		props.stack.purposes.some(
			(purpose) => props.consents[purpose.id] ?? false
		) && !allEnabled.value
);

const totalVendors = computed(
	() =>
		new Set(
			props.stack.purposes.flatMap((purpose) =>
				purpose.vendors.map((vendor) => vendor.id)
			)
		).size
);

const partnerLabel = computed(() =>
	totalVendors.value === 1
		? iabT.value?.preferenceCenter?.vendorList?.partnerSingular
		: iabT.value?.preferenceCenter?.vendorList?.partnerPlural
);

const stackChecked = computed({
	get: () => allEnabled.value,
	set: (value: boolean) => {
		for (const purpose of props.stack.purposes) {
			emit('toggle', purpose.id, value);
			for (const vendor of purpose.vendors) {
				if (!vendor.usesLegitimateInterest) {
					emit('vendorToggle', vendor.id, value);
				}
			}
		}
	},
});
</script>

<template>
	<PreferenceItemRoot
		v-model:open="isExpanded"
		v-bind="config.components?.['iab-stack-item']?.root"
		:class="dialogStyles.stackItem"
		:data-testid="`stack-item-${stack.id}`"
		no-style
	>
		<div
			v-bind="config.components?.['iab-stack-item']?.header"
			:class="dialogStyles.stackHeader"
		>
			<PreferenceItemTrigger
				v-bind="config.components?.['iab-stack-item']?.trigger"
				:class="dialogStyles.stackTrigger"
			>
				<PreferenceItemLeading>
					<ChevronRightIcon
						:class="dialogStyles.purposeArrow"
						:expanded="isExpanded"
					/>
				</PreferenceItemLeading>
				<PreferenceItemHeader :class="dialogStyles.stackInfo">
					<PreferenceItemTitle :class="dialogStyles.stackName">
						{{ stack.name }}
					</PreferenceItemTitle>
					<PreferenceItemMeta :class="dialogStyles.stackMeta">
						{{ totalVendors }} {{ partnerLabel }}
					</PreferenceItemMeta>
				</PreferenceItemHeader>
			</PreferenceItemTrigger>
			<PreferenceItemControl :class="dialogStyles.stackControls">
				<template v-if="someEnabled">
					<span class="sr-only">Partially enabled</span>
					<div :class="dialogStyles.partialIndicator" />
				</template>
				<SwitchRoot
					v-model="stackChecked"
					v-bind="config.components?.switch?.root"
					:aria-label="stack.name"
					:class="switchStyles.root"
					data-size="medium"
				>
					<span
						v-bind="config.components?.switch?.track"
						data-slot="switch-track"
						:class="switchStyles.track"
					>
						<SwitchThumb
							v-bind="config.components?.switch?.thumb"
							:class="switchStyles.thumb"
						/>
					</span>
				</SwitchRoot>
			</PreferenceItemControl>
		</div>

		<PreferenceItemContent>
			<div :class="dialogStyles.stackDescription">
				<p>{{ stack.description }}</p>
			</div>
			<div
				v-bind="config.components?.['iab-stack-item']?.content"
				:class="dialogStyles.stackContent"
			>
				<IabPurposeItem
					v-for="purpose in stack.purposes"
					:key="purpose.id"
					:purpose="purpose"
					:is-enabled="consents[purpose.id] ?? false"
					:vendor-consents="vendorConsents"
					:vendor-legitimate-interests="vendorLegitimateInterests"
					:purpose-legitimate-interests="purposeLegitimateInterests"
					@toggle="(value) => emit('toggle', purpose.id, value)"
					@vendor-toggle="
						(vendorId, value) => emit('vendorToggle', vendorId, value)
					"
					@vendor-click="(vendorId) => emit('vendorClick', vendorId)"
					@vendor-legitimate-interest-toggle="
						(vendorId, value) =>
							emit('vendorLegitimateInterestToggle', vendorId, value)
					"
					@purpose-legitimate-interest-toggle="
						(value) =>
							emit('purposeLegitimateInterestToggle', purpose.id, value)
					"
				/>
			</div>
		</PreferenceItemContent>
	</PreferenceItemRoot>
</template>
