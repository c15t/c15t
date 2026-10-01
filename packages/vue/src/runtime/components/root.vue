<script lang="ts" setup>
import { onMounted, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentKernelContext,
} from '../composables';
import { useConsentConfig } from '../composables/config';
import { applyRootOverrides } from '../root-overrides';
import {
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	prefetchConsentManager,
	prefetchIabConsentDialog,
} from './lazy-surfaces';
import ConsentDialogTrigger from './panel-trigger.vue';
import ConsentBanner from './prompt.vue';

const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const activeUI = useConsentActiveUI();
const init = useConsentInit();
const config = useConsentConfig();
const context = useConsentKernelContext();

onMounted(() => {
	// Warm the dialog chunk during idle so the first open is instant.
	if (init.value?.gvl || init.value?.gvlReference) {
		prefetchIabConsentDialog();
	} else {
		prefetchConsentManager();
	}
});

watch(
	() => ({
		country: props.country,
		language: props.language,
		region: props.region,
	}),
	(next, previous) => applyRootOverrides(context, next, previous),
	{ immediate: true }
);
</script>

<template>
	<LazyIabConsentBanner
		v-if="(init?.gvl || init?.gvlReference) && activeUI === 'banner'"
	/>
	<LazyIabConsentDialog
		v-else-if="(init?.gvl || init?.gvlReference) && activeUI === 'manager'"
	/>
	<ConsentBanner
		v-else-if="!(init?.gvl || init?.gvlReference) && activeUI === 'banner'"
	/>
	<LazyConsentManager
		v-else-if="!(init?.gvl || init?.gvlReference) && activeUI === 'manager'"
	/>
	<ConsentDialogTrigger v-if="config.showTrigger" />
</template>
