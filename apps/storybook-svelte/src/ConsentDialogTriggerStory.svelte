<script lang="ts">
	import { ConsentDialog, ConsentDialogTrigger } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import {
		editableConsentOptions,
		editableStoredConsent,
	} from './storybook-consent-fixtures';

	let {
		defaultPosition = 'bottom-right',
		size = 'md',
		showWhen = 'always',
	}: {
		defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		size?: 'sm' | 'md' | 'lg';
		showWhen?: 'always' | 'after-consent' | 'never';
	} = $props();
</script>

<StorybookConsentProvider
	options={editableConsentOptions}
	storedConsent={editableStoredConsent}
>
	<ConsentDialog />
	<ConsentDialogTrigger
		{defaultPosition}
		{showWhen}
		{size}
	/>
</StorybookConsentProvider>
