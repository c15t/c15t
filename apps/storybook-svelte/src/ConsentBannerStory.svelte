<script lang="ts">
	import { ConsentBanner, ConsentDialog, offline } from '@c15t/svelte';

	import { storybookPolicy } from '../../storybook-consent-policy';
	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';

	let {
		includeDialog = false,
		trapFocus = undefined,
		notice = false,
	}: {
		includeDialog?: boolean;
		trapFocus?: boolean;
		notice?: boolean;
	} = $props();

	// A notice under an opt-out model: one dismiss action plus rights links.
	const noticeOptions = {
		mode: offline({
			policyRules: [
				{
					...storybookPolicy,
					id: 'storybook-notice',
					model: 'opt-out' as const,
					prompt: 'notice' as const,
				},
			],
		}),
		presentation: undefined,
	};
</script>

<StorybookConsentProvider
	options={{
		...editableConsentOptions,
		trapFocus,
		...(notice ? noticeOptions : {}),
	}}
>
	<ConsentBanner {trapFocus} />
	{#if includeDialog || notice}
		<ConsentDialog {trapFocus} />
	{/if}
</StorybookConsentProvider>
