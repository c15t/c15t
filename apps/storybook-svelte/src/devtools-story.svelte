<script lang="ts">
	import {
		devToolsProviderOptions,
		getDevToolsCategories,
	} from '@c15t/conformance/fixtures/devtools';
	import { ConsentManagerProvider } from '@c15t/svelte';

	import { DevTools } from '../../../packages/svelte/src/lib/devtools';
</script>

<ConsentManagerProvider options={devToolsProviderOptions}>
	<DevTools
		defaultOpen
		getConsentCategories={getDevToolsCategories}
	/>
</ConsentManagerProvider>
