<script lang="ts">
	import type {
		EventDispatcher,
		RuntimeEventDispatcherOptions,
	} from '@c15t/core/events';

	import Provider from '../../lib/components/consent-provider.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Reader from './event-dispatcher-reader.svelte';
	import ContextReader from './policy-state-reader.svelte';

	let {
		options,
		dispatcherOptions,
		captureContext,
		captureDispatcher,
	}: {
		options: ConsentManagerOptions;
		dispatcherOptions: () => RuntimeEventDispatcherOptions;
		captureContext: (context: ConsentContextValue) => void;
		captureDispatcher: (events: EventDispatcher) => void;
	} = $props();
</script>

<Provider {options}>
	<ContextReader capture={captureContext} />
	<Reader
		options={dispatcherOptions}
		capture={captureDispatcher}
	/>
	<Reader
		options={dispatcherOptions}
		capture={captureDispatcher}
	/>
</Provider>
