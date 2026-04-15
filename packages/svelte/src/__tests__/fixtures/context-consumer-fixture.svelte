<script lang="ts">
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../types';
import ContextReader from './context-reader.svelte';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ContextReader />
</ConsentManagerProvider>
