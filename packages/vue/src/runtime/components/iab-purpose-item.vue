<script setup lang="ts">
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';
/**
 * One row in the IAB preference centre: a purpose, a special purpose, a
 * feature or a special feature.
 *
 * Built on the shared `PreferenceItem` primitive rather than a hand-rolled
 * trigger and a `v-if` body, because the React and Svelte rows are, and a
 * row that mounts its content only while open cannot be compared against
 * one that keeps it collapsed in the DOM. Same slots, same collapsing
 * three-element content, same switch stylesheet.
 */
import switchStyles from '@c15t/ui/styles/components/switch';
import { computed, ref, toValue } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import {
	PreferenceItemAuxiliary,
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
import ChevronRightIcon from './icons/chevron-right-icon.vue';
import GlobeIcon from './icons/globe-icon.vue';
import LegitimateInterestIcon from './icons/legitimate-interest-icon.vue';
import LockIcon from './icons/lock-icon.vue';

export type IabVendorId = number | string;

export interface IabProcessedVendor {
	id: IabVendorId;
	name: string;
	usesLegitimateInterest?: boolean;
	isCustom?: boolean;
	usesCookies?: boolean;
	usesNonCookieAccess?: boolean;
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
	vendorLegitimateInterestToggle: [vendorId: IabVendorId, value: boolean];
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
					common?: { customPartner?: string };
					preferenceCenter?: {
						purposeItem?: {
							partners?: string;
							vendorsUseLegitimateInterest?: string;
							examples?: string;
							partnersUsingPurpose?: string;
							withYourPermission?: string;
							legitimateInterest?: string;
							objectButton?: string;
							objected?: string;
							rightToObject?: string;
						};
						vendorList?: {
							usesCookies?: string;
							nonCookieAccess?: string;
							customVendorsHeading?: string;
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

const iabConsentVendors = computed(() =>
	consentVendors.value.filter((vendor) => !vendor.isCustom)
);
const customConsentVendors = computed(() =>
	consentVendors.value.filter((vendor) => vendor.isCustom)
);
const iabLegIntVendors = computed(() =>
	legIntVendors.value.filter((vendor) => !vendor.isCustom)
);
const customLegIntVendors = computed(() =>
	legIntVendors.value.filter((vendor) => vendor.isCustom)
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

const getVendorLegitimateInterest = function getVendorLegitimateInterest(
	vendorId: IabVendorId
) {
	return props.vendorLegitimateInterests?.[String(vendorId)] ?? true;
};

const handlePurposeLiObjection = function handlePurposeLiObjection() {
	const nextValue = !isPurposeLiAllowed.value;
	emit('purposeLegitimateInterestToggle', nextValue);
	for (const vendor of legIntVendors.value) {
		emit('vendorToggle', vendor.id, nextValue);
	}
};

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
		:data-testid="testId ?? `purpose-item-${purpose.id}`"
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
						{{ purpose.name }}
						<LockIcon
							v-if="isLocked"
							:class="dialogStyles.lockIcon"
						/>
					</PreferenceItemTitle>
					<PreferenceItemMeta :class="dialogStyles.purposeMeta">
						{{
							interpolate(
								iabT?.preferenceCenter?.purposeItem?.partners,
								purpose.vendors.length
							)
						}}
					</PreferenceItemMeta>
					<PreferenceItemAuxiliary
						v-if="legIntVendors.length > 0"
						:class="dialogStyles.legitimateInterestBadge"
					>
						<LegitimateInterestIcon
							:class="dialogStyles.legitimateInterestIcon"
						/>
						{{
							interpolate(
								iabT?.preferenceCenter?.purposeItem
									?.vendorsUseLegitimateInterest,
								legIntVendors.length
							)
						}}
					</PreferenceItemAuxiliary>
				</PreferenceItemHeader>
			</PreferenceItemTrigger>
			<PreferenceItemControl>
				<SwitchRoot
					v-model="checked"
					v-bind="config.components?.switch?.root"
					:aria-label="purpose.name"
					:disabled="isLocked"
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

		<!-- The surface's padding goes on the inner element: the outer one is
		     the collapsing grid, and padding there keeps a closed item open by
		     its own padding's worth. -->
		<PreferenceItemContent
			:inner-attrs="config.components?.['iab-purpose-item']?.content"
			:inner-class="dialogStyles.purposeContent"
		>
			<p :class="dialogStyles.purposeDescription">{{ purpose.description }}</p>

			<div
				v-if="legIntVendors.length > 0"
				v-bind="config.components?.['iab-purpose-item']?.legitimateInterest"
				:class="dialogStyles.purposeLiSection"
			>
				<div :class="dialogStyles.purposeLiSectionHeader">
					<div :class="dialogStyles.purposeLiInfo">
						<LegitimateInterestIcon
							:class="dialogStyles.legitimateInterestIcon"
						/>
						<span>
							{{
								interpolate(
									iabT?.preferenceCenter?.purposeItem
										?.vendorsUseLegitimateInterest,
									legIntVendors.length
								)
							}}
						</span>
					</div>
					<button
						type="button"
						:class="[
							dialogStyles.objectButton,
							isPurposeLiAllowed ? '' : dialogStyles.objectButtonActive,
						]"
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
							purpose.illustrations.length
						}})
					</PreferenceItemTrigger>
					<PreferenceItemContent>
						<ul :class="dialogStyles.examplesList">
							<li
								v-for="illustration in purpose.illustrations"
								:key="illustration"
							>
								{{ illustration }}
							</li>
						</ul>
					</PreferenceItemContent>
				</PreferenceItemRoot>
			</div>

			<div v-bind="config.components?.['iab-purpose-item']?.vendors">
				<PreferenceItemRoot
					v-model:open="showVendors"
					no-style
				>
					<PreferenceItemTrigger :class="dialogStyles.vendorsToggle">
						<ChevronRightIcon
							style="height: 0.75rem; width: 0.75rem"
							:expanded="showVendors"
						/>
						{{ iabT?.preferenceCenter?.purposeItem?.partnersUsingPurpose }} ({{
							purpose.vendors.length
						}})
					</PreferenceItemTrigger>
					<PreferenceItemContent :inner-class="dialogStyles.vendorSection">
						<template v-if="iabConsentVendors.length > 0">
							<h5 :class="dialogStyles.vendorSectionTitle">
								{{ iabT?.preferenceCenter?.purposeItem?.withYourPermission }}
								({{ iabConsentVendors.length }})
							</h5>
							<div
								v-for="vendor in iabConsentVendors"
								:key="String(vendor.id)"
								:class="dialogStyles.vendorRow"
							>
								<div :class="dialogStyles.vendorInfo">
									<button
										type="button"
										:class="dialogStyles.vendorName"
										@click="emit('vendorClick', vendor.id)"
									>
										<span>{{ vendor.name }}</span>
									</button>
									<div :class="dialogStyles.vendorDetails">
										<span
											v-if="vendor.usesCookies"
											:class="dialogStyles.vendorDetail"
										>
											{{ iabT?.preferenceCenter?.vendorList?.usesCookies }}
										</span>
										<span
											v-if="vendor.usesNonCookieAccess"
											:class="dialogStyles.vendorDetail"
										>
											{{ iabT?.preferenceCenter?.vendorList?.nonCookieAccess }}
										</span>
									</div>
								</div>
								<SwitchRoot
									:aria-label="vendor.name"
									:model-value="getVendorConsent(vendor.id)"
									:class="switchStyles.root"
									data-size="small"
									@update:model-value="
										(value) => emit('vendorToggle', vendor.id, Boolean(value))
									"
								>
									<span
										data-slot="switch-track"
										:class="switchStyles.track"
									>
										<SwitchThumb :class="switchStyles.thumb" />
									</span>
								</SwitchRoot>
							</div>
						</template>

						<template v-if="iabLegIntVendors.length > 0">
							<h5
								:class="[
									dialogStyles.vendorSectionTitle,
									dialogStyles.vendorSectionTitleLi,
								]"
							>
								<LegitimateInterestIcon
									:class="dialogStyles.legitimateInterestIcon"
								/>
								{{ iabT?.preferenceCenter?.purposeItem?.legitimateInterest }}
								({{ iabLegIntVendors.length }})
							</h5>
							<p :class="dialogStyles.liExplanation">
								{{ iabT?.preferenceCenter?.purposeItem?.rightToObject }}
							</p>
							<div
								v-for="vendor in iabLegIntVendors"
								:key="String(vendor.id)"
								:class="[dialogStyles.vendorRow, dialogStyles.vendorRowLi]"
							>
								<div :class="dialogStyles.vendorInfo">
									<button
										type="button"
										:class="dialogStyles.vendorName"
										@click="emit('vendorClick', vendor.id)"
									>
										<span>{{ vendor.name }}</span>
									</button>
									<div :class="dialogStyles.vendorDetails">
										<span
											:class="[
												dialogStyles.vendorDetail,
												dialogStyles.vendorDetailLi,
											]"
										>
											{{
												iabT?.preferenceCenter?.purposeItem?.legitimateInterest
											}}
										</span>
										<span
											v-if="vendor.usesCookies"
											:class="dialogStyles.vendorDetail"
										>
											{{ iabT?.preferenceCenter?.vendorList?.usesCookies }}
										</span>
									</div>
								</div>
								<button
									type="button"
									:class="[
										dialogStyles.objectButton,
										getVendorLegitimateInterest(vendor.id)
											? ''
											: dialogStyles.objectButtonActive,
									]"
									:aria-pressed="!getVendorLegitimateInterest(vendor.id)"
									@click="
										emit(
											'vendorLegitimateInterestToggle',
											vendor.id,
											!getVendorLegitimateInterest(vendor.id)
										)
									"
								>
									{{
										getVendorLegitimateInterest(vendor.id)
											? iabT?.preferenceCenter?.purposeItem?.objectButton
											: iabT?.preferenceCenter?.purposeItem?.objected
									}}
								</button>
							</div>
						</template>

						<div
							v-if="
								customConsentVendors.length > 0 ||
								customLegIntVendors.length > 0
							"
							:class="dialogStyles.customVendorPurposeSection"
						>
							<h5 :class="dialogStyles.vendorSectionTitleCustom">
								<GlobeIcon :class="dialogStyles.legitimateInterestIcon" />
								{{ iabT?.preferenceCenter?.vendorList?.customVendorsHeading }}
								({{ customConsentVendors.length + customLegIntVendors.length }})
							</h5>
							<div
								v-for="vendor in customConsentVendors"
								:key="String(vendor.id)"
								:class="dialogStyles.vendorRow"
							>
								<div :class="dialogStyles.vendorInfo">
									<button
										type="button"
										:class="dialogStyles.vendorName"
										@click="emit('vendorClick', vendor.id)"
									>
										<span>{{ vendor.name }}</span>
										<GlobeIcon
											:class="dialogStyles.customVendorIcon"
											:aria-label="iabT?.common?.customPartner"
										/>
									</button>
								</div>
								<SwitchRoot
									:aria-label="vendor.name"
									:model-value="getVendorConsent(vendor.id)"
									:class="switchStyles.root"
									data-size="small"
									@update:model-value="
										(value) => emit('vendorToggle', vendor.id, Boolean(value))
									"
								>
									<span
										data-slot="switch-track"
										:class="switchStyles.track"
									>
										<SwitchThumb :class="switchStyles.thumb" />
									</span>
								</SwitchRoot>
							</div>
							<div
								v-for="vendor in customLegIntVendors"
								:key="String(vendor.id)"
								:class="[dialogStyles.vendorRow, dialogStyles.vendorRowLi]"
							>
								<div :class="dialogStyles.vendorInfo">
									<button
										type="button"
										:class="dialogStyles.vendorName"
										@click="emit('vendorClick', vendor.id)"
									>
										<span>{{ vendor.name }}</span>
										<GlobeIcon
											:class="dialogStyles.customVendorIcon"
											:aria-label="iabT?.common?.customPartner"
										/>
									</button>
								</div>
								<button
									type="button"
									:class="[
										dialogStyles.objectButton,
										getVendorLegitimateInterest(vendor.id)
											? ''
											: dialogStyles.objectButtonActive,
									]"
									:aria-pressed="!getVendorLegitimateInterest(vendor.id)"
									@click="
										emit(
											'vendorLegitimateInterestToggle',
											vendor.id,
											!getVendorLegitimateInterest(vendor.id)
										)
									"
								>
									{{
										getVendorLegitimateInterest(vendor.id)
											? iabT?.preferenceCenter?.purposeItem?.objectButton
											: iabT?.preferenceCenter?.purposeItem?.objected
									}}
								</button>
							</div>
						</div>
					</PreferenceItemContent>
				</PreferenceItemRoot>
			</div>
		</PreferenceItemContent>
	</PreferenceItemRoot>
</template>
