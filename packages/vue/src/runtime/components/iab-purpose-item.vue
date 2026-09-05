<script setup lang="ts">
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';
import { computed, ref, toValue } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import ConsentSwitch from './consent-switch.vue';

export type IabVendorId = number | string;

export interface IabProcessedVendor {
	id: IabVendorId;
	name: string;
	usesLegitimateInterest?: boolean;
	isCustom?: boolean;
}

export interface IabProcessedPurpose {
	id: number;
	name: string;
	description: string;
	illustrations: string[];
	vendors: IabProcessedVendor[];
}

const props = defineProps<{
	purpose: IabProcessedPurpose;
	/**
	 * The row's `data-testid`, from the shared display model. A purpose, a
	 * special purpose and a special feature can all be numbered `1`, so the
	 * id alone does not identify the row.
	 */
	testId?: string;
	isEnabled: boolean;
	isLocked?: boolean;
	vendorConsents: Record<string, boolean>;
	vendorLegitimateInterests?: Record<string, boolean>;
	purposeLegitimateInterests?: Record<number, boolean>;
}>();

const emit = defineEmits<{
	toggle: [value: boolean];
	vendorToggle: [vendorId: IabVendorId, value: boolean];
	vendorClick: [vendorId: IabVendorId];
	purposeLegitimateInterestToggle: [value: boolean];
}>();

const init = useConsentInit();
const config = useConsentConfig();
const isExpanded = ref(false);
const showExamples = ref(false);
const showVendors = ref(false);

const iabT = computed(
	() =>
		(
			toValue(init)?.translations?.translations as {
				iab?: Record<string, unknown>;
			}
		)?.iab as
			| {
					preferenceCenter?: {
						purposeItem?: {
							partners?: string;
							vendorsUseLegitimateInterest?: string;
							examples?: string;
							partnersUsingPurpose?: string;
							objectButton?: string;
							objected?: string;
							rightToObject?: string;
						};
					};
			  }
			| undefined
);

const legIntVendors = computed(() =>
	props.purpose.vendors.filter((vendor) => vendor.usesLegitimateInterest)
);

const consentVendors = computed(() =>
	props.purpose.vendors.filter((vendor) => !vendor.usesLegitimateInterest)
);

const isPurposeLiAllowed = computed(
	() => props.purposeLegitimateInterests?.[props.purpose.id] ?? true
);

const checked = computed({
	get: () => props.isEnabled,
	set: (value: boolean) => {
		emit('toggle', value);
		for (const vendor of consentVendors.value) {
			emit('vendorToggle', vendor.id, value);
		}
	},
});

const getVendorConsent = function getVendorConsent(vendorId: IabVendorId) {
	return props.vendorConsents[String(vendorId)] ?? false;
};

const handlePurposeLiObjection = function handlePurposeLiObjection() {
	const nextValue = !isPurposeLiAllowed.value;
	emit('purposeLegitimateInterestToggle', nextValue);
	for (const vendor of legIntVendors.value) {
		emit('vendorToggle', vendor.id, nextValue);
	}
};
</script>

