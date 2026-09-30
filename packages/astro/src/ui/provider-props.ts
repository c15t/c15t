/**
 * Props for the Svelte dialog island.
 *
 * The page runtime owns the kernel and every side-effecting module, so the
 * provider is handed it through `runtime` and neither starts nor disposes
 * it. Everything else it gets here is presentation: categories, legal links
 * and theme tokens the banner and dialog both read.
 */

import { applyExperimentTheme } from '@c15t/core';
import type { ConsentRuntime } from '@c15t/core/runtime';

import type { C15tResolvedOptions, C15tUIAdapterName } from '../types';
import { themeSlotsToComponents } from './theme-slot-components';
import type { ComponentSlotMap } from './theme-slot-components';

/**
 * The slice of the integration options a dialog island renders with.
 *
 * Named so every framework surface can state the same shape instead of
 * widening to `Record<string, unknown>` and casting it back.
 */
export interface DialogPresentationOptions {
	/**
	 * Always `null`: the island's provider must leave `c15t-dark` alone.
	 *
	 * The page's client boot owns the class on `<html>`, or the site does
	 * with `colorScheme: 'none'`. A provider given no scheme falls back to
	 * mirroring a `.dark` class and watching `<html>` while it is mounted,
	 * so opening a dialog on a page without `.dark` would turn it light.
	 */
	colorScheme: null;
	consentCategories?: C15tResolvedOptions['consentCategories'];
	/**
	 * The configured experiment. The island reads the assigned arm from the
	 * runtime snapshot and merges that arm over `presentation`; `theme`
	 * below already carries the arm's theme overrides.
	 */
	experiment?: C15tResolvedOptions['experiment'];
	legalLinks?: C15tResolvedOptions['legalLinks'];
	presentation?: C15tResolvedOptions['presentation'];
	theme?: C15tResolvedOptions['theme'];
	/**
	 * `theme.slots` as the `components` map the React and Vue providers
	 * read. The Svelte provider reads `theme.slots` itself and gets none.
	 */
	components?: ComponentSlotMap;
}

/** Props handed to `ConsentManagerProvider` by the Svelte dialog surface. */
export interface DialogProviderProps {
	/** The page-level runtime. The provider borrows it, it does not own it. */
	runtime: ConsentRuntime;
	/** Presentation options forwarded to the provider. */
	options: DialogPresentationOptions;
}

/**
 * Build the provider props for a dialog island.
 *
 * @param runtime - The page runtime that owns the kernel.
 * @param options - The resolved integration options.
 * @param framework - The island's framework. React and Vue get
 * `theme.slots` translated into `components`.
 * @returns Props for `ConsentManagerProvider`.
 */
export const buildProviderProps = function buildProviderProps(
	runtime: ConsentRuntime,
	options: C15tResolvedOptions,
	framework: C15tUIAdapterName = 'svelte'
): DialogProviderProps {
	// The arm's theme overrides ride on the host theme. The island mounts
	// after `start()`, so the assignment is already known.
	const theme = applyExperimentTheme(
		options.theme,
		options.experiment,
		runtime.kernel.getSnapshot().experiment
	);
	const presentationOptions: DialogPresentationOptions = {
		colorScheme: null,
		consentCategories: options.consentCategories,
		experiment: options.experiment,
		legalLinks: options.legalLinks,
		presentation: options.presentation,
		theme,
	};
	if (framework !== 'svelte') {
		const components = themeSlotsToComponents(
			theme,
			framework === 'react' ? 'className' : 'class'
		);
		if (components) {
			presentationOptions.components = components;
		}
	}
	return { options: presentationOptions, runtime };
};
