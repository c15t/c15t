<script lang="ts">
	import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
	import type { ConsentManagerOptions } from '../../types';
	import ContextReader from './ContextReader.svelte';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ContextReader />
</ConsentManagerProvider>
