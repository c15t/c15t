<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentConfig,
	useConsentKernelContext,
} from '../composables';
import { useMounted } from '../composables/use-mounted';
import { applyRootOverrides } from '../root-overrides';
import {
	LazyConsentBanner as ConsentBanner,
	LazyConsentDialogTrigger,
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	prefetchConsentManager,
	prefetchIabConsentDialog,
} from './lazy-surfaces';

// The default slot renders after the surfaces, so a root that wraps the
// app the way a React provider does keeps the app.
const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const config = useConsentConfig();
const init = useConsentInit();
const activeUI = useConsentActiveUI();
const context = useConsentKernelContext();
// An `iab` policy without `iab` has no surface to show; the context reports
// the error instead.
const { iabUnavailable } = context;
// The trigger shows only after mount, so its chunk loads after mount too.
const mounted = useMounted();

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
	<template v-if="!iabUnavailable">
		<LazyIabConsentBanner v-if="init?.gvl || init?.gvlReference" />
		<ConsentBanner v-else />
		<LazyIabConsentDialog
			v-if="(init?.gvl || init?.gvlReference) && iabDialogNeeded"
		/>
		<LazyConsentManager
			v-else-if="!(init?.gvl || init?.gvlReference) && managerNeeded"
		/>
		<LazyConsentDialogTrigger v-if="config.showTrigger && mounted" />
	</template>
	<slot />
</template>
