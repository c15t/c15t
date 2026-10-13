<!-- #region docs:custom-banner -->
<script lang="ts">
	import {
		getConsentManager,
		getHeadlessConsent,
		resolveActionLabels,
		resolvePromptCopy,
	} from '@c15t/svelte';

	const consent = getHeadlessConsent();
	const manager = getConsentManager();

	// The active language, with English for any missing key.
	const bundle = $derived(manager.translations?.translations);
	const copy = $derived(resolvePromptCopy(bundle, manager.policyRule.prompt));
	const labels = $derived(resolveActionLabels(bundle));
</script>

{#if consent.banner.isVisible}
	<section
		class="custom-consent-banner"
		aria-label={copy.title}
	>
		<h2>{copy.title}</h2>
		<p>{copy.description}</p>
		<!-- The policy decides which actions this visitor gets, and in what order. -->
		{#each consent.banner.actionGroups as group, index (index)}
			<div>
				{#each group as action (action)}
					<button
						type="button"
						data-primary={consent.banner.primaryActions.includes(action) ||
							undefined}
						onclick={() => consent.performAction(action)}
					>
						{labels[action]}
					</button>
				{/each}
			</div>
		{/each}
	</section>
{/if}

<style>
	.custom-consent-banner {
		position: fixed;
		inset: auto 1rem 1rem;
		max-width: 32rem;
		padding: 1rem;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
		background: white;
	}
	.custom-consent-banner div {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
<!-- #endregion docs:custom-banner -->
