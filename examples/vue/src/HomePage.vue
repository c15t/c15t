<script setup lang="ts">
/**
 * Demo page content shared by every variant: design links, live status and
 * the gated video. The consent setup is in `main.ts` and `App.vue`.
 */
import { useConsentSnapshot } from 'c15t/vue/vue-plugin';
import { defineAsyncComponent } from 'vue';

import VideoEmbed from './VideoEmbed.vue';

const snapshot = useConsentSnapshot();

// Development builds only: the dynamic import keeps DevTools out of
// production bundles.
const DevTools = import.meta.env.DEV
	? defineAsyncComponent(() => import('c15t/vue/devtools'))
	: null;
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
		</nav>
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
			<p>Set your project IDs in .env.local to enable the vendor scripts.</p>
		</section>
		<section class="card">
			<h2>YouTube embed</h2>
			<VideoEmbed />
		</section>
	</main>
	<DevTools v-if="DevTools" />
</template>
