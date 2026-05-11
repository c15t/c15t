<script lang="ts">
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';
import ContextReader from './context-reader.svelte';

let { options }: { options: ConsentProviderOptions } = $props();
</script>

<ConsentProvider {options}>
	<ContextReader />
</ConsentProvider>
