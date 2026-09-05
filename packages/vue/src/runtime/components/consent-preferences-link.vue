<script setup lang="ts">
import { useConsentActiveUI, usePolicyRule } from '../composables';

const policy = usePolicyRule();
const activeUI = useConsentActiveUI();
</script>

<template>
	<button
		type="button"
		data-testid="consent-dialog-link"
		:data-c15t-rights="policy.rights.join(' ')"
		@click="activeUI = 'manager'"
	>
		<slot>Privacy settings</slot>
	</button>
</template>
