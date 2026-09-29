<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

// The same page under route rules that share its HTML between visitors
// (see `routeRules` in nuxt.config.ts).
definePageMeta({
	alias: ['/prerendered/consent-example', '/cached/consent-example'],
});

const snapshot = useConsentSnapshot();
const activeUI = useConsentActiveUI();
const allowed = computed(() => snapshot.value.effectivePermissions.measurement);

// `NUXT_PUBLIC_C15T_EXPERIMENT=1` puts the banner-shape experiment in the
// module config (see nuxt.config.ts). The arm comes from `useExperiment()`.
// Module config is serializable, so it takes no callbacks; the page listens
// to the kernel's events instead and lists each impression and choice made
// under the arm.
const experimentConfigured = Boolean(useConsentConfig().value.experiment);
const experiment = useExperiment();
const kernel = useConsentKernel();
const experimentEvents = ref<
	{
		name: 'c15t_surface_shown' | 'c15t_choice_recorded';
		arm: string;
		detail: string;
	}[]
>([]);
let stopReporting: (() => void)[] = [];
onMounted(() => {
	stopReporting = [
		kernel.events.on('surface:shown', (event) => {
			if (event.experiment) {
				experimentEvents.value.push({
					arm: event.experiment.arm,
					detail: event.surface,
					name: 'c15t_surface_shown',
				});
			}
		}),
		kernel.events.on('choice:recorded', (event) => {
			if (event.experiment) {
				experimentEvents.value.push({
					arm: event.experiment.arm,
					detail: event.consentAction,
					name: 'c15t_choice_recorded',
				});
			}
		}),
	];
});
const setTheme = (theme: string) => {
	document.documentElement.dataset.consentExampleTheme = theme;
};
onUnmounted(() => {
	for (const stop of stopReporting) {
		stop();
	}
	delete document.documentElement.dataset.consentExampleTheme;
});
</script>
<template>
	<main class="consent-example">
		<h1>Consent example</h1>
		<p>
			PostHog waits for measurement permission. X Pixel waits for marketing
			permission.
		</p>
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
		<section
			v-if="experimentConfigured"
			data-testid="experiment"
		>
			<h2>Banner experiment</h2>
			<p>
				Arm:
				<code data-testid="experiment-arm">{{
					experiment
						? `${experiment.id} · ${experiment.arm} · ${experiment.assignedBy}`
						: 'assigning…'
				}}</code>
			</p>
			<ul>
				<li
					v-for="(event, index) in experimentEvents"
					:key="index"
				>
					<code>{{ event.name }}</code> · {{ event.arm }} · {{ event.detail }}
				</li>
			</ul>
			<p>
				Set <code>NUXT_PUBLIC_C15T_EXPERIMENT_ARM=wall</code> to run the wall
				arm the way a flag provider would.
			</p>
		</section>
		<h2>Watch the video</h2>
		<iframe
			v-if="allowed"
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			allowfullscreen
		/>
		<div v-else>
			<p>
				Allow measurement to load this YouTube video. No video request is sent
				before permission.
			</p>
			<button
				type="button"
				@click="activeUI = 'manager'"
			>
				Open privacy settings
			</button>
		</div>
		<footer>
			<button
				type="button"
				@click="activeUI = 'manager'"
			>
				Privacy settings
			</button>
		</footer>
	</main>
</template>
