/**
 * The `c15tVue` plugin for tests whose subject is not the mode. Their
 * options name a backend the way older tests did, with `backendURL`; this
 * wrapper turns it into `hosted()` and installs the real plugin. A test
 * that passes `mode` or `runtime` gets the plugin unchanged.
 */
import { hosted } from '@c15t/core';
import type { App, Plugin } from 'vue';

import { c15tVue as plugin } from '../index';
import type { C15tVuePluginOptions as PluginOptions } from '../index';
import type { RuntimeConsentConfig } from '../runtime/kernel';

// oxlint-disable-next-line oxc/no-barrel-file -- A test stand-in for the plugin entry.
export { generateTokensCSS } from '../index';

/** The plugin options, with `backendURL` standing in for a hosted mode. */
export type C15tVuePluginOptions = Partial<RuntimeConsentConfig> & {
	/** The domain `hosted()` sends with saves. */
	domain?: string;
} & Partial<Pick<PluginOptions, 'mode' | 'runtime'>>;

export const c15tVue: Plugin<[C15tVuePluginOptions?]> = {
	install(app: App, options: C15tVuePluginOptions = {}) {
		const { backendURL, domain, ...rest } = options;
		plugin.install?.(
			app,
			(rest.mode || rest.runtime
				? rest
				: {
						...rest,
						mode: hosted({ backendURL: backendURL ?? '/api/c15t', domain }),
					}) as PluginOptions
		);
	},
};
