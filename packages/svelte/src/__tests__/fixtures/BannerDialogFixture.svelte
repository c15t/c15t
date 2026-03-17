<script lang="ts">
import ConsentBanner from '../../components/ConsentBanner.svelte';
import ConsentDialog from '../../components/ConsentDialog.svelte';
import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
