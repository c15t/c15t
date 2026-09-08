<script setup lang="ts">
import {
	useConsentActiveUI,
	useHasConsentUi,
	usePolicyRule,
} from '../composables';

const policy = usePolicyRule();
const activeUI = useConsentActiveUI();
const hasConsentUi = useHasConsentUi();
</script>

<template>
	<button
		v-if="hasConsentUi"
		type="button"
		data-testid="consent-dialog-link"
		:data-c15t-rights="policy.rights.join(' ')"
		@click="activeUI = 'manager'"
	>
		<slot>Privacy settings</slot>
	</button>
</template>
