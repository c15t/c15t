<script lang="ts" setup>
import { onMounted, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentKernel,
} from '../composables';
import { useConsentConfig } from '../composables/config';
import ConsentBanner from './consent-banner.vue';
import ConsentDialogTrigger from './consent-dialog-trigger.vue';
import {
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	prefetchConsentManager,
	prefetchIabConsentDialog,
} from './lazy-surfaces';

const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const activeUI = useConsentActiveUI();
const init = useConsentInit();
const config = useConsentConfig();
const kernel = useConsentKernel();

onMounted(() => {
	for (const [key, value] of Object.entries(config.value.tokens ?? {})) {
		document.documentElement.style.setProperty(`--${key}`, String(value));
	}
	// Warm the dialog chunk during idle so the first open is instant.
	if (init.value?.gvl) {
		prefetchIabConsentDialog();
	} else {
		prefetchConsentManager();
	}
});

watch(
	() => [props.country, props.region, props.language] as const,
	([country, region, language]) => {
		if (!(country || region || language)) {
			return;
		}
		kernel.set.overrides({ country, language, region });
		void kernel.commands.init();
	},
	{ immediate: true }
);
</script>

<template>
	<LazyIabConsentBanner v-if="init?.gvl && activeUI === 'banner'" />
	<LazyIabConsentDialog v-else-if="init?.gvl && activeUI === 'manager'" />
	<ConsentBanner v-else-if="!init?.gvl && activeUI === 'banner'" />
	<LazyConsentManager v-else-if="!init?.gvl && activeUI === 'manager'" />
	<ConsentDialogTrigger v-if="config.showTrigger" />
</template>
