<script setup lang="ts">
/**
 * Demo only: the banner-shape experiment readout. `C15T_NUXT_EXPERIMENT=1`
 * puts the experiment in the module config (see nuxt.config.ts) and the arm
 * comes from `useExperiment()`. Module config is serializable, so it takes
 * no callbacks; this component listens to the kernel's events instead, lists
 * each impression and choice made under the arm and pushes them to
 * `window.dataLayer`.
 */
import { onMounted, onUnmounted, ref } from 'vue';

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

const pushToDataLayer = (event: Record<string, unknown>) => {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

let stopReporting: (() => void)[] = [];
onMounted(() => {
	if (!experimentConfigured) {
		return;
	}
	stopReporting = [
		kernel.events.on('surface:shown', (event) => {
			if (!event.experiment) {
				return;
			}
			pushToDataLayer({
				arm: event.experiment.arm,
				event: 'c15t_surface_shown',
				experiment_id: event.experiment.id,
				surface: event.surface,
			});
			experimentEvents.value.push({
				arm: event.experiment.arm,
				detail: event.surface,
				name: 'c15t_surface_shown',
			});
		}),
		kernel.events.on('choice:recorded', (event) => {
			if (!event.experiment) {
				return;
			}
			pushToDataLayer({
				arm: event.experiment.arm,
				consent_action: event.consentAction,
				event: 'c15t_choice_recorded',
				experiment_id: event.experiment.id,
			});
			experimentEvents.value.push({
				arm: event.experiment.arm,
				detail: event.consentAction,
				name: 'c15t_choice_recorded',
			});
		}),
	];
});
onUnmounted(() => {
	for (const stop of stopReporting) {
		stop();
	}
});
</script>

<template>
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
			The same events are pushed to <code>window.dataLayer</code>. Build with
			<code>C15T_NUXT_EXPERIMENT_ARM=wall</code> to run the wall arm the way a
			flag provider would.
		</p>
	</section>
</template>
