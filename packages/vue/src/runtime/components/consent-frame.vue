<script setup lang="ts">
import { evaluateConsent } from '@c15t/core';
import type { AllConsentNames } from '@c15t/core';
import { computed } from 'vue';

import { useConsentSnapshot } from '../composables';

const props = defineProps<{ category: AllConsentNames }>();
const snapshot = useConsentSnapshot();
const allowed = computed(() =>
	evaluateConsent(
		{ category: props.category },
		snapshot.value,
		snapshot.value.evaluatedAt
	)
);
</script>

<template>
	<slot v-if="allowed" />
	<slot
		v-else
		name="placeholder"
		>Content requires permission.</slot
	>
</template>
