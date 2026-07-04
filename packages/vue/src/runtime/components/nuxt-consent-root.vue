<script lang="ts" setup>
import { useStoredConsent, useConsentActiveUI, useConsentInit, useConsentConfig } from '../composables';
import { useFetch, useRequestHeaders, useHead } from '#imports';
import type { InitOutput } from '@c15t/schema/types';
import { computed, watchEffect } from 'vue';
import ConsentBanner from './consent-banner.vue';
import ConsentManager from './consent-manager.vue';
import IabConsentBanner from './iab-consent-banner.vue';
import IabConsentDialog from './iab-consent-dialog.vue';
import { deriveActiveConsentUi } from '@c15t/utils';

const props = defineProps<{
	region?: string
	country?: string
}>()

const config = useConsentConfig()
const init = useConsentInit()
const stored = useStoredConsent()
const activeUI = useConsentActiveUI()

const serverHeaders = useRequestHeaders()

const headers = computed(() => {
	const headers = {...serverHeaders}
	if (props.country) headers['x-c15t-country'] = props.country
	if (props.region) headers['x-c15t-region'] = props.region
	return headers
})

const { data } = await useFetch<InitOutput>('/init', {
	baseURL: config.value.backendURL,
	headers
})

watchEffect(() => {
	if (data.value) {
		init.value = data.value
		activeUI.value = deriveActiveConsentUi(stored.value, data.value)
	}
})

useHead(computed(() => {
	const style = Object.entries(config.value.tokens).map(([key, value]) => `--${key}: ${String(value)};`).join(' ');
	return style ? {
				style: [
					{
						innerHTML: `:root { ${style} }`,
						id: 'c15t-css-vars',
					},
				],
			}
		: {};
}));

</script>

<template>
	<IabConsentBanner v-if="data?.gvl" />
	<ConsentBanner v-else />
	<IabConsentDialog v-if="data?.gvl" />
	<ConsentManager v-else />
</template>
