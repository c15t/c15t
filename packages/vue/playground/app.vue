<script setup lang="ts">
const route = useRoute();

const config = useConsentConfig();
const init = useConsentInit();
const policy = usePolicyRule();
const activeUI = useConsentActiveUI();
const country = computed(() =>
	typeof route.query.country === 'string' ? route.query.country : undefined
);
const region = computed(() =>
	typeof route.query.region === 'string' ? route.query.region : undefined
);

const regionPresets = [
	{ id: 'california', label: 'California', to: '/?country=US&region=CA' },
	{ id: 'usa', label: 'USA', to: '/?country=US' },
	{ id: 'europe', label: 'Europe', to: '/?country=DE' },
	{ id: 'quebec', label: 'Quebec', to: '/?country=CA&region=QC' },
] as const;

const openBanner = function openBanner() {
	activeUI.value = 'banner';
};
</script>

<template>
	<nav
		class="region-toggle"
		aria-label="Region preview"
	>
		<span class="region-toggle__label">Region</span>
		<NuxtLink
			v-for="{ id, label, to } in regionPresets"
			:key="id"
			:to="to"
			class="region-toggle__button"
			active-class="region-toggle__button--active"
		>
			{{ label }}
		</NuxtLink>
	</nav>

	<ConsentRoot
		:country="country"
		:region="region"
	/>

	<div
		v-if="init"
		class="playground-status"
	>
		{{ activeUI }}
		<p>backend: {{ config.backendURL }}</p>
		<p>
			location:
			{{ init.location?.countryCode ?? '—' }}
			<span v-if="init.location?.regionCode"
				>/ {{ init.location.regionCode }}</span
			>
		</p>
		<p>policy: {{ policy.id }}; prompt: {{ policy.prompt }}</p>
		<button @click="openBanner">Open banner (dev)</button>
	</div>
	<p v-else>Loading init…</p>
</template>

<style scoped>
.region-toggle {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 99999;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	font-family: system-ui, sans-serif;
	font-size: 0.8125rem;
	background: hsl(228 30% 12%);
	color: hsl(0 0% 96%);
	border-bottom: 1px solid hsl(228 20% 22%);
}

.region-toggle__label {
	font-weight: 600;
	margin-right: 0.25rem;
	opacity: 0.7;
}

.region-toggle__button {
	appearance: none;
	border: 1px solid hsl(228 20% 28%);
	background: hsl(228 25% 18%);
	color: inherit;
	border-radius: 0.375rem;
	padding: 0.25rem 0.625rem;
	cursor: pointer;
}

.region-toggle__button:hover {
	background: hsl(228 25% 24%);
}

.region-toggle__button--active {
	background: hsl(228 100% 60%);
	border-color: hsl(228 100% 55%);
	color: hsl(0 0% 100%);
}

.playground-status {
	font-family: system-ui, sans-serif;
	padding: 3rem 1rem 1rem;
}
</style>
