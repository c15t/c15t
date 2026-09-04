<!--
	Keeps the provider's kernel and the page runtime's kernel in step.

	`@c15t/astro` owns one kernel per page; the provider builds its own.
	This component lives inside the provider so it can reach that kernel
	through the Svelte context, and mirrors state between the two while a
	dialog is open. When `ConsentManagerProvider` accepts a `runtime` prop
	there is only one kernel and this whole file goes away.
-->
<script lang="ts">
	import {
		ConsentDialog,
		IABConsentDialog,
		getConsentKernel,
	} from '@c15t/svelte';
	import { onDestroy } from 'svelte';

	let {
		runtime,
		kind = 'preferences',
	}: {
		runtime: {
			kernel: {
				getSnapshot: () => Record<string, unknown>;
				subscribe: (
					listener: (snapshot: Record<string, unknown>) => void
				) => () => void;
				set: Record<string, (value: unknown) => void>;
			};
		};
		kind?: 'preferences' | 'iab';
	} = $props();

	const providerKernel = getConsentKernel();
	const pageKernel = runtime.kernel;

	let mirroring = false;

	const mirror = function mirror(snapshot: Record<string, unknown>) {
		if (mirroring) {
			return;
		}
		mirroring = true;
		try {
			providerKernel.set.consent(snapshot.consents as never);
			providerKernel.set.hasConsented(snapshot.hasConsented as boolean);
			providerKernel.set.activeUI(snapshot.activeUI as never);
			if (snapshot.iab) {
				providerKernel.set.iab(snapshot.iab as never);
			}
		} finally {
			mirroring = false;
		}
	};

	const unmirror = function unmirror(snapshot: Record<string, unknown>) {
		if (mirroring) {
			return;
		}
		mirroring = true;
		try {
			pageKernel.set.activeUI(snapshot.activeUI as never);
		} finally {
			mirroring = false;
		}
	};

	mirror(pageKernel.getSnapshot());

	const unsubscribePage = pageKernel.subscribe(mirror);
	const unsubscribeProvider = providerKernel.subscribe(unmirror);

	onDestroy(() => {
		unsubscribePage();
		unsubscribeProvider();
	});
</script>

{#if kind === 'iab'}
	<IABConsentDialog />
{:else}
	<ConsentDialog />
{/if}
