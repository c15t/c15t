<script lang="ts">
	import { ConsentBanner, ConsentDialog, ConsentDialogLink } from '../../lib';
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogLink>Privacy settings</ConsentDialogLink>
</ConsentProvider>
