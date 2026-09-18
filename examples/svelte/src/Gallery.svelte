<script lang="ts">
	import { Frame, ConsentDialogLink } from '@c15t/svelte';
	import { getConsentManager } from '@c15t/svelte/headless';

	import { experimentEvents } from './experiment.svelte';

	let { experimentConfigured = false }: { experimentConfigured?: boolean } =
		$props();
	const consent = getConsentManager();
</script>

<main>
	<p>c15t / Svelte</p>
	<h1>Consent example</h1>
	<p>One consent setup for your analytics, advertising and video embeds.</p>
	<nav aria-label="Banner design">
		<a href="/">Default</a><a href="/?design=branded">Branded</a><a
			href="/?experiment=1">Experiment</a
		><a href="/?experiment=1&arm=wall">Experiment (wall arm)</a>
	</nav>
	{#if experimentConfigured}
		<section
			class="card"
			data-testid="experiment"
		>
			<h2>Banner experiment</h2>
			<p>
				Arm: <code data-testid="experiment-arm"
					>{consent.experiment
						? `${consent.experiment.id} · ${consent.experiment.variant} · ${consent.experiment.assignedBy}`
						: 'assigning…'}</code
				>
			</p>
			<ul class="statuses">
				{#each experimentEvents as event, index (index)}
					<li>
						<code>{event.name}</code> · {event.variant} · {event.surface}
						{#if event.name === 'c15t_choice_recorded'}
							· {event.consentAction}
						{/if}
						{#if event.name !== 'c15t_surface_shown' && event.timeToDecisionMs !== undefined}
							· {event.timeToDecisionMs} ms
						{/if}
					</li>
				{/each}
			</ul>
			<p>The same events are pushed to <code>window.dataLayer</code>.</p>
		</section>
	{/if}
	<section class="card">
		<h2>Scripts follow your choices</h2>
		<ul class="statuses">
			<li>
				PostHog: {consent.effectivePermissions.measurement
					? 'measurement allowed'
					: 'waiting for measurement'}
			</li>
			<li>
				X Pixel: {consent.effectivePermissions.marketing
					? 'marketing allowed'
					: 'waiting for marketing'}
			</li>
		</ul>
		<p>
			Set your project IDs in .env.local to enable the vendor scripts. DevTools
			shows their loading status.
		</p>
	</section>
	<section class="card">
		<h2>YouTube embed</h2>
		<Frame category="measurement">
			{#snippet placeholder()}<div class="placeholder">
					<p>Allow measurement to load this YouTube video.</p>
					<ConsentDialogLink>Choose video permissions</ConsentDialogLink>
				</div>{/snippet}
			<iframe
				title="YouTube video"
				src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1"
				allow="encrypted-media; picture-in-picture"
				allowfullscreen
			></iframe>
		</Frame>
	</section>
	<footer><ConsentDialogLink>Privacy settings</ConsentDialogLink></footer>
</main>
