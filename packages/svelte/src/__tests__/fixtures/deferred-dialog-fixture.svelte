<script lang="ts">
	import { ConsentBanner, ConsentDialog, ConsentDialogLink } from '../../lib';
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogLink>Privacy settings</ConsentDialogLink>
</ConsentManagerProvider>
