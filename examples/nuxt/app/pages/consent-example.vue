<script setup lang="ts">
import type { ExperimentReportEvent } from 'c15t';
import {
	buildChoiceRecordedReport,
	buildNoticeDismissedReport,
	buildSurfaceShownReport,
} from 'c15t';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const snapshot = useConsentSnapshot();
const activeUI = useConsentActiveUI();
const allowed = computed(() => snapshot.value.effectivePermissions.measurement);

// `NUXT_PUBLIC_C15T_EXPERIMENT=1` puts the banner-shape experiment in the
// module config (see nuxt.config.ts). The arm comes from `useExperiment()`;
// the events c15t pushes to `window.dataLayer` are rebuilt here from the
// kernel for an in-page log.
const experimentConfigured = Boolean(useConsentConfig().value.experiment);
const experiment = useExperiment();
const kernel = useConsentKernel();
const experimentEvents = ref<ExperimentReportEvent[]>([]);
let stopReporting: (() => void)[] = [];
onMounted(() => {
	stopReporting = [
		kernel.events.on('surface:shown', (event) => {
			const report = buildSurfaceShownReport(event);
			if (report) {
				experimentEvents.value.push(report);
			}
		}),
		kernel.events.on('choice:recorded', (event) => {
			const report = buildChoiceRecordedReport(event);
			if (report) {
				experimentEvents.value.push(report);
			}
		}),
		kernel.events.on('notice:dismissed', (event) => {
			const report = buildNoticeDismissedReport(event);
			if (report) {
				experimentEvents.value.push(report);
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
						? `${experiment.id} · ${experiment.variant} · ${experiment.assignedBy}`
						: 'assigning…'
				}}</code>
			</p>
			<ul>
				<li
					v-for="(event, index) in experimentEvents"
					:key="index"
				>
					<code>{{ event.name }}</code> · {{ event.variant }} ·
					{{ event.surface }}
					<template v-if="event.name === 'c15t_choice_recorded'">
						· {{ event.consentAction }}
					</template>
					<template
						v-if="
							event.name !== 'c15t_surface_shown' &&
							event.timeToDecisionMs !== undefined
						"
					>
						· {{ event.timeToDecisionMs }} ms
					</template>
				</li>
			</ul>
			<p>
				The same events are pushed to <code>window.dataLayer</code>. Set
				<code>NUXT_PUBLIC_C15T_EXPERIMENT_ARM=wall</code> to force the arm.
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
