<script lang="ts">
	import { Frame } from '@c15t/svelte';

	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';

	let { granted = false }: { granted?: boolean } = $props();

	const storedConsent = $derived(
		granted
			? {
					marketing: true,
					necessary: true,
				}
			: undefined
	);
</script>

<StorybookConsentProvider
	{storedConsent}
	options={editableConsentOptions}
>
	<div style="width: 32rem;">
		<Frame category="marketing">
			{#snippet placeholder()}<div data-testid="frame-placeholder">
					Marketing content requires consent.
				</div>{/snippet}
			<div
				data-testid="parity-frame-content"
				style="border-radius: 1rem; padding: 1.25rem; background: var(--c15t-surface); border: 1px solid var(--c15t-border);"
			>
				Embedded marketing content is now visible.
			</div>
		</Frame>
	</div>
</StorybookConsentProvider>
