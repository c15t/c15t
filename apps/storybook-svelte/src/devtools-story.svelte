<script lang="ts">
	import {
		devToolsProviderOptions,
		getDevToolsCategories,
	} from '@c15t/conformance/fixtures/devtools';
	import { ConsentProvider } from '@c15t/svelte';

	import { DevTools } from '../../../packages/svelte/src/lib/devtools';
</script>

<ConsentProvider options={devToolsProviderOptions}>
	<DevTools
		defaultOpen
		getConsentCategories={getDevToolsCategories}
	/>
</ConsentProvider>
