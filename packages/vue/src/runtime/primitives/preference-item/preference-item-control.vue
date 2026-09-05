<script setup lang="ts">
import { PREFERENCE_ITEM_SLOTS } from '@c15t/ui/primitives';
import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
import { computed } from 'vue';

import { usePreferenceItemContext } from './context';

const props = withDefaults(defineProps<{ class?: string }>(), {
	class: undefined,
});

const context = usePreferenceItemContext();
const variants = preferenceItemVariants();

const resolvedClass = computed(() =>
	context.noStyle.value ? props.class : variants.control({ class: props.class })
);
</script>

<template>
	<div
		:class="resolvedClass"
		:data-slot="PREFERENCE_ITEM_SLOTS.control"
	>
		<slot />
	</div>
</template>
