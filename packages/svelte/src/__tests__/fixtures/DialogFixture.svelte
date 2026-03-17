<script lang="ts">
import type { Model } from 'c15t';
import ConsentDialog from '../../components/ConsentDialog.svelte';
import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
import type { ConsentManagerOptions } from '../../types';

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
