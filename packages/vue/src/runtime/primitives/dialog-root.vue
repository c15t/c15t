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
	{ modal: true, open: false }
);

const emit = defineEmits<{ 'update:open': [open: boolean] }>();

provide(dialogContextKey, {
	close: () => emit('update:open', false),
	modal: () => props.modal,
	open: () => props.open,
});
</script>

<template>
	<slot />
</template>
