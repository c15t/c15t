<script setup lang="ts">
import { computed, ref } from 'vue';
import dialogStyles from '@c15t/ui/styles/v3/iab-consent-dialog.module.css';
import ConsentSwitch from './consent-switch.vue';
import type {
	IabProcessedPurpose,
	IabVendorId,
} from './iab-purpose-item.vue';
import IabPurposeItem from './iab-purpose-item.vue';

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
}>();

const isExpanded = ref(false);

const allEnabled = computed(() =>
	props.stack.purposes.every((purpose) => props.consents[purpose.id] ?? false),
);

const someEnabled = computed(
	() =>
		props.stack.purposes.some((purpose) => props.consents[purpose.id] ?? false) &&
		!allEnabled.value,
);

const totalVendors = computed(
	() =>
		new Set(
			props.stack.purposes.flatMap((purpose) =>
				purpose.vendors.map((vendor) => vendor.id),
			),
		).size,
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
	<div :class="dialogStyles.stackItem" :data-testid="`stack-item-${stack.id}`">
		<div :class="dialogStyles.stackHeader">
			<button
				type="button"
				:class="dialogStyles.stackTrigger"
				:aria-expanded="isExpanded"
				@click="isExpanded = !isExpanded"
			>
				<svg
					:class="dialogStyles.purposeArrow"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path v-if="isExpanded" d="M19 9l-7 7-7-7" />
					<path v-else d="M9 5l7 7-7 7" />
				</svg>
				<div :class="dialogStyles.stackInfo">
					<h3 :class="dialogStyles.stackName">{{ stack.name }}</h3>
					<p :class="dialogStyles.stackMeta">
						{{ totalVendors }}
						{{ totalVendors === 1 ? 'partner' : 'partners' }}
					</p>
				</div>
			</button>
			<ConsentSwitch
				v-model="stackChecked"
				:aria-label="stack.name"
				:indeterminate="someEnabled"
			/>
		</div>

		<div v-if="isExpanded" :class="dialogStyles.stackContent">
			<p :class="dialogStyles.stackDescription">{{ stack.description }}</p>
			<IabPurposeItem
				v-for="purpose in stack.purposes"
				:key="purpose.id"
				:purpose="purpose"
				:is-enabled="consents[purpose.id] ?? false"
				:vendor-consents="vendorConsents"
				:vendor-legitimate-interests="vendorLegitimateInterests"
				:purpose-legitimate-interests="purposeLegitimateInterests"
				@toggle="(value) => emit('toggle', purpose.id, value)"
				@vendor-toggle="(vendorId, value) => emit('vendorToggle', vendorId, value)"
				@vendor-click="(vendorId) => emit('vendorClick', vendorId)"
				@purpose-legitimate-interest-toggle="
					(value) => emit('purposeLegitimateInterestToggle', purpose.id, value)
				"
			/>
		</div>
	</div>
</template>
