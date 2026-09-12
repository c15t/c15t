import { allConsentNames, evaluateConsent } from '@c15t/core';
import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

/** Attribute that names the category an inert `<script>` waits on. */
export const CATEGORY_ATTRIBUTE = 'data-c15t-category';

/** Set once a gated script has been activated (or rejected as invalid). */
export const ACTIVATED_ATTRIBUTE = 'data-c15t-activated';

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
	return evaluateConsent({ category: category as AllConsentNames }, snapshot);
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

/**
 * Own activation ordering without retaining a client outside its lifecycle.
 *
 * @param getSnapshot - Read current consent before each activation.
 * @param root - Where to look. Defaults to the document when scanning.
 * @returns A scanner and its disposal function.
 * @internal
 */
export const createGatedScriptActivator = function createGatedScriptActivator(
	getSnapshot: () => ConsentSnapshot,
	root?: ParentNode
): GatedScriptActivator {
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
			const elements = (root ?? document).querySelectorAll<HTMLScriptElement>(
				selector
			);
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

// Standalone scans retain their latest snapshot per root. Clients own their
// activator so disposal never cancels another client's continuation.
const standaloneActivators = new WeakMap<
	ParentNode,
	{ snapshot: ConsentSnapshot; activator: GatedScriptActivator }
>();

/**
 * Run inert `<script type="text/plain" data-c15t-category="…">` tags whose
 * categories the snapshot grants. Non-async scripts run in document order,
 * waiting for each external script to load or fail before continuing.
 *
 * Call again when consent changes so waiting scripts use the latest snapshot.
 * Each script runs at most once; withdrawing consent after activation requires
 * vendor cleanup or a page reload.
 *
 * @param snapshot - The kernel snapshot.
 * @param root - Where to look. Defaults to the document.
 * @returns How many scripts were activated immediately. Others may be waiting
 * for an earlier external script.
 */
export const activateGatedScripts = function activateGatedScripts(
	snapshot: ConsentSnapshot,
	root: ParentNode = document
): number {
	let state = standaloneActivators.get(root);
	if (!state) {
		const current: {
			snapshot: ConsentSnapshot;
			activator: GatedScriptActivator;
		} = {
			activator: createGatedScriptActivator(() => current.snapshot, root),
			snapshot,
		};
		state = current;
		standaloneActivators.set(root, state);
	}
	state.snapshot = snapshot;
	return state.activator.scan();
};
