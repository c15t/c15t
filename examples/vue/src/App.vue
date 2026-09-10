<script setup lang="ts">
import { createScriptLoader } from 'c15t/modules/script-loader';
import ConsentRoot from 'c15t/vue/consent-root';
import { DevTools } from 'c15t/vue/devtools';
import {
	useConsentActiveUI,
	useConsentSnapshot,
	useConsentKernel,
} from 'c15t/vue/vue-plugin';
import { onMounted, onUnmounted } from 'vue';

import { scripts } from './scripts';

const kernel = useConsentKernel();
let loader: ReturnType<typeof createScriptLoader> | undefined;
onMounted(() => {
	loader = createScriptLoader({ kernel, scripts });
});
onUnmounted(() => loader?.dispose());
const activeUI = useConsentActiveUI();
const snapshot = useConsentSnapshot();
</script>

<template>
	<ConsentRoot />
	<main>
		<p>c15t / Vue</p>
		<h1>Consent example</h1>
		<p>One consent setup for your analytics, advertising and video embeds.</p>
		<nav aria-label="Banner design">
			<a href="/">Default</a><a href="/?design=branded">Branded</a>
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
			<p>
				Set your project IDs in .env.local to enable the vendor scripts.
				DevTools shows their loading status.
			</p>
		</section>
		<section class="card">
			<h2>YouTube embed</h2>
			<iframe
				v-if="snapshot.effectivePermissions.measurement"
				title="YouTube video"
				src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1"
				allow="encrypted-media; picture-in-picture"
				allowfullscreen
			/>
			<div
				v-else
				class="placeholder"
			>
				<p>Allow measurement to load this YouTube video.</p>
				<button
					type="button"
					@click="activeUI = 'manager'"
				>
					Choose video permissions
				</button>
			</div>
		</section>
		<footer>
			<button
				type="button"
				@click="activeUI = 'manager'"
			>
				Privacy settings
			</button>
		</footer>
	</main>
	<DevTools />
</template>
