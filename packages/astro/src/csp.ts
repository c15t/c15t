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
 * - the colour-scheme script, the banner reveal scripts, the first-paint
 *   stylesheet, the theme stylesheet (one per experiment arm) and the
 *   inline `scripts` entries
 *   the loader injects depend only on the integration options, so their
 *   hashes are known at config time and handed to Astro's config here;
 * - the per-visitor boot payload is a `type="application/json"` data
 *   block, which never runs and which CSP does not govern.
 *
 * The inline `scripts` a `clientEntrypoint` adds are the exception: that
 * module only runs in the browser, so no hash for them can be computed
 * here. The browser hashes them itself and names any the policy lacks.
 *
 * @internal
 */

import { applyExperimentTheme } from '@c15t/core';
import { isIABConfigured } from '@c15t/core/runtime';

import { INLINE_IAB_STYLES_CSS, INLINE_STYLES_CSS } from './inline-styles';
import { hashSource } from './libs/csp-hash';
import type { CspHashAlgorithm, CspHashSource } from './libs/csp-hash';
import {
	buildBannerRevealScript,
	buildColorSchemeScript,
	buildThemeCSS,
} from './server';
import type { C15tBrowserCsp, C15tResolvedOptions } from './types';

export type { CspHashAlgorithm } from './libs/csp-hash';

/** Source hashes in the `sha256-…` form a CSP directive takes. */
export interface InlineCodeHashes {
	scripts: CspHashSource[];
	styles: CspHashSource[];
}

/**
 * The hashes of every inline script and style the c15t components can
 * render for these options.
 *
 * The per-visitor boot payload is not among them: it renders as a JSON data
 * block, which a policy does not need to allow. Neither are `scripts`
 * entries a `clientEntrypoint` adds, which the config never sees; see
 * {@link buildAstroCsp} for how the browser reports those.
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
		// The first-paint rules the components inline, unless the page
		// links c15t's stylesheet instead.
		options.inlineStyles === false ? '' : INLINE_STYLES_CSS,
		options.inlineStyles && isIABConfigured(options.iab)
			? INLINE_IAB_STYLES_CSS
			: '',
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
 * The script hashes a site lists in its own Astro CSP config.
 *
 * @param csp - The site's `csp` value.
 * @returns The hashes, or an empty list when it sets none.
 */
const readSiteScriptHashes = function readSiteScriptHashes(
	csp: unknown
): string[] {
	if (typeof csp !== 'object' || csp === null) {
		return [];
	}
	const hashes = (csp as { scriptDirective?: { hashes?: unknown } })
		.scriptDirective?.hashes;
	return Array.isArray(hashes)
		? hashes.filter((hash): hash is string => typeof hash === 'string')
		: [];
};

/** What the integration does with Astro's CSP turned on. */
export interface AstroCspSetup {
	/** The `updateConfig()` argument that allows c15t's inline code. */
	update: Record<string, unknown>;
	/**
	 * What the browser checks `clientEntrypoint` inline scripts against.
	 * Only set with a `clientEntrypoint`, the one source of scripts the
	 * config cannot hash.
	 */
	browser?: C15tBrowserCsp;
}

/**
 * Allow c15t's inline code under Astro's CSP.
 *
 * The algorithm is always set: a site that enabled CSP with `csp: true`
 * gets Astro's defaults filled in before integrations run, and an object
 * merged over `true` would otherwise leave the digest unset.
 *
 * Inline `scripts` from a `clientEntrypoint` cannot be hashed here, because
 * that module only runs in the browser. The browser would block them with
 * a violation that does not say which script it was, so the policy's hashes
 * travel to the browser, which hashes each of those scripts and logs the
 * hash of any the policy lacks.
 *
 * @param config - The Astro config `astro:config:setup` receives.
 * @param options - The resolved integration options.
 * @returns The config update and the browser's copy of the script hashes,
 * or `undefined` without CSP.
 */
export const buildAstroCsp = async function buildAstroCsp(
	config: unknown,
	options: C15tResolvedOptions
): Promise<AstroCspSetup | undefined> {
	const found = findAstroCsp(config);
	if (!found) {
		return undefined;
	}
	const { scripts, styles } = await buildInlineCodeHashes(
		options,
		found.algorithm
	);
	const update = {
		[found.key]: {
			csp: {
				algorithm: found.algorithm,
				...(scripts.length > 0 && { scriptDirective: { hashes: scripts } }),
				...(styles.length > 0 && { styleDirective: { hashes: styles } }),
			},
		},
	};
	if (!options.clientEntrypoint) {
		return { update };
	}
	const siteCsp = (config as Record<string, { csp?: unknown }>)[found.key]?.csp;
	return {
		browser: {
			algorithm: found.algorithm,
			scriptHashes: [
				...new Set([...scripts, ...readSiteScriptHashes(siteCsp)]),
			],
		},
		update,
	};
};
