<script setup lang="ts">
import { getTabPanelState } from '@c15t/ui/primitives';
import { computed } from 'vue';

import { useTabsRootContext } from './context';

const props = withDefaults(
	defineProps<{ class?: string; forceMount?: boolean; value: string }>(),
	{ class: undefined, forceMount: false }
);

const root = useTabsRootContext();

const isSelected = computed(() => root.value.value === props.value);
const dataState = computed(() => getTabPanelState(isSelected.value));
const contentId = computed(() => `${root.baseId}-content-${props.value}`);
const triggerId = computed(() => `${root.baseId}-trigger-${props.value}`);
</script>

<template>
	<div
		v-if="props.forceMount || isSelected"
		:id="contentId"
		role="tabpanel"
		:tabindex="0"
		:hidden="!isSelected"
		:aria-labelledby="triggerId"
		:class="props.class"
		data-slot="tabs-content"
		:data-state="dataState"
	>
		<slot />
	</div>
</template>
