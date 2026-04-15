<script lang="ts">
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import ConsentWidget from '../../lib/components/consent-widget.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentWidget />
</ConsentManagerProvider>
