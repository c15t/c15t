<script lang="ts">
	import { ConsentWidget } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import {
		editableConsentOptions,
		editableStoredConsent,
	} from './storybook-consent-fixtures';
</script>

<StorybookConsentProvider
	options={editableConsentOptions}
	storedConsent={editableStoredConsent}
>
	<div style="width: 32rem;">
		<ConsentWidget />
	</div>
</StorybookConsentProvider>
