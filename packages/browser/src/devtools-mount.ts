/**
 * Shared by `mountDevTools` and the `c15t.devtools.js` tag, which differ
 * only in which copy of the launcher slot they publish to.
 *
 * @internal
 * @packageDocumentation
 */

import { createDevTools } from '@c15t/dev-tools';
import type { DevToolsInstance, DevToolsOptions } from '@c15t/dev-tools';
import type { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';

import type { ConsentClient } from './types';

/** Presentation options; the kernel and categories come from the client. */
export type BrowserDevToolsOptions = Omit<
	DevToolsOptions,
	'getConsentCategories' | 'kernel'
>;

/** Offers a DevTools launcher to the stock trigger; see `@c15t/ui`. */
export type PublishDevToolsLauncher = typeof publishDevToolsLauncher;

/**
 * Create the panel for a client and offer its launcher to the client's
 * stock trigger, which then shows a DevTools button and docks the panel
 * beside itself. `destroy()` withdraws the offer first.
 *
 * @param client - The page's client.
 * @param options - Panel placement and initial state.
 * @param publish - The launcher slot's `publishDevToolsLauncher`, from the
 * bundle that renders the trigger. Omit to keep the floating launcher.
 * @returns The panel.
 * @internal
 */
export const createBrowserDevTools = function createBrowserDevTools(
	client: ConsentClient,
	options: BrowserDevToolsOptions,
	publish: PublishDevToolsLauncher | undefined
): DevToolsInstance {
	const instance = createDevTools({
		...options,
		clearRecords: options.clearRecords ?? client.runtime.clearRecords,
		getConsentCategories: () => client.consentCategories,
		getPresentation: options.getPresentation ?? (() => client.presentation),
		kernel: client.kernel,
	});
	// An embedded panel has no floating launcher to hand over.
	if (!publish || options.embedded) {
		return instance;
	}
	const withdraw = publish(client.kernel, instance);
	const { destroy } = instance;
	instance.destroy = () => {
		withdraw();
		destroy();
	};
	return instance;
};
