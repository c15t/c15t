<script lang="ts" setup>
import { onMounted, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentKernelContext,
} from '../composables';
import { useConsentConfig } from '../composables/config';
import { useMounted } from '../composables/use-mounted';
import { applyRootOverrides } from '../root-overrides';
import {
	LazyConsentDialogTrigger,
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	prefetchConsentManager,
	prefetchIabConsentDialog,
} from './lazy-surfaces';
import ConsentBanner from './prompt.vue';

// The default slot renders after the surfaces, so a root that wraps the
// app the way a React provider does keeps the app.
const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const activeUI = useConsentActiveUI();
const init = useConsentInit();
const config = useConsentConfig();
const context = useConsentKernelContext();
// An `iab` policy without `iab` has no surface to show; the context reports
// the error instead.
const { iabUnavailable } = context;
// The trigger shows only after mount, so its chunk loads after mount too.
const mounted = useMounted();

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
	<template v-if="!iabUnavailable">
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
		<LazyConsentDialogTrigger v-if="config.showTrigger && mounted" />
	</template>
	<slot />
</template>
