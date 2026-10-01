<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';
	import { DevTools } from '@c15t/svelte/devtools';

	import ExperimentReadout from './ExperimentReadout.svelte';
	import YouTubeEmbed from './YouTubeEmbed.svelte';

	let { experiment = false }: { experiment?: boolean } = $props();
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
	{#if experiment}<ExperimentReadout />{/if}
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
			Replace the placeholder project IDs in src/scripts.ts with your own.
			DevTools shows the scripts' loading status.
		</p>
	</section>
	<section class="card">
		<h2>YouTube embed</h2>
		<YouTubeEmbed />
	</section>
</main>
<DevTools />
