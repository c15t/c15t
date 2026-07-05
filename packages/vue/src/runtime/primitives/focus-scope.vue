<script setup lang="ts">
/**
 * FocusScope (Reka-compatible surface, RFC 0003).
 * Renders a plain div; when `trapped`, Tab focus cycles within and focus
 * restores on release — same contract the consent surfaces used from Reka.
 */
import { ref } from 'vue';
import { useFocusTrap } from './use-focus-trap';

const props = withDefaults(
	defineProps<{
		trapped?: boolean;
		loop?: boolean;
	}>(),
	{ trapped: false, loop: false }
);

const root = ref<HTMLElement | null>(null);
const { onKeydown } = useFocusTrap(root, () => props.trapped, {
	loop: () => props.loop,
});
</script>

<template>
	<div
		ref="root"
		:tabindex="props.trapped ? -1 : undefined"
		@keydown="onKeydown"
	>
		<slot />
	</div>
</template>
