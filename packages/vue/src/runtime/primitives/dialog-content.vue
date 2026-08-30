<script setup lang="ts">
/**
 * DialogContent (Reka-compatible surface, RFC 0003).
 * `role="dialog"` container with Escape-to-close and shared focus trap +
 * restore when modal.
 */
import { getDialogState, isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';

import { dialogContextKey } from './keys';
import { useFocusTrap } from './use-focus-trap';

const dialog = inject(dialogContextKey);
const root = ref<HTMLElement | null>(null);

const isModal = () => dialog?.modal() ?? false;
useFocusTrap(root, () => isModal() && (dialog?.open() ?? false));

function onKeydown(event: KeyboardEvent) {
	if (isDialogDismissKey(event.key)) {
		event.preventDefault();
		dialog?.close();
	}
}

onMounted(() => {
	document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
	document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
	<div
		ref="root"
		role="dialog"
		:aria-modal="isModal() ? 'true' : undefined"
		:data-state="getDialogState(dialog?.open() ?? true)"
		tabindex="-1"
		@keydown="onKeydown"
	>
		<slot />
	</div>
</template>
