<script setup lang="ts">
/**
 * Demo page content shared by every variant: design links, live status and
 * the gated video. The consent setup is in `main.ts` and `App.vue`.
 */
import { useConsentSnapshot } from 'c15t/vue/vue-plugin';

import ConsentDevTools from './ConsentDevTools.vue';
import ExperimentReadout from './ExperimentReadout.vue';
import VideoEmbed from './VideoEmbed.vue';

const snapshot = useConsentSnapshot();
</script>

<template>
	<main>
		<p>c15t / Vue</p>
		<h1>Consent example</h1>
		<p>One consent setup for your analytics, advertising and video embeds.</p>
		<nav aria-label="Banner design">
			<a href="/">Default</a>
			<a href="/?design=branded">Branded</a>
			<a href="/headless">Headless</a>
			<a href="/?experiment=1">Experiment</a>
			<a href="/?experiment=1&arm=wall">Experiment (wall arm)</a>
		</nav>
		<ExperimentReadout />
		<section class="card">
			<h2>Scripts follow your choices</h2>
			<ul class="statuses">
				<li>
					PostHog:
					{{
						snapshot.effectivePermissions.measurement
							? 'measurement allowed'
							: 'waiting for measurement'
					}}
				</li>
				<li>
					X Pixel:
					{{
						snapshot.effectivePermissions.marketing
							? 'marketing allowed'
							: 'waiting for marketing'
					}}
				</li>
			</ul>
			<p>
				Replace the placeholder project IDs in src/scripts.ts with your own.
			</p>
		</section>
		<section class="card">
			<h2>YouTube embed</h2>
			<VideoEmbed />
		</section>
	</main>
	<ConsentDevTools />
</template>
