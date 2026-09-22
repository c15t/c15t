<script setup lang="ts">
/**
 * Vendor cards nested inside one category's accordion content. Each is a
 * collapsed card of its own that opens for its description and privacy
 * policy link, with a switch on the header. The markup, class names,
 * `data-slot`s and ARIA attributes mirror the React `ConsentWidgetVendorList`
 * so the cross-framework parity runner sees identical DOM.
 */
import type { AllConsentNames, ResolvedVendor } from '@c15t/core';
import vendorListStyles from '@c15t/ui/styles/components/vendor-list';
import {
	preferenceItemVariants,
	switchVariants,
} from '@c15t/ui/styles/primitives';
import { computed, ref, useId } from 'vue';

import { useConsentConfig, useConsentInit } from '../composables';

const props = defineProps<{
	/** Category whose vendors to list. */
	category: AllConsentNames;
	/** Whether the category is on in the draft; off disables the switches. */
	categoryOn: boolean;
	/** The vendors listed under this category, in declared order. */
	vendors: readonly ResolvedVendor[];
	/** Granted flag per vendor from the draft. */
	granted: Readonly<Record<string, boolean>>;
	/** Drop the built-in styling. */
	noStyle: boolean;
}>();

const emit = defineEmits<{
	toggle: [vendorId: string, granted: boolean];
}>();

const config = useConsentConfig();
const init = useConsentInit();
const pi = preferenceItemVariants();
const sw = switchVariants({ size: 'small' });
/** Two surfaces can list the same vendor at once, so ids are scoped per instance. */
const uid = useId();

const DEFAULT_COPY = {
	disabledByCategory: 'Turn on this category to choose vendors.',
	privacyPolicy: 'Privacy policy',
	switchLabel: 'Allow {vendor}',
	title: 'Vendors ({count})',
};

const copy = computed(() => ({
	...DEFAULT_COPY,
	...init.value?.translations?.translations?.consentManagerDialog?.vendors,
}));

const styles = computed(() => (props.noStyle ? undefined : vendorListStyles));
const title = computed(() =>
	copy.value.title.replace('{count}', String(props.vendors.length))
);

/** Open state per vendor card; each card opens on its own. */
const openItems = ref<Record<string, boolean>>({});
const isOpen = (id: string) => openItems.value[id] ?? false;
const toggleOpen = (id: string) => {
	openItems.value = { ...openItems.value, [id]: !isOpen(id) };
};

const vendorName = (vendor: ResolvedVendor) => vendor.name ?? vendor.id;
const hasDetails = (vendor: ResolvedVendor) =>
	Boolean(vendor.description || vendor.privacyPolicyUrl);
// A `disabled` vendor is presented without a toggle: the kernel ignores
// grants for it, so a switch would only mislead.
const toggleable = (vendor: ResolvedVendor) => vendor.disabled !== true;
const isChecked = (vendor: ResolvedVendor) => props.granted[vendor.id] ?? true;

const labelId = (vendor: ResolvedVendor) =>
	`${uid}vendor-${props.category}-${vendor.id}`;
const triggerId = (index: number) =>
	`c15t-preference-item-trigger-${uid}-${index}`;
const contentId = (index: number) =>
	`c15t-preference-item-content-${uid}-${index}`;
</script>

