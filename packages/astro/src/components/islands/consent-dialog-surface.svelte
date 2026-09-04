<!--
	The on-demand dialog island.

	Mounted with Svelte 5's `mount()` the first time something opens a
	dialog — never with `client:load` — so a visitor who never opens the
	preference centre downloads no framework code at all.

	The provider renders against the page's runtime rather than building one
	of its own: Astro islands cannot see each other's context, so the kernel
	has to be owned outside the component tree. The provider borrows it and
	leaves `start()`/`dispose()` to the owner.
-->
<script lang="ts">
	import type { ConsentRuntime } from '@c15t/core/runtime';
	import {
		ConsentDialog,
		ConsentManagerProvider,
		IABConsentDialog,
	} from '@c15t/svelte';

	let {
		options,
		runtime,
		kind = 'preferences',
	}: {
		options: Record<string, unknown>;
		runtime: ConsentRuntime;
		kind?: 'preferences' | 'iab';
	} = $props();
</script>

<ConsentManagerProvider
	{runtime}
	options={options as never}
>
	{#if kind === 'iab'}
		<IABConsentDialog />
	{:else}
		<ConsentDialog />
	{/if}
</ConsentManagerProvider>
