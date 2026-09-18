/**
 * Per-iframe reconciliation.
 *
 * Pure-ish: `reconcileIframe` reads attributes from the iframe and
 * mutates `src` / `data-src` based on consent. No closure capture, no
 * kernel access — the snapshot-derived `ReconcilePass` is built once
 * by `buildReconcilePass` and shared across every iframe in the pass.
 *
 * Semantics:
 * - iframes WITHOUT `data-category` or `data-vendor` are untouched.
 * - iframes WITH `data-category` and/or `data-vendor`:
 *   - consent granted + HTTP(S) `data-src` but no `src` → set resolved src
 *   - consent NOT granted + has `src`              → removeAttribute('src')
 *   Outside IAB mode a `data-vendor` the subject turned off denies the
 *   iframe even when its category passes.
 */
import type { AllConsentNames } from '../../consent/consent-types';
import { allConsentNames } from '../../consent/consent-types';
import type { ConsentSnapshot, ConsentState } from '../../types';
import { deniedVendorIds, getEffectiveGateState, has } from '../has';

/**
 * Per-pass eligibility context. Built once per kernel tick / DOM scan
 * and reused for every iframe in that pass.
 */
export interface ReconcilePass {
	consents: ConsentState;
	/** Vendors the subject turned off, or `null` when none is denied. */
	vendorDenied: ReadonlySet<string> | null;
	/** Vendor denials are inert in IAB mode. */
	isIabMode: boolean;
}

/**
 * Build a `ReconcilePass` from the current snapshot. Pure.
 */
export const buildReconcilePass = function buildReconcilePass(
	snapshot: ConsentSnapshot
): ReconcilePass {
	return {
		consents: getEffectiveGateState(snapshot).effectivePermissions,
		isIabMode: snapshot.model === 'iab',
		vendorDenied: deniedVendorIds(snapshot),
	};
};

/**
 * Read the `data-vendor` attribute. Unknown ids are not an error: a vendor
 * the subject never saw cannot have been turned off, so it is granted.
 */
export const determineVendor = function determineVendor(
	iframe: HTMLIFrameElement
): string | undefined {
	const raw = iframe.getAttribute('data-vendor');
	return raw ? raw : undefined;
};

/**
 * Read the `data-category` attribute and validate it as a known consent
 * category name. Returns `undefined` when the attribute is absent.
 *
 * Throws on invalid values — that's a config bug, not user data, and
 * silent failure would be harder to debug than a throw.
 */
export const determineCategory = function determineCategory(
	iframe: HTMLIFrameElement
): AllConsentNames | undefined {
	const raw = iframe.getAttribute('data-category');
	if (!raw) {
		return undefined;
	}
	if (!allConsentNames.includes(raw as AllConsentNames)) {
		throw new Error(
			`c15t iframe-blocker: invalid data-category "${raw}". Must be one of: ${allConsentNames.join(
				', '
			)}`
		);
	}
	return raw as AllConsentNames;
};

/**
 * Marks an iframe the blocker paused, as opposed to one whose author uses
 * `data-src` for their own lazy loading. Only a marked iframe is restored
 * when its last gate attribute is removed.
 */
export const PAUSED_ATTRIBUTE = 'data-c15t-paused';

/** Move a paused `data-src` back to `src` when it is a web URL. */
const restoreSource = function restoreSource(iframe: HTMLIFrameElement): void {
	const dataSrc = iframe.getAttribute('data-src');
	if (!dataSrc) {
		return;
	}
	let source: URL;
	try {
		source = new URL(dataSrc, iframe.ownerDocument.baseURI);
	} catch {
		return;
	}
	// Parse before checking the scheme: browsers normalize control characters.
	if (source.protocol !== 'http:' && source.protocol !== 'https:') {
		return;
	}
	iframe.setAttribute('src', source.href);
	iframe.removeAttribute('data-src');
	iframe.removeAttribute(PAUSED_ATTRIBUTE);
};

/**
 * Apply the consent gate to a single iframe. Mutates the iframe's
 * `src` / `data-src` attributes. No-op for iframes without a
 * `data-category` or `data-vendor` attribute. An iframe with only
 * `data-vendor` is gated on the vendor alone.
 */
export const reconcileIframe = function reconcileIframe(
	iframe: HTMLIFrameElement,
	pass: ReconcilePass
): void {
	const category = determineCategory(iframe);
	const vendor = determineVendor(iframe);
	// No gate left. An iframe the blocker paused earlier is restored: its
	// last attribute was removed, so nothing gates it any more. One that was
	// never gated has no `data-src` of ours and is left alone.
	if (!category && !vendor) {
		if (iframe.getAttribute(PAUSED_ATTRIBUTE) !== null) {
			restoreSource(iframe);
		}
		return;
	}

	const categoryAllowed = category ? has(category, pass.consents) : true;
	const vendorAllowed =
		vendor === undefined ||
		pass.isIabMode ||
		pass.vendorDenied === null ||
		!pass.vendorDenied.has(vendor);
	const allowed = categoryAllowed && vendorAllowed;
	const dataSrc = iframe.getAttribute('data-src');

	if (allowed) {
		if (dataSrc && !iframe.getAttribute('src')) {
			restoreSource(iframe);
		}
		return;
	}

	// Not allowed. Clear src if present.
	const src = iframe.getAttribute('src');
	if (src) {
		if (!dataSrc) {
			iframe.setAttribute('data-src', src);
		}
		iframe.removeAttribute('src');
		// Marked only when the blocker itself moved the source: an author's own
		// lazy `data-src` with no `src` was never paused and is never restored.
		iframe.setAttribute(PAUSED_ATTRIBUTE, '');
	}
};

/**
 * Walk every iframe in the document and apply the consent gate. Builds
 * the `ReconcilePass` once and reuses it across iframes — O(n) work.
 */
export const reconcileAllIframes = function reconcileAllIframes(
	snapshot: ConsentSnapshot
): void {
	const iframes = document.querySelectorAll('iframe');
	const pass = buildReconcilePass(snapshot);
	for (const iframe of Array.from(iframes) as HTMLIFrameElement[]) {
		reconcileIframe(iframe, pass);
	}
};
