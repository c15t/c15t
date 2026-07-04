<script lang="ts" setup>
import { getCurrentInstance, onMounted, watch } from 'vue';
import ConsentBanner from './consent-banner.vue';
import ConsentManager from './consent-manager.vue';
import IabConsentBanner from './iab-consent-banner.vue';
import IabConsentDialog from './iab-consent-dialog.vue';
import { useConsentConfig } from '../composables/config';
import { useConsent, useConsentActiveUI, useConsentInit } from '#imports';

const props = defineProps<{
	region?: string
	country?: string
	language?: string
}>()

const { consent: activeConsentUi } = useConsent()
const activeUI = useConsentActiveUI()
const init = useConsentInit()
const config = useConsentConfig()

async function fetchInit() {
	const headers: Record<string, string> = {}
	if (props.country) headers['x-c15t-country'] = props.country
	if (props.region) headers['x-c15t-region'] = props.region
	if (props.language) headers['x-c15t-language'] = props.language

	const response = await fetch(config.value.backendURL + '/init', { headers })
	const json = await response.json()
	init.value = json
	activeUI.value = activeConsentUi.value
	return json
}

onMounted(() => {
	for (const [key, value] of Object.entries(config.value.tokens ?? {})) {
		document.documentElement.style.setProperty(`--${key}`, String(value));
	}
});

watch(props, fetchInit)

const response = fetchInit()


// Workaround -- When wrapped in suspense, block rendering until fetch completes
const instance = getCurrentInstance()
if (instance && 'suspense' in instance && instance.suspense) {
	// @ts-expect-error - instance.asyncDep is not typed
  instance.asyncDep = response
}



</script>

<template>
	<IabConsentBanner v-if="init?.gvl && activeUI === 'banner'" />
	<IabConsentDialog v-else-if="init?.gvl && activeUI === 'manager'" />
	<ConsentBanner v-else-if="!init?.gvl && activeUI === 'banner'" />
	<ConsentManager v-else-if="!init?.gvl && activeUI === 'manager'" />
</template>
