<script lang="ts">
import ConsentBanner from '../../components/consent-banner.svelte';
import ConsentDialog from '../../components/consent-dialog.svelte';
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
