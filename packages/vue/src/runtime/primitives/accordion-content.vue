<script setup lang="ts">
import { inject } from 'vue';
import { accordionItemContextKey } from './keys';

const item = inject(accordionItemContextKey);
</script>

<template>
	<div
		:data-state="item?.open() ? 'open' : 'closed'"
		:inert="item?.open() ? undefined : true"
		:aria-hidden="item?.open() ? undefined : 'true'"
		:role="item?.open() ? 'region' : undefined"
	>
		<slot />
	</div>
</template>
