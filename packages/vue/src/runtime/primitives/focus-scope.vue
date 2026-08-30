<script setup lang="ts">
/**
 * FocusScope (Reka-compatible surface, RFC 0003).
 * Renders a plain div; when `trapped`, Tab focus cycles within (always
 * wrapping at the boundaries, via the shared `setupFocusTrap`) and focus
 * restores on release — same contract the consent surfaces used from Reka.
 */
import { ref } from 'vue';

import { useFocusTrap } from './use-focus-trap';

const props = withDefaults(
	defineProps<{
		trapped?: boolean;
	}>(),
	{ trapped: false }
);

const root = ref<HTMLElement | null>(null);
useFocusTrap(root, () => props.trapped);
</script>

<template>
	<div
		ref="root"
		:tabindex="props.trapped ? -1 : undefined"
	>
		<slot />
	</div>
</template>
