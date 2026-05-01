<script lang="ts">
import type { Model } from 'c15t';
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let {
	options,
	models = undefined,
	uiSource = undefined,
}: {
	options: ConsentManagerOptions;
	models?: Model[];
	uiSource?: string;
} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner {models} {uiSource} />
</ConsentManagerProvider>
