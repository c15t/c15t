<script lang="ts">
	import { ConsentDialog, ConsentDialogLink } from '@c15t/svelte';
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
	<div style="padding: 2rem;">
		<ConsentDialogLink noStyle={false}>Privacy preferences</ConsentDialogLink>
		<ConsentDialog />
	</div>
</StorybookConsentProvider>
