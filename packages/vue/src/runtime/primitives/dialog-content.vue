<script setup lang="ts">
/**
 * DialogContent (Reka-compatible surface).
 * `role="dialog"` container with Escape-to-close and shared focus trap +
 * restore when modal.
 */
import { getDialogState, onDialogDismiss } from '@c15t/ui/primitives/dialog';
import { inject, ref, watchEffect } from 'vue';

import { dialogContextKey } from './keys';
import { useFocusTrap } from './use-focus-trap';

const dialog = inject(dialogContextKey);
const root = ref<HTMLElement | null>(null);

const isModal = () => dialog?.modal() ?? false;
useFocusTrap(root, () => isModal() && (dialog?.open() ?? false), {
	initialFocus: 'first-tabbable',
});

// One document listener handles Escape wherever focus is, and closes only
// the dialog on top when several are open.
watchEffect((onCleanup) => {
	if (root.value && (dialog?.open() ?? true)) {
		onCleanup(onDialogDismiss(root.value, () => dialog?.close()));
	}
});
</script>

<template>
	<div
		ref="root"
		role="dialog"
		:aria-modal="isModal() ? 'true' : undefined"
		:data-state="getDialogState(dialog?.open() ?? true)"
		tabindex="-1"
	>
		<slot />
	</div>
</template>
