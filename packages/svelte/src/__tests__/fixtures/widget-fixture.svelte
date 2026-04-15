<script lang="ts">
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import ConsentWidget from '../../components/consent-widget.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentWidget />
</ConsentManagerProvider>
