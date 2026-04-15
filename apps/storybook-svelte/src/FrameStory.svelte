<script lang="ts">
	import { Frame } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';

	let { granted = false }: { granted?: boolean } = $props();

	const storedConsent = $derived(
		granted
			? {
					necessary: true,
					marketing: true,
				}
			: undefined
	);
</script>

<StorybookConsentProvider storedConsent={storedConsent}>
	<div style="width: 32rem;">
		<Frame category="marketing">
			<div
				style="border-radius: 1rem; padding: 1.25rem; background: var(--c15t-surface); border: 1px solid var(--c15t-border);"
			>
				Embedded marketing content is now visible.
			</div>
		</Frame>
	</div>
</StorybookConsentProvider>
