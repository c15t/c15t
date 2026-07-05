<script
	setup
	lang="ts"
>
import dialogStyles from '@c15t/ui/styles/v3/consent-dialog.module.css';
import { computed } from 'vue';
import { useConsentConfig, useConsentInit } from '#c15t/composables';

defineProps<{
	context: 'banner' | 'dialog' | 'manager' | 'iab-banner' | 'iab-dialog';
}>();

const init = useConsentInit();
const config = useConsentConfig();

const branding = computed(() => init.value?.branding ?? 'c15t');

const href = computed(() =>
	branding.value === 'inth' || branding.value === 'consent'
		? 'https://inth.com'
		: 'https://c15t.com'
);
</script>

<template>
	<a
		v-bind="config.components?.tag?.[context]"
		:href="href"
		target="_blank"
		rel="noopener noreferrer"
		data-testid="consent-tag"
		:class="dialogStyles.brandingTag"
		:data-context="context"
	>
		<slot>c15t</slot>
	</a>
</template>
