<!--
	Full-build consent mount: a *static* `<ConsentRoot />` so Nuxt resolves it
	via auto-import (direct import, banner chunk on the entry path).

	Do not resolve dynamically (`<component :is="'ConsentRoot'">` + global
	registration): Nuxt lazy-loads global components, which puts the chunk
	fetch on the banner's critical path. Measured on client-manifest at
	mobile + 200ms: +82ms banner-visible vs static (fully exposed there
	because the manifest arm has no backend roundtrip to hide it; client
	direct only +8ms). See .benchmarks/drift/current vs
	.benchmarks/drift/current-static-root.

	Baseline builds alias `#bench-consent-mount` to consent-mount-baseline.vue
	so they never reference @c15t/vue.
-->
<template>
	<ConsentRoot />
</template>
