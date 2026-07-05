<script setup lang="ts">
// Baseline builds (C15T_BENCH_BASELINE=1) omit the @c15t/vue module; resolve
// ConsentRoot lazily by name so the baseline build never references it.
const consentEnabled = !useRuntimeConfig().public.benchBaseline;
</script>

<template>
	<component
		:is="'ConsentRoot'"
		v-if="consentEnabled"
	/>
	<NuxtPage />
</template>
