<script lang="ts">
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
