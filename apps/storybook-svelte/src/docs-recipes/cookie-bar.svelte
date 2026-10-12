<!-- #region docs:headless-bar title="src/lib/cookie-bar.svelte" -->
<script lang="ts">
	import { getHeadlessConsent } from '@c15t/svelte';
	import type { PresentationAction } from '@c15t/svelte';

	import './cookie-bar.css';

	const consent = getHeadlessConsent();

	const labels: Record<PresentationAction, string> = {
		accept: 'Accept all',
		customize: 'Preferences',
		dismiss: 'Got it',
		reject: 'Reject all',
		save: 'Save',
	};

	// The policy decides which actions this visitor gets, and in what order.
	// Preferences has its own button, so it is always there.
	const actions = $derived(
		consent.banner.orderedActions.filter((action) => action !== 'customize')
	);
</script>

{#if consent.banner.isVisible}
	<section
		class="cookie-bar"
		aria-label="Cookie consent"
	>
		<p class="cookie-bar__text">
			We use cookies to measure traffic and improve this site. Choose which ones
			can run.
		</p>
		<div class="cookie-bar__actions">
			<button
				type="button"
				class="cookie-bar__link"
				onclick={() => consent.openDialog()}
			>
				Preferences
			</button>
			{#each actions as action (action)}
				<button
					type="button"
					class="cookie-bar__button"
					onclick={() => consent.performAction(action)}
				>
					{labels[action]}
				</button>
			{/each}
		</div>
	</section>
{/if}
<!-- #endregion docs:headless-bar -->