<template>
	<div
		v-bind="config.components?.['iab-purpose-item']?.root"
		:class="dialogStyles.purposeItem"
		:data-testid="testId ?? `purpose-item-${purpose.id}`"
	>
		<div
			v-bind="config.components?.['iab-purpose-item']?.header"
			:class="dialogStyles.purposeHeader"
		>
			<button
				v-bind="config.components?.['iab-purpose-item']?.trigger"
				type="button"
				:class="dialogStyles.purposeTrigger"
				:aria-expanded="isExpanded"
				@click="isExpanded = !isExpanded"
			>
				<svg
					aria-hidden="true"
					:class="dialogStyles.purposeArrow"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						v-if="isExpanded"
						d="M19 9l-7 7-7-7"
					/>
					<path
						v-else
						d="M9 5l7 7-7 7"
					/>
				</svg>
				<div :class="dialogStyles.purposeInfo">
					<h3 :class="dialogStyles.purposeName">
						{{ purpose.name }}
						<svg
							v-if="isLocked"
							aria-hidden="true"
							:class="dialogStyles.lockIcon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect
								x="3"
								y="11"
								width="18"
								height="11"
								rx="2"
								ry="2"
							/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</h3>
					<p :class="dialogStyles.purposeMeta">
						{{
							(iabT?.preferenceCenter?.purposeItem?.partners ?? '').replace(
								'{count}',
								String(purpose.vendors.length)
							)
						}}
					</p>
				</div>
			</button>
			<ConsentSwitch
				v-model="checked"
				:disabled="isLocked"
				:aria-label="purpose.name"
			/>
		</div>

		<div
			v-if="isExpanded"
			v-bind="config.components?.['iab-purpose-item']?.content"
			:class="dialogStyles.purposeContent"
		>
			<p :class="dialogStyles.purposeDescription">{{ purpose.description }}</p>

			<div
				v-if="legIntVendors.length > 0"
				v-bind="config.components?.['iab-purpose-item']?.legitimateInterest"
				:class="dialogStyles.purposeLiSection"
			>
				<div :class="dialogStyles.purposeLiSectionHeader">
					<div :class="dialogStyles.purposeLiInfo">
						<span>
							{{
								(
									iabT?.preferenceCenter?.purposeItem
										?.vendorsUseLegitimateInterest ?? ''
								).replace('{count}', String(legIntVendors.length))
							}}
						</span>
					</div>
					<button
						type="button"
						:class="dialogStyles.objectButton"
						:data-active="!isPurposeLiAllowed ? true : undefined"
						:aria-pressed="!isPurposeLiAllowed"
						@click="handlePurposeLiObjection"
					>
						{{
							isPurposeLiAllowed
								? iabT?.preferenceCenter?.purposeItem?.objectButton
								: iabT?.preferenceCenter?.purposeItem?.objected
						}}
					</button>
				</div>
				<p :class="dialogStyles.liExplanation">
					{{ iabT?.preferenceCenter?.purposeItem?.rightToObject }}
				</p>
			</div>

			<div
				v-if="purpose.illustrations.length > 0"
				v-bind="config.components?.['iab-purpose-item']?.examples"
			>
				<button
					type="button"
					:class="dialogStyles.examplesToggle"
					@click="showExamples = !showExamples"
				>
					{{ iabT?.preferenceCenter?.purposeItem?.examples }}
					({{ purpose.illustrations.length }})
				</button>
				<ul
					v-if="showExamples"
					:class="dialogStyles.examplesList"
				>
					<li
						v-for="(illustration, index) in purpose.illustrations"
						:key="index"
					>
						{{ illustration }}
					</li>
				</ul>
			</div>

			<div v-bind="config.components?.['iab-purpose-item']?.vendors">
				<button
					type="button"
					:class="dialogStyles.vendorsToggle"
					@click="showVendors = !showVendors"
				>
					{{ iabT?.preferenceCenter?.purposeItem?.partnersUsingPurpose }}
					({{ purpose.vendors.length }})
				</button>
				<ul
					v-if="showVendors"
					:class="dialogStyles.vendorLinks"
				>
					<li
						v-for="vendor in purpose.vendors"
						:key="String(vendor.id)"
						:class="dialogStyles.vendorListItem"
					>
						<button
							type="button"
							:class="dialogStyles.vendorName"
							@click="emit('vendorClick', vendor.id)"
						>
							{{ vendor.name }}
						</button>
						<ConsentSwitch
							v-if="!vendor.usesLegitimateInterest && !isLocked"
							:model-value="getVendorConsent(vendor.id)"
							@update:model-value="
								(value) => emit('vendorToggle', vendor.id, Boolean(value))
							"
						/>
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
