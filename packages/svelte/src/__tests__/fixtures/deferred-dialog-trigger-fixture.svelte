<script lang="ts">
	import { ConsentDialog } from '../../lib';
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentProvider {options}>
	<ConsentDialog showTrigger />
</ConsentProvider>
