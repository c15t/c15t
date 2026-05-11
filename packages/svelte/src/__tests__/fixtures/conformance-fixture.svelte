<script lang="ts">
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import ConsentWidget from '../../lib/components/consent-widget.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

type MountableComponent = 'consent-banner' | 'consent-dialog' | 'consent-widget';

let {
	component,
	options,
}: {
	component: MountableComponent;
	options: ConsentProviderOptions;
} = $props();
</script>

<ConsentProvider {options}>
	{#if component === 'consent-banner'}
		<ConsentBanner />
	{:else if component === 'consent-dialog'}
		<ConsentDialog />
	{:else if component === 'consent-widget'}
		<ConsentWidget />
	{/if}
</ConsentProvider>
