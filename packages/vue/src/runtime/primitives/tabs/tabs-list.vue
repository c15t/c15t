<script setup lang="ts">
import { getDataDisabled } from '@c15t/ui/primitives';
import { computed } from 'vue';

import { useTabsRootContext } from './context';

const props = withDefaults(defineProps<{ class?: string }>(), {
	class: undefined,
});

const root = useTabsRootContext();
const dataDisabled = computed(() => getDataDisabled(root.disabled.value));
</script>

<template>
	<div
		role="tablist"
		:aria-orientation="root.orientation.value"
		:class="props.class"
		data-slot="tabs-list"
		:data-orientation="root.orientation.value"
		:data-disabled="dataDisabled"
	>
		<slot />
	</div>
</template>
