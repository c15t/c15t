/**
 * Name the `clientEntrypoint` inline scripts Astro's CSP will block.
 *
 * The integration hashes every inline script it can see when Astro loads
 * the config, including the integration's own `scripts` option. The
 * `clientEntrypoint` module only runs in the browser, so the inline scripts
 * it adds never reach that list. The browser then refuses them with a
 * violation that does not say which c15t script it was, after the visitor
 * granted the category. This hashes each one the way the browser checks
 * it and logs the hash to add for any the policy does not allow.
 *
 * @internal
 */

import type { Script } from '@c15t/core';

import { hashSource } from '../libs/csp-hash';
import type { C15tBrowserCsp } from '../types';

/**
 * Log an error for each inline script whose hash the policy lacks.
 *
 * Scripts that carry their own `nonce`, or that load from `src`, are not
 * checked: the policy allows those some other way.
 *
 * @param scripts - The scripts from the `clientEntrypoint` module.
 * @param csp - The policy's algorithm and script hashes.
 * @returns Resolves once every script is checked.
 */
export const reportUnhashedScripts = async function reportUnhashedScripts(
	scripts: readonly Script[],
	csp: C15tBrowserCsp
): Promise<void> {
	// `crypto.subtle` only exists in a secure context; a plain-HTTP page is
	// left to the browser's own violation report.
	if (!globalThis.crypto?.subtle) {
		return;
	}
	const allowed = new Set(csp.scriptHashes);
	const inline = scripts.filter(
		(script): script is Script & { textContent: string } =>
			Boolean(script.textContent) && !script.nonce
	);
	const hashes = await Promise.all(
		inline.map((script) => hashSource(script.textContent, csp.algorithm))
	);
	inline.forEach((script, index) => {
		const hash = hashes[index];
		if (!hash || allowed.has(hash)) {
			return;
		}
		console.error(
			`@c15t/astro: Astro's Content Security Policy will block the inline script '${script.id}' from clientEntrypoint. Add '${hash}' to scriptDirective.hashes in the csp config, or move the script into the integration's \`scripts\` option, which c15t hashes for you.`
		);
	});
};
