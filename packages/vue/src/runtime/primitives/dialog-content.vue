<script setup lang="ts">
/**
 * DialogContent (Reka-compatible surface, RFC 0003).
 * `role="dialog"` container with Escape-to-close, focus trap + restore when
 * modal, and body scroll lock while open — the behaviors the consent
 * manager relied on from Reka, ported from the audited React dialog.
 */
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { dialogContextKey } from './keys';
import { useFocusTrap } from './use-focus-trap';

const dialog = inject(dialogContextKey);
const root = ref<HTMLElement | null>(null);

const isModal = () => dialog?.modal() ?? false;
const { onKeydown: onTrapKeydown } = useFocusTrap(
	root,
	() => isModal() && (dialog?.open() ?? false),
	{ loop: () => true }
);

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		dialog?.close();
		return;
	}
	onTrapKeydown(event);
}

// Body scroll lock while mounted (content only mounts while open).
let previousOverflow: string | null = null;
onMounted(() => {
	if (isModal()) {
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
});
onBeforeUnmount(() => {
	if (previousOverflow !== null) {
		document.body.style.overflow = previousOverflow;
		previousOverflow = null;
	}
});
</script>

<template>
	<div
		ref="root"
		role="dialog"
		:aria-modal="isModal() ? 'true' : undefined"
		data-state="open"
		tabindex="-1"
		@keydown="onKeydown"
	>
		<slot />
	</div>
</template>
