<script setup lang="ts">
import {
	getDataDisabled,
	getPreferenceItemState,
	PREFERENCE_ITEM_SLOTS,
} from '@c15t/ui/primitives';
import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
import { computed } from 'vue';

import { usePreferenceItemContext } from './context';

const props = withDefaults(defineProps<{ class?: string }>(), {
	class: undefined,
});

const context = usePreferenceItemContext();
const variants = preferenceItemVariants();

const triggerClass = computed(() =>
	context.noStyle.value ? props.class : variants.trigger({ class: props.class })
);
const dataState = computed(() => getPreferenceItemState(context.open.value));
const dataDisabled = computed(() => getDataDisabled(context.disabled.value));
</script>

<template>
	<button
		:id="context.triggerId"
		type="button"
		:aria-controls="context.contentId"
		:aria-disabled="context.disabled.value || undefined"
		:aria-expanded="context.open.value"
		:class="triggerClass"
		:data-slot="PREFERENCE_ITEM_SLOTS.trigger"
		:data-state="dataState"
		:data-disabled="dataDisabled"
		:disabled="context.disabled.value"
		@click="context.toggle()"
	>
		<slot />
	</button>
</template>
