<script setup lang="ts">
import {
	getDataDisabled,
	getNextTabValue,
	getTabState,
} from '@c15t/ui/primitives';
import { computed } from 'vue';

import { useTabsRootContext } from './context';

const props = withDefaults(defineProps<{ class?: string; value: string }>(), {
	class: undefined,
});

const root = useTabsRootContext();

const isSelected = computed(() => root.value.value === props.value);
const dataState = computed(() => getTabState(isSelected.value));
const dataDisabled = computed(() => getDataDisabled(root.disabled.value));
const triggerId = computed(() => `${root.baseId}-trigger-${props.value}`);
const contentId = computed(() => `${root.baseId}-content-${props.value}`);

const moveFocus = function moveFocus(nextValue: string) {
	root.setValue(nextValue);
	if (typeof document === 'undefined') {
		return;
	}
	document.getElementById(`${root.baseId}-trigger-${nextValue}`)?.focus();
};

const onKeydown = function onKeydown(event: KeyboardEvent) {
	if (typeof document === 'undefined') {
		return;
	}
	const triggerValues = Array.from(
		document.querySelectorAll<HTMLButtonElement>(
			`[data-slot="tabs-trigger"][id^="${root.baseId}-trigger-"]`
		)
	).map((button) => button.id.replace(`${root.baseId}-trigger-`, ''));

	const nextValue = getNextTabValue({
		currentValue: props.value,
		key: event.key,
		loop: root.loop.value,
		orientation: root.orientation.value,
		triggerValues,
	});

	if (
		nextValue !== props.value ||
		event.key === 'Home' ||
		event.key === 'End'
	) {
		event.preventDefault();
		moveFocus(nextValue);
	}
};
</script>

<template>
	<button
		:id="triggerId"
		type="button"
		role="tab"
		:tabindex="isSelected ? 0 : -1"
		:aria-controls="contentId"
		:aria-selected="isSelected"
		:class="props.class"
		data-slot="tabs-trigger"
		:data-state="dataState"
		:data-disabled="dataDisabled"
		:disabled="root.disabled.value"
		@click="root.setValue(props.value)"
		@keydown="onKeydown"
	>
		<slot />
	</button>
</template>
