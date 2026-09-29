<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';
	import { DevTools } from '@c15t/svelte/devtools';

	import YouTubeEmbed from './YouTubeEmbed.svelte';

	const consent = getConsentManager();
</script>

<main>
	<p>c15t / Svelte</p>
	<h1>Consent example</h1>
	<p>One consent setup for your analytics, advertising and video embeds.</p>
	<nav aria-label="Banner design">
		<a href="/">Default</a><a href="/?design=branded">Branded</a>
	</nav>
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
		<YouTubeEmbed />
	</section>
</main>
<DevTools />
