<script
	setup
	lang="ts"
>
import { useConsentActiveUI } from '#c15t/composables';

defineProps<{
	scenario:
		| 'ssr'
		| 'ssr-manifest'
		| 'client'
		| 'client-manifest'
		| 'repeat-visitor';
}>();

const activeUI = useConsentActiveUI();

function openPreferences() {
	activeUI.value = 'manager';
}
</script>

<template>
	<BenchmarkProbe :scenario="scenario" />
	<main style="padding: 2rem; font-family: system-ui, sans-serif">
		<h1>Nuxt Benchmark: {{ scenario }}</h1>
		<button
			id="open-preferences"
			type="button"
			@click="openPreferences"
		>
			Open Preferences
		</button>
	</main>
</template>
