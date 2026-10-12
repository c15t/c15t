<script setup lang="ts">
import { inject, provide } from 'vue';

import { accordionContextKey, accordionItemContextKey } from './keys';

const props = defineProps<{
	value: string;
	unmountOnHide?: boolean;
}>();

const accordion = inject(accordionContextKey);

provide(accordionItemContextKey, {
	open: () => accordion?.isOpen(props.value) ?? false,
	toggle: () => accordion?.toggle(props.value),
	value: props.value,
});
</script>

<template>
	<div :data-state="accordion?.isOpen(props.value) ? 'open' : 'closed'">
		<slot />
	</div>
</template>
