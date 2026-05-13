<script lang="ts">
import type { Model } from 'c15t';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let {
	options,
	open = undefined,
	models = undefined,
	hideBranding = undefined,
}: {
	options: ConsentManagerOptions;
	open?: boolean;
	models?: Model[];
	hideBranding?: boolean;
} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialog {open} {models} {hideBranding} />
</ConsentManagerProvider>
