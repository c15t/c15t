<script setup lang="ts">
/**
 * DialogRoot (Reka-compatible surface, RFC 0003). Renders no DOM; provides
 * open/modal state and a close command to portal/overlay/content.
 */
import { provide } from 'vue';

import { dialogContextKey } from './keys';

const props = withDefaults(
	defineProps<{
		open?: boolean;
		modal?: boolean;
	}>(),
	{ open: false, modal: true }
);

const emit = defineEmits<{ 'update:open': [open: boolean] }>();

provide(dialogContextKey, {
	open: () => props.open,
	modal: () => props.modal,
	close: () => emit('update:open', false),
});
</script>

<template>
	<slot />
</template>
