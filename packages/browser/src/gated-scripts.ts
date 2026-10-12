import { allConsentNames, evaluateConsent } from '@c15t/core';
import type { AllConsentNames, ConsentSnapshot, VendorOwner } from '@c15t/core';

/** Attribute that names the category an inert `<script>` waits on. */
export const CATEGORY_ATTRIBUTE = 'data-c15t-category';

/**
 * Attribute that names the vendor an inert `<script>` belongs to. The tag
 * runs once its category is allowed and the visitor has not turned that
 * vendor off. Only read alongside {@link CATEGORY_ATTRIBUTE}.
 */
export const VENDOR_ATTRIBUTE = 'data-c15t-vendor';

/**
 * Set once a gated script has been activated (`true`), rejected for an
 * unknown category (`invalid`), or refused for lacking the page nonce
 * (`untrusted`).
 */
export const ACTIVATED_ATTRIBUTE = 'data-c15t-activated';

/**
 * Whether an inert tag may be activated under the configured nonce.
 *
 * Activation creates a new, non-parser-inserted `<script>`, which a CSP
 * with `'strict-dynamic'` runs without a nonce. Without this check, markup
 * injected through an HTML-injection hole would run once its category is
 * granted. With a nonce configured, only tags carrying that nonce are the
 * page's own. Browsers hide a connected element's nonce attribute, so the
 * property is compared.
 */
const isTrusted = function isTrusted(
	element: HTMLScriptElement,
	nonce: string | undefined
): boolean {
	if (!nonce || element.nonce === nonce) {
		return true;
	}
	// oxlint-disable-next-line no-console -- Security diagnostic for the page author.
	console.warn(
		`@c15t/browser: skipped a ${CATEGORY_ATTRIBUTE} script without the configured nonce. Add nonce="..." to your own gated tags.`,
		element
	);
	element.setAttribute(ACTIVATED_ATTRIBUTE, 'untrusted');
	return false;
};

const COPIED_ATTRIBUTES = [
	'src',
	'async',
	'defer',
	'crossorigin',
	'integrity',
	'referrerpolicy',
	'id',
];

const createReplacement = function createReplacement(
	element: HTMLScriptElement
): HTMLScriptElement {
	// A parsed inert script never executes after changing its type.
	const replacement = element.ownerDocument.createElement('script');
	for (const name of COPIED_ATTRIBUTES) {
		const value = element.getAttribute(name);
		if (value !== null) {
			replacement.setAttribute(name, value);
		}
	}
	// Dynamic external scripts default to async even without the attribute.
	replacement.async = element.hasAttribute('async');
	// Browsers hide nonce content attributes on connected elements.
	replacement.nonce = element.nonce;
	for (const attribute of Array.from(element.attributes)) {
		if (
			attribute.name.startsWith('data-') &&
			attribute.name !== ACTIVATED_ATTRIBUTE
		) {
			replacement.setAttribute(attribute.name, attribute.value);
		}
	}
	replacement.setAttribute(ACTIVATED_ATTRIBUTE, 'true');
	if (!element.hasAttribute('src')) {
		replacement.textContent = element.textContent;
	}
	return replacement;
};

const isAllowed = function isAllowed(
	element: HTMLScriptElement,
	snapshot: ConsentSnapshot
): boolean {
	const category = element.getAttribute(CATEGORY_ATTRIBUTE);
	if (!category) {
		return false;
	}
	if (!allConsentNames.includes(category as AllConsentNames)) {
		// oxlint-disable-next-line no-console -- Authoring-time diagnostic.
		console.warn(
			`@c15t/browser: unknown ${CATEGORY_ATTRIBUTE} "${category}". Expected one of ${allConsentNames.join(', ')}.`
		);
		element.setAttribute(ACTIVATED_ATTRIBUTE, 'invalid');
		return false;
	}
	return evaluateConsent(
		{
			category: category as AllConsentNames,
			vendor: element.getAttribute(VENDOR_ATTRIBUTE) || undefined,
		},
		snapshot
	);
};

interface PendingScript {
	subscribers: Set<() => void>;
}

// Loading belongs to the page, while consent and continuations belong to each
// activator. A replacement client must still wait for its predecessor's script.
const pendingScripts = new WeakMap<Document, PendingScript>();

const trackPendingScript = (script: HTMLScriptElement): PendingScript => {
	const pending: PendingScript = { subscribers: new Set() };
	const { ownerDocument } = script;
	const settled = () => {
		script.removeEventListener('load', settled);
		script.removeEventListener('error', settled);
		pendingScripts.delete(ownerDocument);
		const subscribers = Array.from(pending.subscribers);
		pending.subscribers.clear();
		for (const resume of subscribers) {
			resume();
		}
	};
	pendingScripts.set(ownerDocument, pending);
	script.addEventListener('load', settled);
	script.addEventListener('error', settled);
	return pending;
};

/** A client's script queue, cancelled when that client is disposed. */
interface GatedScriptActivator {
	scan: () => number;
	dispose: () => void;
}

/** Options for {@link createGatedScriptActivator}. */
interface GatedScriptActivatorOptions {
	/** Where to look. Defaults to the document when scanning. */
	root?: ParentNode;
	/** Add discovered categories before evaluating gates. */
	registerCategories?: (categories: AllConsentNames[]) => void;
	/**
	 * Declare every vendor slug a tag has named, with its category. Called
	 * with the whole list whenever a scan finds a new one.
	 */
	declareVendors?: (owners: VendorOwner[]) => void;
	/** When set, only tags carrying this nonce are activated. */
	nonce?: string;
}

