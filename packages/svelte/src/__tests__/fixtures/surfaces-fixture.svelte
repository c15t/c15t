<script lang="ts">
	import Banner from '../../lib/components/consent-banner.svelte';
	import Dialog from '../../lib/components/consent-dialog.svelte';
	import DialogLink from '../../lib/components/consent-dialog-link.svelte';
	import Trigger from '../../lib/components/consent-dialog-trigger.svelte';
	import Provider from '../../lib/components/consent-manager-provider.svelte';
	import Widget from '../../lib/components/consent-widget.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Reader from './policy-state-reader.svelte';

	let {
		options,
		capture,
	}: {
		options: ConsentManagerOptions;
		capture: (context: ConsentContextValue) => void;
	} = $props();
</script>

<!-- Every c15t surface mounted at once, the way a host layout would. -->
<Provider {options}>
	<Reader {capture} />
	<Banner />
	<Dialog />
	<Trigger />
	<DialogLink>Privacy settings</DialogLink>
	<Widget />
</Provider>
