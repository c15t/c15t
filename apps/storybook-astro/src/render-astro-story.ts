/**
 * Mount a prerendered `.astro` fragment the way a real Astro page would.
 *
 * An Astro page is server-rendered HTML plus one boot script. This does the
 * same two things: it inlines the config the server produced, drops the
 * markup into the document, and boots `@c15t/astro/client` with the same
 * resolved options and the same Svelte dialog adapter the integration
 * registers. Nothing here is Storybook-specific behaviour — the point is
 * that the story exercises the shipped runtime, not a stand-in.
 */

import {
	boot,
	getConsentClient,
	registerDialogAdapter,
	registerDialogSurface,
} from '@c15t/astro/client';
import prerendered from 'virtual:c15t-astro-prerendered';

import { requireStoryVariant } from './story-variants';

const DIALOG_HOST_ID = 'c15t-dialog-host';

let adaptersRegistered = false;

const registerAdapters = function registerAdapters(): void {
	if (adaptersRegistered) {
		return;
	}
	adaptersRegistered = true;
	registerDialogAdapter(
		'svelte',
		async () => (await import('@c15t/astro/ui/svelte')).svelteDialogAdapter
	);
	registerDialogSurface(
		'svelte',
		() => import('@c15t/astro/islands/consent-dialog-surface.svelte')
	);
};

const clearCookies = function clearCookies(): void {
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
};

/**
 * Tear the previous story's page down.
 *
 * The runtime is a page-level singleton on `window`, so without this the
 * second story in a session would silently reuse the first one's kernel,
 * its consent state and its mounted dialog.
 */
const resetPage = function resetPage(): void {
	getConsentClient()?.dispose();
	document.getElementById(DIALOG_HOST_ID)?.remove();
	for (const host of document.querySelectorAll('[data-c15t-story-host]')) {
		host.remove();
	}
	document.documentElement.classList.remove('c15t-dark');
	window.localStorage.clear();
	clearCookies();
};

/**
 * Render one catalogued Astro variant into the Storybook canvas.
 *
 * @param variantId - The id from the story catalogue.
 * @returns The element Storybook should mount.
 */
export const renderAstroStory = function renderAstroStory(
	variantId: string
): HTMLElement {
	const variant = requireStoryVariant(variantId);
	const entry = prerendered[variantId];
	if (!entry) {
		throw new Error(`Astro variant "${variantId}" was not prerendered.`);
	}

	resetPage();
	registerAdapters();

	const host = document.createElement('div');
	host.setAttribute('data-c15t-story-host', variantId);
	host.innerHTML = entry.html;

	// The banner reads its kernel config off `window` exactly as it does on
	// a server-rendered page, so it must be there before `boot()` runs.
	(window as unknown as Record<string, unknown>).__c15tAstroConfig =
		entry.config;

	if (variant.dark) {
		document.documentElement.classList.add('c15t-dark');
	}

	// Storybook mounts the returned element after the story function
	// returns, but `boot()` has to see the markup to wire the banner. Queue
	// the boot for the next task instead of guessing.
	queueMicrotask(() => {
		const client = boot(entry.options as Parameters<typeof boot>[0]);
		if (variant.openDialog) {
			void client.openDialog(variant.openDialog);
		}
	});

	return host;
};
