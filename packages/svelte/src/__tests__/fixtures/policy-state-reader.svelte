<script lang="ts">
	import { untrack } from 'svelte';

	import { getConsentContext } from '../../lib/context.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';

	let { capture }: { capture: (context: ConsentContextValue) => void } =
		$props();
	const context = getConsentContext();
	untrack(() => capture(context));
</script>
