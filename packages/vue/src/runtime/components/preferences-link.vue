<script setup lang="ts">
import { computed } from 'vue';

import {
	useConsentActiveUI,
	useHasConsentPreferences,
	usePolicyRule,
} from '../composables';
import { useSurfaceTranslations } from '../composables/use-surface-translations';

const policy = usePolicyRule();
const activeUI = useConsentActiveUI();
const hasConsentUi = useHasConsentPreferences();
const translations = useSurfaceTranslations();
// Names what the link opens, in the visitor's language.
const label = computed(
	() =>
		translations.value.bundle?.consentManagerDialog?.title ??
		translations.value.english.consentManagerDialog.title
);
</script>

<template>
	<button
		v-if="hasConsentUi"
		type="button"
		data-testid="consent-dialog-link"
		:data-c15t-rights="policy.rights.join(' ')"
		@click="activeUI = 'manager'"
	>
		<slot>{{ label }}</slot>
	</button>
</template>
