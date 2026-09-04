<!--
	The on-demand dialog island.

	Mounted with Svelte 5's `mount()` the first time something opens a
	dialog — never with `client:load` — so a visitor who never opens the
	preference centre downloads no framework code at all.
-->
<script lang="ts">
	import { ConsentManagerProvider } from '@c15t/svelte';

	import DialogBridge from './dialog-bridge.svelte';

	let {
		providerProps,
		runtime,
		kind = 'preferences',
	}: {
		providerProps: Record<string, unknown>;
		runtime: Record<string, unknown>;
		kind?: 'preferences' | 'iab';
	} = $props();
</script>

<ConsentManagerProvider options={providerProps as never}>
	<DialogBridge
		runtime={runtime as never}
		{kind}
	/>
</ConsentManagerProvider>
