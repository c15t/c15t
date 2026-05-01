<script lang="ts">
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let {
	options,
	label = 'child',
}: { options: ConsentManagerOptions; label?: string } = $props();
</script>

<ConsentManagerProvider {options}>
	<div data-testid="render-{label}">{label}</div>
</ConsentManagerProvider>
