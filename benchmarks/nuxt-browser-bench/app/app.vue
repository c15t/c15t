<script setup lang="ts">
// Static consent mount, aliased per build: full builds get consent-mount.vue
// (static `<ConsentRoot />`), baseline builds (C15T_BENCH_BASELINE=1) get an
// empty stub so they never reference @c15t/vue. Static resolution matters:
// dynamic-by-name (`<component :is="'ConsentRoot'">` via global registration)
// lazy-loads the component chunk on the banner's critical path — measured
// +82ms banner-visible on client-manifest at mobile + 200ms.
import BenchConsentMount from '#bench-consent-mount';
</script>

<template>
	<BenchConsentMount />
	<NuxtPage />
</template>