<template>
	<section
		v-bind="config.components?.['vendor-list']?.root"
		:class="styles?.root"
		:aria-label="title"
		:data-testid="`consent-widget-vendor-list-${category}`"
	>
		<p
			v-if="!categoryOn"
			:class="styles?.hint"
			:data-testid="`consent-widget-vendor-hint-${category}`"
		>
			{{ copy.disabledByCategory }}
		</p>
		<div
			v-for="(vendor, index) in vendors"
			:key="vendor.id"
			v-bind="config.components?.['vendor-list']?.item"
			:class="pi.root({ class: styles?.item })"
			data-slot="preference-item-root"
			:data-state="isOpen(vendor.id) ? 'open' : 'closed'"
			:data-disabled="hasDetails(vendor) ? undefined : ''"
			:data-testid="`consent-widget-vendor-item-${category}-${vendor.id}`"
		>
			<div
				v-bind="config.components?.['vendor-list']?.header"
				:class="styles?.header"
			>
				<button
					:id="triggerId(index)"
					type="button"
					:aria-controls="contentId(index)"
					:aria-expanded="isOpen(vendor.id) ? 'true' : 'false'"
					:aria-disabled="hasDetails(vendor) ? undefined : 'true'"
					v-bind="config.components?.['vendor-list']?.trigger"
					:class="pi.trigger({ class: styles?.trigger })"
					data-slot="preference-item-trigger"
					:data-state="isOpen(vendor.id) ? 'open' : 'closed'"
					:data-disabled="hasDetails(vendor) ? undefined : ''"
					:data-testid="`consent-widget-vendor-trigger-${category}-${vendor.id}`"
					:disabled="!hasDetails(vendor)"
					@click="toggleOpen(vendor.id)"
				>
					<div
						:class="pi.leading({ class: styles?.arrow })"
						data-slot="preference-item-leading"
					>
						<svg
							aria-hidden="true"
							fill="none"
							focusable="false"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<title>{{ isOpen(vendor.id) ? 'Close' : 'Open' }}</title>
							<path :d="isOpen(vendor.id) ? 'M5 12h14' : 'M5 12h14M12 5v14'" />
						</svg>
					</div>
					<span
						:id="labelId(vendor)"
						v-bind="config.components?.['vendor-list']?.name"
						:class="styles?.name"
						:data-testid="`consent-widget-vendor-name-${category}-${vendor.id}`"
					>
						{{ vendorName(vendor) }}
					</span>
				</button>
				<div
					v-if="toggleable(vendor)"
					v-bind="config.components?.['vendor-list']?.control"
					:class="styles?.control"
				>
					<button
						type="button"
						role="switch"
						:aria-checked="isChecked(vendor) ? 'true' : 'false'"
						:aria-label="
							copy.switchLabel.replace('{vendor}', vendorName(vendor))
						"
						:aria-describedby="labelId(vendor)"
						:class="noStyle ? undefined : sw.root()"
						:data-disabled="categoryOn ? undefined : ''"
						data-slot="switch"
						:data-state="isChecked(vendor) ? 'checked' : 'unchecked'"
						:data-testid="`consent-widget-vendor-switch-${category}-${vendor.id}`"
						:disabled="!categoryOn"
						@click="emit('toggle', vendor.id, !isChecked(vendor))"
					>
						<span
							:class="noStyle ? undefined : sw.track({ disabled: !categoryOn })"
							data-slot="switch-track"
						>
							<span
								:class="
									noStyle ? undefined : sw.thumb({ disabled: !categoryOn })
								"
								data-slot="switch-thumb"
							/>
						</span>
					</button>
				</div>
			</div>
			<div
				v-if="hasDetails(vendor)"
				:id="contentId(index)"
				:aria-hidden="isOpen(vendor.id) ? 'false' : 'true'"
				:aria-labelledby="triggerId(index)"
				v-bind="config.components?.['vendor-list']?.content"
				:class="pi.content({ class: styles?.content })"
				data-slot="preference-item-content"
				:data-state="isOpen(vendor.id) ? 'open' : 'closed'"
				:data-testid="`consent-widget-vendor-content-${category}-${vendor.id}`"
				:inert="!isOpen(vendor.id)"
			>
				<div
					:class="pi.contentViewport()"
					data-slot="preference-item-content-viewport"
				>
					<div
						:class="pi.contentInner({ class: styles?.contentInner })"
						data-slot="preference-item-content-inner"
					>
						<p
							v-if="vendor.description"
							v-bind="config.components?.['vendor-list']?.description"
							:class="styles?.description"
						>
							{{ vendor.description }}
						</p>
						<a
							v-if="vendor.privacyPolicyUrl"
							v-bind="config.components?.['vendor-list']?.link"
							:class="styles?.link"
							:href="vendor.privacyPolicyUrl"
							rel="noopener noreferrer"
							target="_blank"
						>
							{{ copy.privacyPolicy }}
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
