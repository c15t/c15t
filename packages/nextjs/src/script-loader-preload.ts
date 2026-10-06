/**
 * Start a returning visitor's script loader before the page hydrates.
 *
 * The React provider loads the script loader on demand from its mount
 * effect, which runs once the whole tree has hydrated. A visitor whose
 * stored choice already grants a configured script then waits one more
 * request after hydration before those scripts start: a round trip on a
 * phone. The server knows the stored choice, but not the chunk's URL, so
 * the root starts the same `import()` during its first render instead.
 * The provider's own import then finds the module loaded or on its way.
 */
import { createConsentKernel, evaluateConsent } from '@c15t/core';
import type { KernelOverrides } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import type {
	ConsentControlOptions,
	ConsentRuntimeOptions,
} from '@c15t/core/runtime';
import { runtimeConsentScope } from '@c15t/core/runtime/provider';

import type { ConsentState } from './types';

/**
 * Load the script loader now when the server-resolved `state` shows a
 * stored choice that lets one of `scripts` run. Call it once, from the
 * root's first render in the browser.
 *
 * Every page with `scripts` loads the script loader after hydration, for
 * every visitor, so this changes when the chunk loads, not whether. A
 * first visit and a stored choice that lets no script run keep it after
 * hydration, behind the banner and the page's own code.
 *
 * Each script goes through the script loader's own consent check, against
 * the snapshot a kernel built from `state` starts with. That kernel takes
 * the consent scope and vendors the provider's kernel takes, so it asks
 * about the same categories and honors the same vendor switches. A grant
 * the policy restricts, such as one active GPC denies, counts as denied.
 * So does GPC the browser reports, which the provider's kernel applies
 * when it starts.
 *
 * Imports the specifier the React provider imports, so the bundler gives
 * both one chunk. The kernel, its scope and `evaluateConsent` are in the
 * provider's first-load code already.
 *
 * @param state - The root's `state`, resolved or streaming.
 * @param scripts - The root's `scripts`.
 * @param options - The root's `options`, with its `networkBlocker` and
 * `vendors`: what the provider builds its kernel's scope, overrides and
 * external consent source from.
 * @internal
 */
export const preloadScriptLoader = function preloadScriptLoader(
	state: ConsentState | PromiseLike<ConsentState>,
	scripts: Script[] | undefined,
	options?: ConsentControlOptions &
		Pick<
			ConsentRuntimeOptions,
			'consentCategories' | 'networkBlocker' | 'vendors'
		> & {
			enabled?: boolean;
			overrides?: KernelOverrides;
		}
): void {
	if (typeof window === 'undefined' || !scripts?.length) {
		return;
	}
	// An external source decides consent, not the stored choice, unless the
	// provider is disabled: then it is ignored and every category is granted.
	if (options?.consentSource && options.enabled !== false) {
		return;
	}
	void (async () => {
		try {
			// A disabled provider grants every category, so its scripts run.
			if (options?.enabled === false) {
				await import('@c15t/core/modules/script-loader');
				return;
			}
			const resolved = await state;
			if (!resolved.initialRecords?.choice) {
				return;
			}
			const snapshot = createConsentKernel({
				...resolved,
				...runtimeConsentScope({ ...options, scripts }, resolved),
				initialOverrides: {
					...resolved.initialOverrides,
					...options?.overrides,
				},
				initialPrivacySignals: {
					gpc:
						resolved.initialPrivacySignals?.gpc === true ||
						(navigator as { globalPrivacyControl?: unknown })
							.globalPrivacyControl === true,
				},
			}).getSnapshot();
			// The loader mounts an `alwaysLoad` script whatever the choice.
			if (
				scripts.some(
					(script) =>
						script.alwaysLoad === true || evaluateConsent(script, snapshot)
				)
			) {
				await import('@c15t/core/modules/script-loader');
			}
		} catch {
			// The provider loads it again after mount, and reports a failure.
		}
	})();
};
