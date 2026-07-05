<script setup lang="ts">
import { inject } from 'vue';
import { dialogContextKey } from './keys';

const dialog = inject(dialogContextKey);
</script>

<template>
	<div
		aria-hidden="true"
		data-state="open"
		@click="dialog?.close()"
	>
		<slot />
	</div>
</template>
