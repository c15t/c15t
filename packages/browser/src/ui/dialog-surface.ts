// Promise chains, not async functions: this module is on first load, and
// the async form costs about 40 bytes gzip there.
/* oxlint-disable promise/prefer-await-to-then, promise/prefer-await-to-callbacks, promise/prefer-catch */
import type { ConsentSnapshot } from '@c15t/core';

import type { ConsentDialogOptions } from '../types';
import type { createDialog as createDialogNow } from './dialog';
import type { Surface, SurfaceContext } from './surface';

// Safari has no requestIdleCallback; a short delay after load stands in.
const IDLE_FALLBACK_DELAY_MS = 200;

type DialogFactory = typeof createDialogNow;

let loading: Promise<DialogFactory> | undefined;

const loadDialog = function loadDialog(): Promise<DialogFactory> {
	loading ??= import('./dialog').then(
		({ createDialog: create }) => create,
		(error: unknown) => {
			// A failed chunk load retries on the next open.
			loading = undefined;
			throw error;
		}
	);
	return loading;
};

/**
 * Start loading the dialog chunk once the page has loaded and the browser
 * is idle. The banner and trigger lead to the dialog, so the first open
 * should not wait for a fetch. Skipped when the visitor asked to save data.
 */
const warmWhenIdle = function warmWhenIdle(): void {
	const { connection } = navigator as Navigator & {
		connection?: { saveData?: boolean };
	};
	if (connection?.saveData === true) {
		return;
	}
	const afterLoad = (): void => {
		const warm = (): void => {
			loadDialog().catch(() => {
				/* the open retries */
			});
		};
		if (typeof window.requestIdleCallback === 'function') {
			window.requestIdleCallback(warm);
		} else {
			window.setTimeout(warm, IDLE_FALLBACK_DELAY_MS);
		}
	};
	if (document.readyState === 'complete') {
		afterLoad();
	} else {
		window.addEventListener('load', afterLoad, { once: true });
	}
};

/**
 * The preference centre, loaded on demand.
 *
 * The dialog, its widget and the preference draft are a separate chunk for
 * bundler users, so a page that only shows the banner never downloads
 * them. The chunk starts loading in idle time once a banner or the trigger
 * is on screen, and at the latest when the dialog opens; the dialog then
 * renders the newest snapshot. The script-tag builds replace this module
 * with `./dialog` at build time, so `c15t.js` stays one file.
 *
 * @param ctx - The mount context.
 * @param options - Dialog options.
 * @param warmOnMount - Truthy when something else on screen opens the
 * dialog (the trigger options), so the chunk warms without a banner.
 * @returns The surface.
 */
export const createDialog = function createDialog(
	ctx: SurfaceContext,
	options: ConsentDialogOptions,
	warmOnMount?: unknown
): Surface {
	let dialog: Surface | null = null;
	let latest: ConsentSnapshot | null = null;
	let requested = false;
	let warmed = false;
	let destroyed = false;

	const warm = function warm(): void {
		if (!warmed) {
			warmed = true;
			warmWhenIdle();
		}
	};
	if (warmOnMount) {
		warm();
	}

	const open = function open(): void {
		loadDialog().then(
			(create) => {
				if (destroyed) {
					return;
				}
				dialog = create(ctx, options);
				if (latest) {
					dialog.sync(latest);
				}
			},
			(error: unknown) => {
				requested = false;
				console.error(
					'@c15t/browser: the preference centre failed to load.',
					error
				);
			}
		);
	};

	return {
		destroy() {
			destroyed = true;
			dialog?.destroy();
		},
		sync(snapshot) {
			if (dialog) {
				dialog.sync(snapshot);
				return;
			}
			latest = snapshot;
			if (snapshot.activeUI === 'banner') {
				warm();
			}
			if (
				requested ||
				snapshot.activeUI !== 'dialog' ||
				snapshot.policyRule.model === 'iab'
			) {
				return;
			}
			requested = true;
			open();
		},
	};
};
