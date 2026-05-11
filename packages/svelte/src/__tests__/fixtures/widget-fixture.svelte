<script lang="ts">
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import ConsentWidget from '../../lib/components/consent-widget.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let { options }: { options: ConsentProviderOptions } = $props();
</script>

<ConsentProvider {options}>
	<ConsentWidget />
</ConsentProvider>
