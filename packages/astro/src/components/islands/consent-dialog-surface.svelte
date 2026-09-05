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
	import { ConsentDialog, ConsentManagerProvider } from '@c15t/svelte';
	import type { Component } from 'svelte';

	let {
		options,
		runtime,
		kind = 'preferences',
	}: {
		options: Record<string, unknown>;
		runtime: ConsentRuntime;
		kind?: 'preferences' | 'iab';
	} = $props();

	// The TCF surface is the larger half of this island and only an IAB site
	// ever opens it, so it arrives on its own chunk.
	let IABDialog = $state<Component | null>(null);

	$effect(() => {
		if (kind !== 'iab' || IABDialog) {
			return;
		}
		void (async () => {
			const module = await import('./iab-dialog-surface.svelte');
			IABDialog = module.default as Component;
		})();
	});
</script>

<ConsentManagerProvider
	{runtime}
	options={options as never}
>
	{#if kind === 'iab'}
		{#if IABDialog}
			<IABDialog />
		{/if}
	{:else}
		<ConsentDialog />
	{/if}
</ConsentManagerProvider>
