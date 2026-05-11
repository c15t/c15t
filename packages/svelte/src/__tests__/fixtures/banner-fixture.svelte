<script lang="ts">
import type { Model } from 'c15t';
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let {
	options,
	models = undefined,
	uiSource = undefined,
}: {
	options: ConsentProviderOptions;
	models?: Model[];
	uiSource?: string;
} = $props();
</script>

<ConsentProvider {options}>
	<ConsentBanner {models} {uiSource} />
</ConsentProvider>
