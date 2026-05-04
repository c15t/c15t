/**
 * Per-iframe reconciliation.
 *
 * Pure-ish: `reconcileIframe` reads attributes from the iframe and
 * mutates `src` / `data-src` based on consent. No closure capture, no
 * kernel access — the snapshot-derived `ReconcilePass` is built once
 * by `buildReconcilePass` and shared across every iframe in the pass.
 *
 * Semantics (matching v2):
 * - iframes WITHOUT `data-category` are untouched (never blocked).
 * - iframes WITH `data-category`:
 *   - consent granted + has `data-src` but no `src` → move data-src → src
 *   - consent NOT granted + has `src`              → removeAttribute('src')
 */
import type { AllConsentNames } from '../../../types/consent-types';
import { allConsentNames } from '../../../types/consent-types';
import type { ConsentSnapshot, ConsentState } from '../../types';
import { type HasOptions, has } from '../has';

/**
 * Per-pass eligibility context. Built once per kernel tick / DOM scan
 * and reused for every iframe in that pass.
 */
export interface ReconcilePass {
	consents: ConsentState;
	hasOptions: HasOptions;
}

/**
 * Build a `ReconcilePass` from the current snapshot. Pure.
 */
export function buildReconcilePass(snapshot: ConsentSnapshot): ReconcilePass {
	return {
		consents: snapshot.consents as ConsentState,
		hasOptions: {
			policyCategories:
				snapshot.policyCategories.length > 0
					? (snapshot.policyCategories as AllConsentNames[])
					: null,
			policyScopeMode: snapshot.policyScopeMode,
		},
	};
}

/**
 * Read the `data-category` attribute and validate it as a known consent
 * category name. Returns `undefined` when the attribute is absent.
 *
 * Throws on invalid values — that's a config bug, not user data, and
 * silent failure would be harder to debug than a throw.
 */
export function determineCategory(
	iframe: HTMLIFrameElement
): AllConsentNames | undefined {
	const raw = iframe.getAttribute('data-category');
	if (!raw) return undefined;
	if (!allConsentNames.includes(raw as AllConsentNames)) {
		throw new Error(
			`c15t iframe-blocker: invalid data-category "${raw}". Must be one of: ${allConsentNames.join(
				', '
			)}`
		);
	}
	return raw as AllConsentNames;
}

/**
 * Apply the consent gate to a single iframe. Mutates the iframe's
 * `src` / `data-src` attributes. No-op for iframes without a
 * `data-category` attribute.
 */
export function reconcileIframe(
	iframe: HTMLIFrameElement,
	pass: ReconcilePass
): void {
	const category = determineCategory(iframe);
	if (!category) return;

	const allowed = has(category, pass.consents, pass.hasOptions);
	const dataSrc = iframe.getAttribute('data-src');

	if (allowed) {
		if (dataSrc && !iframe.getAttribute('src')) {
			iframe.setAttribute('src', dataSrc);
			iframe.removeAttribute('data-src');
		}
		return;
	}

	// Not allowed. Clear src if present.
	if (iframe.getAttribute('src')) {
		iframe.removeAttribute('src');
	}
}

/**
 * Walk every iframe in the document and apply the consent gate. Builds
 * the `ReconcilePass` once and reuses it across iframes — O(n) work.
 */
export function reconcileAllIframes(snapshot: ConsentSnapshot): void {
	const iframes = document.querySelectorAll('iframe');
	const pass = buildReconcilePass(snapshot);
	for (const iframe of Array.from(iframes) as HTMLIFrameElement[]) {
		reconcileIframe(iframe, pass);
	}
}
