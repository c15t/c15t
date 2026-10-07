<script setup vapor lang="ts">
/**
 * Page content shared by the stock and headless routes: design switch,
 * live permissions and the gated video.
 */
import { onUnmounted } from 'vue';

const snapshot = useConsentSnapshot();

// Demo only: the branded theme overrides c15t tokens from
// `consent-example.css`, so the test suite can switch designs in place.
const setTheme = (theme: string) => {
	document.documentElement.dataset.consentExampleTheme = theme;
};
onUnmounted(() => {
	delete document.documentElement.dataset.consentExampleTheme;
});
</script>

<template>
	<main class="consent-example">
		<p>c15t / Nuxt Vapor</p>
		<h1>Consent example</h1>
		<p>
			PostHog waits for measurement permission. X Pixel waits for marketing
			permission.
		</p>
		<nav aria-label="Pages">
			<NuxtLink to="/consent-example">Stock UI</NuxtLink>
			<NuxtLink to="/headless">Headless</NuxtLink>
			<NuxtLink to="/privacy">Privacy page</NuxtLink>
		</nav>
		<button
			type="button"
			@click="setTheme('default')"
		>
			Default theme
		</button>
		<button
			type="button"
			@click="setTheme('branded')"
		>
			Branded theme
		</button>
		<ul data-testid="permissions">
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
		<h2>Watch the video</h2>
		<VideoEmbed />
	</main>
</template>
