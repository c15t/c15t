<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentConfig,
	useConsentKernelContext,
} from '../composables';
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

const config = useConsentConfig();
const init = useConsentInit();
const activeUI = useConsentActiveUI();
const context = useConsentKernelContext();

watch(
	() => ({
		country: props.country,
		language: props.language,
		region: props.region,
	}),
	(next, previous) => applyRootOverrides(context, next, previous),
	{ immediate: true }
);

// Mount dialog surfaces once first needed, then keep them mounted (close
// animations, repeat opens). Chunks are prefetched on idle so the first
// open never pays network+parse.
const managerNeeded = ref(false);
const iabDialogNeeded = ref(false);
watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') {
			if (init.value?.gvl || init.value?.gvlReference) {
				iabDialogNeeded.value = true;
			} else {
				managerNeeded.value = true;
			}
		}
	},
	{ immediate: true }
);
onMounted(() => {
	if (init.value?.gvl || init.value?.gvlReference) {
		prefetchIabConsentDialog();
	} else {
		prefetchConsentManager();
	}
});
</script>

<template>
	<LazyIabConsentBanner v-if="init?.gvl || init?.gvlReference" />
	<ConsentBanner v-else />
	<LazyIabConsentDialog
		v-if="(init?.gvl || init?.gvlReference) && iabDialogNeeded"
	/>
	<LazyConsentManager
		v-else-if="!(init?.gvl || init?.gvlReference) && managerNeeded"
	/>
	<ConsentDialogTrigger v-if="config.showTrigger" />
</template>
