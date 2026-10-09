<!--
	@component
	The SvelteKit root: renders `ConsentProvider` from the state
	`loadConsent` returned, so the banner is in the server HTML.

	```svelte
	<script lang="ts">
		import { ConsentBanner, ConsentRoot } from '@c15t/svelte';

		let { children, data } = $props();
	</script>

	<ConsentRoot state={data.consent}>
		{@render children()}
		<ConsentBanner />
	</ConsentRoot>
	```

	The state names the mode `c15tHandle()` was given, as data. The root
	turns it into a transport that loads each init path only when it runs:
	a page the server resolved saves through a small record transport and
	ships no resolver, policy pack, snapshot or other language.
-->
<script lang="ts">
	import type { ProviderTransportFactory } from '@c15t/core';
	import { clientMode } from '@c15t/core/runtime/client-mode';
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';

	import type { ConsentManagerOptions, ConsentRootState } from '../types';
	import ConsentProvider from './consent-provider.svelte';

	type ConsentRootProps = Omit<ConsentManagerOptions, 'mode' | 'prefetch'> & {
		children?: Snippet;
		/**
		 * A transport of your own, such as `custom()` from `@c15t/svelte`,
		 * instead of the mode `c15tHandle()` was given. Read once, when the
		 * root mounts.
		 */
		mode?: ProviderTransportFactory;
		/** `data.consent`, from `loadConsent` in `+layout.server.ts`. */
		state: ConsentRootState;
	};

	let props: ConsentRootProps = $props();

	// Built once, when the root mounts, like `ConsentProvider`'s `mode`.
	const transport = untrack(() =>
		clientMode(props.mode ?? props.state.mode, props.state)
	);
</script>

<ConsentProvider
	{...props}
	mode={transport}
	prefetch={props.state.prefetch}
/>
