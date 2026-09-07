<script lang="ts">
	import type { PromptPosition, PromptVariant } from '@c15t/core';
	import { ConsentBanner, ConsentDialog, offline } from '@c15t/svelte';

	import { storybookPolicy } from '../../storybook-consent-policy';
	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';

	let {
		includeDialog = false,
		trapFocus = undefined,
		notice = false,
		variant = undefined,
		position = undefined,
		blocking = undefined,
	}: {
		includeDialog?: boolean;
		trapFocus?: boolean;
		notice?: boolean;
		variant?: PromptVariant;
		position?: PromptPosition;
		blocking?: boolean;
	} = $props();

	// A notice under an opt-out model: an opt-out button plus a primary Accept All.
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
	<ConsentBanner
		{trapFocus}
		{variant}
		{position}
		{blocking}
	/>
	{#if includeDialog || notice}
		<ConsentDialog {trapFocus} />
	{/if}
</StorybookConsentProvider>
