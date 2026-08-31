<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { useHead } from '#imports';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentConfig,
	useConsentKernel,
} from '../composables';
import ConsentBanner from './consent-banner.vue';
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
}>();

const config = useConsentConfig();
const init = useConsentInit();
const activeUI = useConsentActiveUI();
const kernel = useConsentKernel();

watch(
	() => [props.country, props.region] as const,
	([country, region]) => {
		if (!(country || region)) {
			return;
		}
		kernel.set.overrides({ country, region });
		void kernel.commands.init();
	},
	{ immediate: true }
);

useHead(
	computed(() => {
		const style = Object.entries(config.value.tokens ?? {})
			.map(([key, value]) => `--${key}: ${String(value)};`)
			.join(' ');
		return style
			? {
					style: [
						{
							id: 'c15t-css-vars',
							innerHTML: `:root { ${style} }`,
						},
					],
				}
			: {};
	})
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
			if (init.value?.gvl) {
				iabDialogNeeded.value = true;
			} else {
				managerNeeded.value = true;
			}
		}
	},
	{ immediate: true }
);
onMounted(() => {
	if (init.value?.gvl) {
		prefetchIabConsentDialog();
	} else {
		prefetchConsentManager();
	}
});
</script>

<template>
	<LazyIabConsentBanner v-if="init?.gvl" />
	<ConsentBanner v-else />
	<LazyIabConsentDialog v-if="init?.gvl && iabDialogNeeded" />
	<LazyConsentManager v-else-if="!init?.gvl && managerNeeded" />
</template>
