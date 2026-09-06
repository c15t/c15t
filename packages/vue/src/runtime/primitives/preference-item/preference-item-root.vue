<script setup lang="ts">
import {
	getDataDisabled,
	getPreferenceItemState,
	PREFERENCE_ITEM_SLOTS,
	togglePreferenceItemValue,
} from '@c15t/ui/primitives';
import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
import { computed, ref, useId, watch } from 'vue';

import { providePreferenceItemContext } from './context';

const props = withDefaults(
	defineProps<{
		class?: string;
		disabled?: boolean;
		noStyle?: boolean;
		open?: boolean;
	}>(),
	{ class: undefined, disabled: false, noStyle: undefined, open: false }
);

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const variants = preferenceItemVariants();
const componentId = useId();
const contentId = `c15t-preference-item-content-${componentId}`;
const triggerId = `c15t-preference-item-trigger-${componentId}`;

const open = ref(props.open);
watch(
	() => props.open,
	(next) => {
		open.value = next;
	}
);

const noStyle = computed(() => props.noStyle ?? false);
const disabled = computed(() => props.disabled);

const rootClass = computed(() =>
	noStyle.value ? props.class : variants.root({ class: props.class })
);
const dataState = computed(() => getPreferenceItemState(open.value));
const dataDisabled = computed(() => getDataDisabled(disabled.value));

providePreferenceItemContext({
	contentId,
	disabled,
	noStyle,
	open,
	toggle() {
		if (disabled.value) {
			return;
		}
		open.value = togglePreferenceItemValue(open.value);
		emit('update:open', open.value);
	},
	triggerId,
});
</script>

<template>
	<div
		:class="rootClass"
		:data-slot="PREFERENCE_ITEM_SLOTS.root"
		:data-state="dataState"
		:data-disabled="dataDisabled"
	>
		<slot />
	</div>
</template>
