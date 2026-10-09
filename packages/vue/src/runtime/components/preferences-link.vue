<script setup lang="ts">
import { computed } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useHasConsentPreferences,
	usePolicyRule,
} from '../composables';
import { useSurfaceTranslations } from '../composables/use-surface-translations';
import { useIdleDialogPrefetch, warmConsentDialog } from './lazy-surfaces';

const policy = usePolicyRule();
const activeUI = useConsentActiveUI();
const hasConsentUi = useHasConsentPreferences();
const translations = useSurfaceTranslations();
const init = useConsentInit();
// Load the dialog in idle time while the link shows, and at once on hover,
// focus or touch.
const isIABPolicy = () => Boolean(init.value?.gvl || init.value?.gvlReference);
useIdleDialogPrefetch(() => hasConsentUi.value, isIABPolicy);
const warmDialog = () => warmConsentDialog(isIABPolicy());
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
		@pointerenter="warmDialog"
		@focus="warmDialog"
	>
		<slot>{{ label }}</slot>
	</button>
</template>
