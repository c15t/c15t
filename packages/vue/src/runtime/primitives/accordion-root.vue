<script setup lang="ts">
/**
 * AccordionRoot (Reka-compatible surface, RFC 0003). Single-open,
 * collapsible — the only mode the consent manager uses. Content stays
 * mounted (`unmount-on-hide=false` semantics) so CSS state animations work.
 */
import { provide, ref } from 'vue';
import { accordionContextKey } from './keys';

withDefaults(
	defineProps<{
		type?: 'single';
		collapsible?: boolean;
		unmountOnHide?: boolean;
	}>(),
	{ type: 'single', collapsible: true, unmountOnHide: false }
);

const active = ref<string | null>(null);

provide(accordionContextKey, {
	isOpen: (value: string) => active.value === value,
	toggle: (value: string) => {
		active.value = active.value === value ? null : value;
	},
});
</script>

<template>
	<div>
		<slot />
	</div>
</template>
