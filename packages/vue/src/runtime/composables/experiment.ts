import { applyExperimentAssignment, applyExperimentTheme } from '@c15t/core';
import type {
	ConsentExperiment,
	ConsentPresentation,
	ConsentSnapshot,
	ExperimentAssignment,
} from '@c15t/core';
import type { Theme } from '@c15t/ui/theme';
import { computed, inject, onScopeDispose, shallowRef, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

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
 * The experiment definition the arm is resolved against: the one the
 * kernel was created with when the plugin owns the kernel, so a config
 * change after install cannot render an arm the assignment never named;
 * the live config otherwise (a borrowed runtime, a bare kernel).
 */
const useExperimentDefinition = function useExperimentDefinition(): Ref<
	ConsentExperiment | undefined
> {
	const context = inject(symbolKernelContext, undefined);
	const config = useConsentConfig();
	return computed(() =>
		context?.ownsKernel ? context.experimentDefinition : config.value.experiment
	);
};

/**
 * The presentation experiment arm this visitor runs, or `null` while no
 * experiment is configured or the arm is not assigned yet. Built-in
 * assignment lands on mount; a host-resolved `variant` is known at once.
 *
 * @returns The assignment, reactive to the kernel snapshot.
 * @throws {Error} When no snapshot, kernel context or kernel is provided.
 *
 * @example
 * ```ts
 * const assignment = useExperiment();
 * watchEffect(() => console.log(assignment.value?.variant));
 * ```
 */
export const useExperiment =
	function useExperiment(): ComputedRef<Readonly<ExperimentAssignment> | null> {
		const snapshot = useAnySnapshot();
		return computed(() => snapshot.value.experiment);
	};

/**
 * The configured `presentation` with the assigned experiment arm merged
 * over it. Equal to `presentation` while no arm is assigned.
 *
 * @returns The presentation to render, reactive to the assignment.
 * @throws {Error} When no snapshot, kernel context or kernel is provided.
 *
 * @example
 * ```ts
 * const presentation = useResolvedPresentation();
 * const variant = computed(() => presentation.value?.prompt?.variant);
 * ```
 */
export const useResolvedPresentation =
	function useResolvedPresentation(): ComputedRef<
		ConsentPresentation | undefined
	> {
		const config = useConsentConfig();
		const definition = useExperimentDefinition();
		const experiment = useExperiment();
		return computed(() =>
			applyExperimentAssignment(
				config.value.presentation,
				definition.value,
				experiment.value
			)
		);
	};

/**
 * A host theme with the assigned experiment arm's `theme` merged over it.
 *
 * The Vue package renders no theme tokens itself, so the host passes the
 * theme it renders and applies the result (for example through
 * `generateThemeCSS` from `@c15t/ui/theme`). Equal to `base` while no arm
 * is assigned or the arm has no theme.
 *
 * @param base - The host theme, or nothing.
 * @returns The theme to render, reactive to `base` and the assignment.
 * @throws {Error} When no snapshot, kernel context or kernel is provided.
 *
 * @example
 * ```ts
 * const theme = useResolvedTheme(() => props.theme);
 * const css = computed(() => (theme.value ? generateThemeCSS(theme.value) : ''));
 * ```
 */
export const useResolvedTheme = function useResolvedTheme(
	base?: MaybeRefOrGetter<Theme | undefined>
): ComputedRef<Theme | undefined> {
	const definition = useExperimentDefinition();
	const experiment = useExperiment();
	return computed(() =>
		applyExperimentTheme(toValue(base), definition.value, experiment.value)
	);
};
