import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';
import { trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		klaviyo?: Record<string, (...args: unknown[]) => unknown>;
		_klOnsite?: unknown[];
	}
}

/**
 * Klaviyo.js loader and onsite object.
 *
 * Klaviyo serves signup forms and Active on Site tracking from the same
 * account-keyed bundle, and the bundle has no feature-level consent switch,
 * so the whole bundle waits for the configured category condition.
 */
export const klaviyoManifest = {
	...vendorManifestContract,
	category: '{{category}}',
	install: [
		{
			async: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'klaviyo',
	vendorDetails: {
		homepageUrl: 'https://www.klaviyo.com/',
		legalName: 'Klaviyo, Inc.',
		name: 'Klaviyo',
		privacyPolicyUrl:
			'https://privacy.klaviyo.com/policies/?name=klaviyo-privacy-policy',
	},
} as const satisfies VendorManifest;

/**
 * How much of Klaviyo's onsite bundle the helper allows.
 *
 * - `full` loads forms and person-level web tracking.
 * - `forms-only` sets Klaviyo's `__kla_off` opt-out cookie before the bundle
 *   runs, so forms still render but Klaviyo stops web tracking.
 */
export type KlaviyoMode = 'full' | 'forms-only';

export interface KlaviyoOptions {
	/**
	 * Six-character public API key, also called the site ID, from
	 * **Settings > Account > API keys** in Klaviyo. Never pass a private key
	 * (`pk_...`).
	 * @example `'AbC123'`
	 */
	publicApiKey: string;

	/**
	 * Which part of the onsite bundle to allow.
	 * @default 'full'
	 */
	mode?: KlaviyoMode;

	/**
	 * Consent condition that must hold before Klaviyo.js loads.
	 *
	 * Defaults to `{ and: ['marketing', 'measurement'] }` in `full` mode and
	 * `'marketing'` in `forms-only` mode.
	 */
	category?: HasCondition<AllConsentNames>;

	/**
	 * HTTPS URL that serves Klaviyo.js, such as a first-party proxy.
	 * @default `https://static.klaviyo.com/onsite/js/<publicApiKey>/klaviyo.js`
	 */
	scriptUrl?: string;
}

const PUBLIC_API_KEY_PATTERN = /^[A-Za-z0-9]{6}$/u;

const DEFAULT_CATEGORIES = {
	'forms-only': 'marketing',
	full: { and: ['marketing', 'measurement'] },
} as const satisfies Record<KlaviyoMode, HasCondition<AllConsentNames>>;

/** Describes what is wrong with a non-blank public API key, if anything. */
const getPublicApiKeyProblem = function getPublicApiKeyProblem(
	key: string
): string | undefined {
	if (key.startsWith('pk_')) {
		return 'klaviyo: publicApiKey received a private API key. Use the six-character public API key from Settings > Account > API keys, and revoke the exposed private key';
	}

	if (!PUBLIC_API_KEY_PATTERN.test(key)) {
		return 'klaviyo: publicApiKey must be the six-character public API key from Settings > Account > API keys';
	}

	return undefined;
};

const validateScriptUrl = function validateScriptUrl(
	value: string | undefined
): string | undefined {
	const scriptUrl = trimToUndefined(value);
	if (scriptUrl === undefined) {
		return undefined;
	}

	let parsed: URL;
	try {
		parsed = new URL(scriptUrl);
	} catch {
		throw new Error('klaviyo: scriptUrl must be a valid https URL');
	}

	if (parsed.protocol !== 'https:') {
		throw new Error('klaviyo: scriptUrl must be a valid https URL');
	}

	return scriptUrl;
};

/**
 * Installs the `klaviyo` object from Klaviyo's "load the klaviyo object"
 * snippet when the page has none. Calls made before Klaviyo.js loads are
 * queued on `_klOnsite`, and each returns a promise the bundle resolves when
 * it replays the call.
 */
const installKlaviyoObject = function installKlaviyoObject(): void {
	if (window.klaviyo) {
		return;
	}

	window._klOnsite ||= [];
	// The proxy answers every method name with a queueing function.
	window.klaviyo = new Proxy(
		{},
		{
			get(target: Record<PropertyKey, unknown>, method) {
				// Unlike Klaviyo's snippet, leave symbols, `then`, `toJSON` and
				// Object.prototype members alone. Queuing them when something
				// awaits, serializes or stringifies the object makes Klaviyo.js
				// throw during replay, and every queued call after them hangs.
				if (
					typeof method !== 'string' ||
					method === 'then' ||
					method === 'toJSON' ||
					method in target
				) {
					return target[method];
				}

				if (method === 'push') {
					return (...items: unknown[]) => window._klOnsite?.push(...items);
				}

				return (...args: unknown[]) => {
					const callback =
						typeof args.at(-1) === 'function'
							? (args.pop() as (result: unknown) => void)
							: undefined;

					return new Promise((resolve) => {
						window._klOnsite?.push([
							method,
							...args,
							(result: unknown) => {
								// oxlint-disable-next-line promise/prefer-await-to-callbacks, node/callback-return -- Klaviyo's object API takes an optional trailing callback.
								callback?.(result);
								resolve(result);
							},
						]);
					});
				};
			},
		}
	) as Window['klaviyo'];
};

/**
 * Creates a Klaviyo onsite script.
 *
 * By default Klaviyo.js loads only once both marketing and measurement are
 * allowed, because the bundle serves signup forms and behaviour tracking
 * together. The helper sends no `identify` or `track` calls of its own.
 *
 * @param options - Klaviyo account and consent configuration.
 * @returns The Klaviyo script configuration.
 * @throws {Error} When `mode` is not `'full'` or `'forms-only'`, or
 *   `scriptUrl` is not an https URL.
 * @remarks When `publicApiKey` is missing, blank, or not a six-character
 *   public API key, the helper logs the problem with `console.error` and
 *   returns a script that never loads.
 *
 * @example
 * ```ts
 * import { klaviyo } from '@c15t/integrations/klaviyo';
 *
 * klaviyo({ publicApiKey: 'AbC123' });
 * ```
 *
 * @see https://help.klaviyo.com/hc/en-us/articles/115005076767
 */
export const klaviyo = function klaviyo(options: KlaviyoOptions): Script {
	const mode = options.mode ?? 'full';
	if (mode !== 'full' && mode !== 'forms-only') {
		throw new Error("klaviyo: mode must be 'full' or 'forms-only'");
	}
	const category = options.category ?? DEFAULT_CATEGORIES[mode];

	const publicApiKey = readId(options?.publicApiKey);
	if (publicApiKey === undefined) {
		return skipMissingId('klaviyo', 'publicApiKey', {
			category,
			id: 'klaviyo',
		});
	}
	const problem = getPublicApiKeyProblem(publicApiKey);
	if (problem !== undefined) {
		return skipScript(problem, { category, id: 'klaviyo' });
	}

	const script = resolveManifest(klaviyoManifest, {
		category,
		scriptUrl:
			validateScriptUrl(options.scriptUrl) ??
			`https://static.klaviyo.com/onsite/js/${publicApiKey}/klaviyo.js`,
	});

	return {
		...script,
		onBeforeLoad() {
			if (mode === 'forms-only') {
				// Klaviyo.js reads this cookie when it starts, so it must exist
				// before the loader is inserted.
				// oxlint-disable-next-line unicorn/no-document-cookie -- Klaviyo documents this cookie as its opt-out switch.
				document.cookie = '__kla_off=true; path=/; SameSite=Lax';
			}
			installKlaviyoObject();
		},
	};
};
