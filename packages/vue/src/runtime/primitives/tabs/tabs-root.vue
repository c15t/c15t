<script setup lang="ts">
import { getDataDisabled } from '@c15t/ui/primitives';
import type { TabsOrientation } from '@c15t/ui/primitives';
import { computed, ref, useId, watch } from 'vue';

import { provideTabsRootContext } from './context';

const props = withDefaults(
	defineProps<{
		class?: string;
		disabled?: boolean;
		loop?: boolean;
		orientation?: TabsOrientation;
		value?: string | null;
	}>(),
	{
		class: undefined,
		disabled: false,
		loop: true,
		orientation: 'horizontal',
		value: null,
	}
);

const emit = defineEmits<{ 'update:value': [value: string] }>();

const componentId = useId();
const baseId = `c15t-tabs-${componentId}`;
const value = ref<string | null>(props.value);
watch(
	() => props.value,
	(next) => {
		value.value = next;
	}
);

const disabled = computed(() => props.disabled);
const loop = computed(() => props.loop);
const orientation = computed(() => props.orientation);
const dataDisabled = computed(() => getDataDisabled(disabled.value));

provideTabsRootContext({
	baseId,
	disabled,
	loop,
	orientation,
	setValue(next: string) {
		if (disabled.value) {
			return;
		}
		value.value = next;
		emit('update:value', next);
	},
	value,
});
</script>

<template>
	<div
		:class="props.class"
		data-slot="tabs-root"
		:data-orientation="orientation"
		:data-disabled="dataDisabled"
	>
		<slot />
	</div>
</template>
