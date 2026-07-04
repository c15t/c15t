<script setup lang="ts">
import { computed, ref, toValue, watch } from 'vue';
import type { GlobalVendorList, NonIABVendor } from '@c15t/schema/types';
import dialogStyles from '@c15t/styles/iab-consent-dialog.module.css';
import { useConsentInit } from '#c15t/composables';
import ConsentSwitch from './consent-switch.vue';
import type { IabProcessedPurpose, IabVendorId } from './iab-purpose-item.vue';

const props = defineProps<{
	vendorData: GlobalVendorList | null;
	purposes: IabProcessedPurpose[];
	vendorConsents: Record<string, boolean>;
	selectedVendorId: IabVendorId | null;
	customVendors?: NonIABVendor[];
	vendorLegitimateInterests?: Record<string, boolean>;
}>();

const emit = defineEmits<{
	vendorToggle: [vendorId: IabVendorId, value: boolean];
	clearSelection: [];
}>();

const init = useConsentInit();
const searchTerm = ref('');

const iabT = computed(
	() =>
		(toValue(init)?.translations?.translations as { iab?: Record<string, unknown> })
			?.iab as {
			preferenceCenter?: {
				vendorList?: {
					search?: string;
					showingCount?: string;
					iabVendorsHeading?: string;
					customVendorsHeading?: string;
					privacyPolicy?: string;
				};
			};
			common?: { showingSelectedVendor?: string };
		} | undefined,
);

const iabVendors = computed(() => {
	if (!props.vendorData) {
		return [];
	}

	return Object.entries(props.vendorData.vendors).map(([id, vendor]) => ({
		id: Number(id),
		name: vendor.name,
		policyUrl: (vendor as { policyUrl?: string }).policyUrl ?? '',
		isCustom: false,
	}));
});

const customVendors = computed(() =>
	(props.customVendors ?? []).map((vendor) => ({
		id: vendor.id,
		name: vendor.name,
		policyUrl: vendor.privacyPolicyUrl,
		isCustom: true,
	})),
);

const filteredIabVendors = computed(() => {
	if (props.selectedVendorId !== null) {
		return iabVendors.value.filter(
			(vendor) => String(vendor.id) === String(props.selectedVendorId),
		);
	}

	const query = searchTerm.value.trim().toLowerCase();
	if (!query) {
		return iabVendors.value;
	}

	return iabVendors.value.filter((vendor) =>
		vendor.name.toLowerCase().includes(query),
	);
});

const filteredCustomVendors = computed(() => {
	if (props.selectedVendorId !== null) {
		return customVendors.value.filter(
			(vendor) => String(vendor.id) === String(props.selectedVendorId),
		);
	}

	const query = searchTerm.value.trim().toLowerCase();
	if (!query) {
		return customVendors.value;
	}

	return customVendors.value.filter((vendor) =>
		vendor.name.toLowerCase().includes(query),
	);
});

const totalCount = computed(
	() => iabVendors.value.length + customVendors.value.length,
);

const filteredCount = computed(
	() => filteredIabVendors.value.length + filteredCustomVendors.value.length,
);

function getVendorConsent(vendorId: IabVendorId) {
	return props.vendorConsents[String(vendorId)] ?? false;
}

watch(
	() => props.selectedVendorId,
	(vendorId) => {
		if (vendorId === null) {
			return;
		}

		window.setTimeout(() => {
			const element = document.getElementById(`vendor-${String(vendorId)}`);
			element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	},
);
</script>

<template>
	<div>
		<div :class="dialogStyles.vendorListHeader">
			<div :class="dialogStyles.searchContainer">
				<svg
					:class="dialogStyles.searchIcon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					v-model="searchTerm"
					type="search"
					:class="dialogStyles.searchInput"
					:placeholder="iabT?.preferenceCenter?.vendorList?.search"
					:disabled="selectedVendorId !== null"
				/>
			</div>
			<p :class="dialogStyles.vendorCount">
				{{
					(iabT?.preferenceCenter?.vendorList?.showingCount ?? '')
						.replace('{filtered}', String(filteredCount))
						.replace('{total}', String(totalCount))
				}}
			</p>
		</div>

		<div
			v-if="selectedVendorId !== null"
			:class="dialogStyles.selectedVendorBanner"
		>
			<p :class="dialogStyles.selectedVendorText">
				{{ iabT?.common?.showingSelectedVendor }}
			</p>
			<button
				type="button"
				:class="dialogStyles.clearSelectionButton"
				@click="emit('clearSelection')"
			>
				<svg
					:class="dialogStyles.clearIcon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<section v-if="filteredIabVendors.length > 0">
			<h3 :class="dialogStyles.vendorSectionHeading">
				{{ iabT?.preferenceCenter?.vendorList?.iabVendorsHeading }}
			</h3>
			<ul>
				<li
					v-for="vendor in filteredIabVendors"
					:id="`vendor-${String(vendor.id)}`"
					:key="String(vendor.id)"
					:class="dialogStyles.vendorListItem"
				>
					<div :class="dialogStyles.vendorListItemHeader">
						<div :class="dialogStyles.vendorListInfo">
							<p :class="dialogStyles.vendorListName">{{ vendor.name }}</p>
						</div>
						<div :class="dialogStyles.vendorConsentControl">
							<ConsentSwitch
								:model-value="getVendorConsent(vendor.id)"
								:class="dialogStyles.vendorConsentSwitch"
								@update:model-value="
									(value) => emit('vendorToggle', vendor.id, Boolean(value))
								"
							/>
						</div>
					</div>
					<div v-if="vendor.policyUrl" :class="dialogStyles.vendorListContent">
						<a
							:href="vendor.policyUrl"
							target="_blank"
							rel="noopener noreferrer"
							:class="dialogStyles.vendorListMetaText"
						>
							{{ iabT?.preferenceCenter?.vendorList?.privacyPolicy }}
						</a>
					</div>
				</li>
			</ul>
		</section>

		<section v-if="filteredCustomVendors.length > 0">
			<h3 :class="dialogStyles.vendorSectionHeading">
				{{ iabT?.preferenceCenter?.vendorList?.customVendorsHeading }}
			</h3>
			<ul>
				<li
					v-for="vendor in filteredCustomVendors"
					:id="`vendor-${String(vendor.id)}`"
					:key="String(vendor.id)"
					:class="dialogStyles.vendorListItem"
				>
					<div :class="dialogStyles.vendorListItemHeader">
						<div :class="dialogStyles.vendorListInfo">
							<p :class="dialogStyles.vendorListName">{{ vendor.name }}</p>
						</div>
						<div :class="dialogStyles.vendorConsentControl">
							<ConsentSwitch
								:model-value="getVendorConsent(vendor.id)"
								:class="dialogStyles.vendorConsentSwitch"
								@update:model-value="
									(value) => emit('vendorToggle', vendor.id, Boolean(value))
								"
							/>
						</div>
					</div>
					<div v-if="vendor.policyUrl" :class="dialogStyles.vendorListContent">
						<a
							:href="vendor.policyUrl"
							target="_blank"
							rel="noopener noreferrer"
							:class="dialogStyles.vendorListMetaText"
						>
							{{ iabT?.preferenceCenter?.vendorList?.privacyPolicy }}
						</a>
					</div>
				</li>
			</ul>
		</section>
	</div>
</template>
