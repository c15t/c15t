<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ContextReader from './context-reader.svelte';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentProvider {options}><ContextReader /></ConsentProvider>
