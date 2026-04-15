<script lang="ts">
import type { Model } from 'c15t';
import ConsentBanner from '../../components/consent-banner.svelte';
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../types';

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
