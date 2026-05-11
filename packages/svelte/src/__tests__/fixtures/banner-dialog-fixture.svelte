<script lang="ts">
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let { options }: { options: ConsentProviderOptions } = $props();
</script>

<ConsentProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
</ConsentProvider>
