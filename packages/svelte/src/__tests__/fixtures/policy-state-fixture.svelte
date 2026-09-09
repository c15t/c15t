<script lang="ts">
	import type { Snippet } from 'svelte';

	import Banner from '../../lib/components/consent-banner.svelte';
	import Link from '../../lib/components/consent-dialog-link.svelte';
	import Dialog from '../../lib/components/consent-dialog.svelte';
	import Provider from '../../lib/components/consent-manager-provider.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Reader from './policy-state-reader.svelte';

	let {
		options,
		capture,
		onclick,
	}: {
		options: ConsentManagerOptions;
		capture: (context: ConsentContextValue) => void;
		onclick?: (event: MouseEvent) => void;
	} = $props();
</script>

<Provider {options}>
	<Reader {capture} />
	<Banner />
	<Dialog />
	<Link {onclick}>Privacy settings</Link>
</Provider>
