<script lang="ts">
	import { ConsentWidget } from '@c15t/svelte';

	import {
		storybookVendors,
		storybookVendorStoredConsent,
	} from '../../storybook-consent-policy';
	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
</script>

<StorybookConsentProvider
	options={{ ...editableConsentOptions, vendors: storybookVendors }}
	storedConsent={storybookVendorStoredConsent}
>
	<div style="width: 32rem;">
		<ConsentWidget />
	</div>
</StorybookConsentProvider>
