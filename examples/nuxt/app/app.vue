<script setup lang="ts">
import { ConsentDevTools } from 'c15t/vue/devtools';

const isDevelopment = import.meta.dev;

/**
 * The only required integration: mount <ConsentRoot /> once.
 * Everything below it is demo chrome showing the consent state live.
 */
const activeUI = useConsentActiveUI();
const hasConsent = useHasConsent();
const init = useConsentInit();

const reopenBanner = () => {
	activeUI.value = 'banner';
};

const openPreferences = () => {
	activeUI.value = 'manager';
};
</script>

<template>
	<ConsentRoot />
	<ConsentDevTools
		v-if="isDevelopment"
		position="bottom-right"
	/>

	<main class="page">
		<h1>c15t × Nuxt</h1>
		<p>
			Consent management with the banner server-rendered into the first HTML
			(zero CLS) and consent resolved from a CDN-cacheable manifest — no
			consent-backend round trip on the request path.
		</p>

		<section class="card">
			<h2>Live consent state</h2>
			<dl>
				<dt>Active surface</dt>
				<dd>
					<code>{{ activeUI ?? 'none' }}</code>
				</dd>
				<dt>Granted categories</dt>
				<dd>
					<code>{{ hasConsent.join(', ') || '—' }}</code>
				</dd>
				<dt>Resolved location</dt>
				<dd>
					<code>
						{{ init?.location?.countryCode ?? 'unknown' }}
						{{
							init?.location?.regionCode ? ` / ${init.location.regionCode}` : ''
						}}
					</code>
				</dd>
				<dt>Jurisdiction</dt>
				<dd>
					<code>{{ init?.jurisdiction ?? '—' }}</code>
				</dd>
				<dt>Policy pack</dt>
				<dd>
					<code>{{ init?.policy?.id ?? '—' }}</code>
				</dd>
				<dt>Policy model</dt>
				<dd>
					<code>{{ init?.policy?.model ?? '—' }}</code>
				</dd>
				<dt>Consent surface</dt>
				<dd>
					<code>{{ init?.policy?.ui?.mode ?? '—' }}</code>
				</dd>
			</dl>
		</section>

		<section class="card">
			<h2>Region preview</h2>
			<p class="hint">
				Override the resolved location with a query parameter — the policy pack
				above is re-resolved from the manifest on the server, so two of these
				legitimately render no banner at all.
			</p>
			<ul class="regions">
				<li><a href="/">Auto-detect</a> — your real location</li>
				<li><a href="/?country=DE">?country=DE</a> — GDPR, opt-in, banner</li>
				<li>
					<a href="/?country=US&amp;region=CA">?country=US&amp;region=CA</a>
					— CCPA, opt-out, no banner
				</li>
				<li>
					<a href="/?country=JP">?country=JP</a>
					— world fallback, no banner
				</li>
			</ul>
		</section>

		<section class="card">
			<h2>Controls</h2>
			<button
				type="button"
				@click="reopenBanner"
			>
				Reopen banner
			</button>
			<button
				type="button"
				@click="openPreferences"
			>
				Open preferences
			</button>
		</section>
	</main>
</template>

<style>
body {
	margin: 0;
	font-family: system-ui, sans-serif;
	background: #fafafa;
	color: #1a1a1a;
}

.page {
	max-width: 40rem;
	margin: 0 auto;
	padding: 3rem 1.5rem;
}

.card {
	background: #fff;
	border: 1px solid #e5e5e5;
	border-radius: 0.75rem;
	padding: 1.25rem 1.5rem;
	margin-top: 1.5rem;
}

.card h2 {
	margin-top: 0;
	font-size: 1rem;
}

.card dl {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 0.5rem 1.5rem;
	margin: 0;
}

.card dt {
	font-weight: 600;
}

.card dd {
	margin: 0;
}

.card .hint {
	margin: 0 0 0.75rem;
	color: #525252;
	font-size: 0.875rem;
}

.card .regions {
	margin: 0;
	padding-left: 1.25rem;
	font-size: 0.875rem;
	line-height: 1.8;
}

.card .regions code,
.card .regions a {
	font-family: ui-monospace, monospace;
}

.card button {
	margin-right: 0.75rem;
	padding: 0.5rem 1rem;
	border: 1px solid #d4d4d4;
	border-radius: 0.5rem;
	background: #fff;
	cursor: pointer;
}

.card button:hover {
	background: #f5f5f5;
}
</style>
