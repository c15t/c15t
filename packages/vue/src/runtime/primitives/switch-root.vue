<script setup lang="ts">
/**
 * SwitchRoot (Reka-compatible surface, RFC 0003).
 * `role="switch"` button with the same `data-state`/`data-disabled`
 * contract the CSS targets. State conventions come from the shared,
 * framework-agnostic helpers in @c15t/ui.
 */
import { provide } from 'vue';

import { switchCheckedKey } from './keys';

const props = defineProps<{
	disabled?: boolean;
}>();

const model = defineModel<boolean>({ default: false });
provide(switchCheckedKey, model);

const toggle = function toggle() {
	if (props.disabled) {
		return;
	}
	model.value = !model.value;
};
</script>

<template>
	<button
		type="button"
		role="switch"
		:aria-checked="model"
		data-slot="switch"
		:data-state="model ? 'checked' : 'unchecked'"
		:data-disabled="props.disabled ? '' : undefined"
		:disabled="props.disabled"
		@click="toggle"
		@keydown.enter.prevent="toggle"
		@keydown.space.prevent="toggle"
	>
		<slot />
	</button>
</template>
