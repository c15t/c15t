<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options} />
