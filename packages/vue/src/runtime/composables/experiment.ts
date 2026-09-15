import { applyExperimentAssignment } from '@c15t/core';
import type {
	ConsentPresentation,
	ConsentSnapshot,
	ExperimentAssignment,
} from '@c15t/core';
import { computed, inject, onScopeDispose, shallowRef } from 'vue';
import type { ComputedRef, Ref } from 'vue';

import {
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../utils/symbols';
import { useConsentConfig } from './config';

/**
 * The reactive snapshot from whichever injection the host provided: the
 * plugin's snapshot ref, the kernel context, or a bare kernel.
 */
const useAnySnapshot = function useAnySnapshot(): Ref<ConsentSnapshot> {
	const provided =
		inject(symbolSnapshot, undefined) ??
		inject(symbolKernelContext, undefined)?.snapshot;
	if (provided) {
		return provided;
	}
	const kernel = inject(symbolKernel, undefined);
	if (!kernel) {
		throw new Error('[c15t] Kernel not found');
	}
	const snapshot = shallowRef(kernel.getSnapshot());
	onScopeDispose(
		kernel.subscribe((next) => {
			snapshot.value = next;
		})
	);
	return snapshot;
};

/**
 * The presentation experiment arm this visitor runs, or `null` while no
 * experiment is configured or the arm is not assigned yet. Built-in
 * assignment lands on mount; a host-resolved `variant` is known at once.
 */
export const useExperiment =
	function useExperiment(): ComputedRef<Readonly<ExperimentAssignment> | null> {
		const snapshot = useAnySnapshot();
		return computed(() => snapshot.value.experiment);
	};

/**
 * The configured `presentation` with the assigned experiment arm merged
 * over it. Equal to `presentation` while no arm is assigned.
 */
export const useResolvedPresentation =
	function useResolvedPresentation(): ComputedRef<
		ConsentPresentation | undefined
	> {
		const config = useConsentConfig();
		const experiment = useExperiment();
		return computed(() =>
			applyExperimentAssignment(
				config.value.presentation,
				config.value.experiment,
				experiment.value
			)
		);
	};