/**
 * Own activation ordering without retaining a client outside its lifecycle.
 *
 * @param getSnapshot - Read current consent before each activation.
 * @param options - Scan root, discovery callbacks and the page nonce.
 * @returns A scanner and its disposal function.
 * @internal
 */
export const createGatedScriptActivator = function createGatedScriptActivator(
	getSnapshot: () => ConsentSnapshot,
	options: GatedScriptActivatorOptions = {}
): GatedScriptActivator {
	const { root, registerCategories, declareVendors, nonce } = options;
	// Every slug a tag named, kept after the tag runs: the declaration is
	// what lets a denial recorded for it count at every other gate too.
	const vendorOwners = new Map<string, VendorOwner>();
	let disposed = false;
	let scanning = false;
	let waiting: PendingScript | null = null;
	let stopWaiting: (() => void) | null = null;

	const scan = (): number => {
		if (disposed || scanning) {
			return 0;
		}
		scanning = true;
		const waitFor = (pending: PendingScript) => {
			if (waiting === pending) {
				return;
			}
			stopWaiting?.();
			waiting = pending;
			const resume = () => {
				if (waiting !== pending) {
					return;
				}
				waiting = null;
				stopWaiting = null;
				scan();
			};
			pending.subscribers.add(resume);
			stopWaiting = () => pending.subscribers.delete(resume);
		};
		let activated = 0;
		try {
			const selector = `script[type="text/plain"][${CATEGORY_ATTRIBUTE}]:not([${ACTIVATED_ATTRIBUTE}])`;
			// Untrusted tags are marked, so each is refused (and reported) once
			// and cannot add a category to the UI.
			const elements = Array.from(
				(root ?? document).querySelectorAll<HTMLScriptElement>(selector)
			).filter((element) => isTrusted(element, nonce));
			registerCategories?.(
				elements.flatMap((element) => {
					const category = element.getAttribute(
						CATEGORY_ATTRIBUTE
					) as AllConsentNames;
					return allConsentNames.includes(category) ? [category] : [];
				})
			);
			let namedNewVendor = false;
			for (const element of elements) {
				const category = element.getAttribute(
					CATEGORY_ATTRIBUTE
				) as AllConsentNames;
				const vendor = element.getAttribute(VENDOR_ATTRIBUTE);
				const key = `${vendor}\u0000${category}`;
				if (
					vendor &&
					allConsentNames.includes(category) &&
					!vendorOwners.has(key)
				) {
					vendorOwners.set(key, { category, vendor });
					namedNewVendor = true;
				}
			}
			if (namedNewVendor) {
				declareVendors?.([...vendorOwners.values()]);
			}
			for (const element of elements) {
				if (disposed) {
					break;
				}
				if (!element.isConnected || !isAllowed(element, getSnapshot())) {
					continue;
				}
				const external = element.hasAttribute('src');
				const asynchronous = external && element.hasAttribute('async');
				const pending = pendingScripts.get(element.ownerDocument);
				if (pending && !asynchronous) {
					waitFor(pending);
					continue;
				}
				const replacement = createReplacement(element);
				if (external && !asynchronous) {
					waitFor(trackPendingScript(replacement));
				}
				element.setAttribute(ACTIVATED_ATTRIBUTE, 'true');
				element.replaceWith(replacement);
				activated += 1;
			}
		} finally {
			scanning = false;
		}
		return activated;
	};

	return {
		dispose() {
			disposed = true;
			stopWaiting?.();
			stopWaiting = null;
			waiting = null;
		},
		scan,
	};
};

// Standalone scans retain their latest snapshot and nonce per root. Clients
// own their activator so disposal never cancels another client's
// continuation.
const standaloneActivators = new WeakMap<
	ParentNode,
	{
		snapshot: ConsentSnapshot;
		activator: GatedScriptActivator;
		nonce: string | undefined;
	}
>();

/**
 * Run inert `<script type="text/plain" data-c15t-category="…">` tags whose
 * categories the snapshot grants. A tag that also carries
 * `data-c15t-vendor="…"` waits until that vendor is allowed as well. Non-async scripts run in document order,
 * waiting for each external script to load or fail before continuing.
 *
 * Call again when consent changes so waiting scripts use the latest snapshot.
 * Each script runs at most once; withdrawing consent after activation requires
 * vendor cleanup or a page reload.
 *
 * Pass the page's CSP nonce on a page whose policy uses `'strict-dynamic'`:
 * tags without it are then skipped, so injected markup cannot run.
 *
 * @param snapshot - The kernel snapshot.
 * @param root - Where to look. Defaults to the document.
 * @param options - `nonce` limits activation to tags carrying it. The root
 * remembers the last nonce passed: a call with a different nonce replaces
 * it, and a call without one keeps it.
 * @returns How many scripts were activated immediately. Others may be waiting
 * for an earlier external script.
 */
export const activateGatedScripts = function activateGatedScripts(
	snapshot: ConsentSnapshot,
	root: ParentNode = document,
	options: { nonce?: string } = {}
): number {
	let state = standaloneActivators.get(root);
	if (state && options.nonce !== undefined && options.nonce !== state.nonce) {
		state.activator.dispose();
		state = undefined;
	}
	if (!state) {
		const { nonce } = options;
		const current: {
			snapshot: ConsentSnapshot;
			activator: GatedScriptActivator;
			nonce: string | undefined;
		} = {
			activator: createGatedScriptActivator(() => current.snapshot, {
				nonce,
				root,
			}),
			nonce,
			snapshot,
		};
		state = current;
		standaloneActivators.set(root, state);
	}
	state.snapshot = snapshot;
	return state.activator.scan();
};
