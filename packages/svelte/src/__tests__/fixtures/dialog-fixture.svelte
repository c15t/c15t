<script lang="ts">
import type { Model } from 'c15t';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let {
	options,
	open = undefined,
	models = undefined,
	uiSource = undefined,
	hideBranding = undefined,
}: {
	options: ConsentManagerOptions;
	open?: boolean;
	models?: Model[];
	uiSource?: string;
	hideBranding?: boolean;
} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialog {open} {models} {uiSource} {hideBranding} />
</ConsentManagerProvider>
