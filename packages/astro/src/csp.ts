/**
 * Content Security Policy hashes for the inline code c15t renders.
 *
 * Astro's CSP feature (`security.csp`, or `experimental.csp` before Astro 6)
 * hashes the scripts and styles Astro processes, but not the `is:inline`
 * elements a component writes itself. Its per-render hooks
 * (`Astro.csp.insertScriptHash()`) do not help either: the policy header is
 * computed before `<body>` renders, and the banner lives there.
 *
 * What c15t inlines is either static for a given set of options, or data:
 *
 * - the colour-scheme script, the banner reveal scripts, the theme
 *   stylesheet (one per experiment arm) and the inline `scripts` entries
 *   the loader injects depend only on the integration options, so their
 *   hashes are known at config time and handed to Astro's config here;
 * - the per-visitor boot payload is a `type="application/json"` data
 *   block, which never runs and which CSP does not govern.
 *
 * @internal
 */

import { applyExperimentTheme } from '@c15t/core';

import {
	buildBannerRevealScript,
	buildColorSchemeScript,
	buildThemeCSS,
} from './server';
import type { C15tResolvedOptions } from './types';

/** A hash algorithm Astro's CSP feature accepts. */
export type CspHashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

const PREFIXES = {
	'SHA-256': 'sha256-',
	'SHA-384': 'sha384-',
	'SHA-512': 'sha512-',
} as const satisfies Record<CspHashAlgorithm, string>;

/** Source hashes in the `sha256-…` form a CSP directive takes. */
export interface InlineCodeHashes {
	scripts: `sha${number}-${string}`[];
	styles: `sha${number}-${string}`[];
}

/**
 * Hash one inline element's text the way a browser checks it.
 *
 * @param content - The element's exact text content.
 * @param algorithm - The digest to use.
 * @returns The hash source, such as `sha256-…`.
 */
const hashSource = async function hashSource(
	content: string,
	algorithm: CspHashAlgorithm
): Promise<`sha${number}-${string}`> {
	const digest = await globalThis.crypto.subtle.digest(
		algorithm,
		new TextEncoder().encode(content)
	);
	let binary = '';
	for (const byte of new Uint8Array(digest)) {
		binary += String.fromCharCode(byte);
	}
	return `${PREFIXES[algorithm]}${btoa(binary)}` as `sha${number}-${string}`;
};

/**
 * The hashes of every inline script and style the c15t components can
 * render for these options.
 *
 * The per-visitor boot payload is not among them: it renders as a JSON data
 * block, which a policy does not need to allow. Neither are `scripts`
 * entries a `clientEntrypoint` adds, which the config never sees.
 *
 * @param options - The resolved integration options.
 * @param algorithm - The digest Astro's CSP is configured with.
 * @returns Script and style hashes.
 */
export const buildInlineCodeHashes = async function buildInlineCodeHashes(
	options: C15tResolvedOptions,
	algorithm: CspHashAlgorithm = 'SHA-256'
): Promise<InlineCodeHashes> {
	const scripts = [
		buildColorSchemeScript(options.colorScheme),
		buildBannerRevealScript(options.storageConfig, 'consent-banner'),
		buildBannerRevealScript(options.storageConfig, 'iab-consent-banner'),
		// The loader injects an inline `scripts` entry with exactly this text.
		...(options.scripts ?? []).map((script) => script.textContent ?? ''),
	].filter(Boolean);
	// The components render the assigned arm's theme, so every arm's
	// stylesheet needs a hash. `control` renders the host theme.
	const { experiment } = options;
	const armThemes = experiment
		? Object.keys(experiment.arms).map((arm) =>
				applyExperimentTheme(options.theme, experiment, {
					arm,
					id: experiment.id,
				})
			)
		: [];
	const themes = [options.theme, ...armThemes];
	const styles = [
		...new Set(themes.map((theme) => buildThemeCSS(theme))),
	].filter(Boolean);
	return {
		scripts: await Promise.all(
			scripts.map((script) => hashSource(script, algorithm))
		),
		styles: await Promise.all(
			styles.map((style) => hashSource(style, algorithm))
		),
	};
};

/** Where an Astro version keeps its CSP config. */
type CspConfigKey = 'security' | 'experimental';

/**
 * Find the site's CSP config: `security.csp` from Astro 6,
 * `experimental.csp` in Astro 5.
 *
 * @param config - The Astro config `astro:config:setup` receives.
 * @returns Where CSP is configured and its algorithm, or `undefined` when
 * the site has not turned it on.
 */
export const findAstroCsp = function findAstroCsp(
	config: unknown
): { key: CspConfigKey; algorithm: CspHashAlgorithm } | undefined {
	for (const key of ['security', 'experimental'] as const) {
		const csp = (
			config as Record<string, { csp?: unknown } | undefined> | undefined
		)?.[key]?.csp;
		if (!csp) {
			continue;
		}
		const algorithm =
			(typeof csp === 'object' &&
				(csp as { algorithm?: CspHashAlgorithm }).algorithm) ||
			'SHA-256';
		return { algorithm, key };
	}
	return undefined;
};

/**
 * The config update that allows c15t's inline code under Astro's CSP.
 *
 * The algorithm is always set: a site that enabled CSP with `csp: true`
 * gets Astro's defaults filled in before integrations run, and an object
 * merged over `true` would otherwise leave the digest unset.
 *
 * @param config - The Astro config `astro:config:setup` receives.
 * @param options - The resolved integration options.
 * @returns The `updateConfig()` argument, or `undefined` without CSP.
 */
export const buildAstroCspUpdate = async function buildAstroCspUpdate(
	config: unknown,
	options: C15tResolvedOptions
): Promise<Record<string, unknown> | undefined> {
	const found = findAstroCsp(config);
	if (!found) {
		return undefined;
	}
	const { scripts, styles } = await buildInlineCodeHashes(
		options,
		found.algorithm
	);
	return {
		[found.key]: {
			csp: {
				algorithm: found.algorithm,
				...(scripts.length > 0 && { scriptDirective: { hashes: scripts } }),
				...(styles.length > 0 && { styleDirective: { hashes: styles } }),
			},
		},
	};
};
