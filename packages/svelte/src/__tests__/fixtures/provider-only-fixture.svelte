<script lang="ts">
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let {
	options,
	label = 'child',
}: { options: ConsentProviderOptions; label?: string } = $props();
</script>

<ConsentProvider {options}>
	<div data-testid="render-{label}">{label}</div>
</ConsentProvider>
