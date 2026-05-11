<script lang="ts">
import type { Model } from 'c15t';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let {
	options,
	open = undefined,
	models = undefined,
	uiSource = undefined,
	hideBranding = undefined,
}: {
	options: ConsentProviderOptions;
	open?: boolean;
	models?: Model[];
	uiSource?: string;
	hideBranding?: boolean;
} = $props();
</script>

<ConsentProvider {options}>
	<ConsentDialog {open} {models} {uiSource} {hideBranding} />
</ConsentProvider>
