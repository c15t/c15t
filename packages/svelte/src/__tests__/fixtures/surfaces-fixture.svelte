<script lang="ts">
	import Provider from '../../lib/components/manager-provider.svelte';
	import DialogLink from '../../lib/components/panel-link.svelte';
	import Trigger from '../../lib/components/panel-trigger.svelte';
	import Dialog from '../../lib/components/panel.svelte';
	import Widget from '../../lib/components/preferences.svelte';
	import Banner from '../../lib/components/prompt.svelte';
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
