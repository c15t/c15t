import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import {
	createScriptReuse,
	getScriptRegistrations,
} from '../_shared/reuse-script';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** FullStory v2 dispatcher arguments, including Async completion callbacks. */
export type FullStoryCall = [
	command: string,
	argument: unknown,
	source: unknown,
	resolve: ((value: unknown) => void) | undefined,
	reject: ((reason: unknown) => void) | undefined,
	version: number,
];
/** Callable v2 namespace. Async commands return promises before and after load. */
export interface FullStoryApi {
	(
		command: `${string}Async`,
		argument?: unknown,
		source?: unknown,
		version?: number
	): Promise<unknown>;
	(
		command: string,
		argument?: unknown,
		source?: unknown,
		version?: number
	): unknown;
	q?: FullStoryCall[];
	_api?: (...args: FullStoryCall) => unknown;
	_v?: string;
	_w?: { fetch?: typeof fetch; XMLHttpRequest: typeof XMLHttpRequest };
}

const asyncCommand = /Async$/u;

const rejectQueue = (api: FullStoryApi, error: Error): void => {
	const queue = api.q;
	if (!queue) {
		return;
	}
	const reject = (...calls: FullStoryCall[]): number => {
		for (const call of calls) {
			call[4]?.(error);
		}
		return 0;
	};
	reject(...queue);
	queue.length = 0;
	queue.push = reject;
};

// Matches @fullstory/snippet 2.1.0: strip Async and forward six arguments.
const createApi = (): FullStoryApi => {
	const metadata: Pick<FullStoryApi, 'q' | '_api' | '_v' | '_w'> = {
		_v: '2.1.0',
		_w: { XMLHttpRequest: window.XMLHttpRequest, fetch: window.fetch },
		q: [],
	};
	// oxlint-disable-next-line no-use-before-define -- The callable and its SDK metadata share one identity.
	const api = Object.assign(call, metadata);
	function call(
		command: `${string}Async`,
		argument?: unknown,
		source?: unknown,
		version?: number
	): Promise<unknown>;
	function call(
		command: string,
		argument?: unknown,
		source?: unknown,
		version?: number
	): unknown;
	function call(
		command: string,
		argument?: unknown,
		source?: unknown,
		version = 2
	): unknown {
		const dispatch = (
			name: string,
			resolve?: FullStoryCall[3],
			reject?: FullStoryCall[4]
		): unknown => {
			if (api._api) {
				return api._api(name, argument, source, resolve, reject, version || 2);
			}
			api.q?.push([name, argument, source, resolve, reject, version || 2]);
			return undefined;
		};
		if (asyncCommand.test(command)) {
			return new Promise<unknown>((resolve, reject) => {
				dispatch(command.replace(asyncCommand, ''), resolve, reject);
			});
		}
		return dispatch(command);
	}
	if (window.fetch) {
		window.fetch = Object.assign(function instrumentedFetch(
			this: Window,
			...args: Parameters<typeof fetch>
		): Promise<Response> {
			const original = api._w?.fetch;
			if (!original) {
				throw new Error('fullStory: saved fetch is unavailable');
			}
			return original.apply(this, args);
		}, window.fetch);
	}
	return api;
};

interface Recorder {
	api: FullStoryApi;
	element?: HTMLScriptElement;
	configuration: string;
	inserted: boolean;
	insertionObserver?: MutationObserver;
	loaded: boolean;
	started: boolean;
	appliedConsent?: boolean;
	appliedElementConsent?: boolean;
}
interface Gate {
	consent: boolean;
	elementConsent: boolean;
}
const recorders = new WeakMap<FullStoryApi, Recorder>();
const gates = new WeakMap<Document, Set<Gate>>();
const markRecorderInserted = (recorder: Recorder): void => {
	recorder.inserted = true;
	recorder.insertionObserver?.disconnect();
	recorder.insertionObserver = undefined;
};
const readRecorderInsertions = (
	recorder: Recorder,
	records = recorder.insertionObserver?.takeRecords() ?? []
): void => {
	const { element } = recorder;
	if (
		element &&
		(element.isConnected ||
			records.some(({ addedNodes }) =>
				Array.from(addedNodes).includes(element)
			))
	) {
		markRecorderInserted(recorder);
	}
};
const reloadError = (): Error =>
	new Error(
		'fullStory: reload the page to change the recorder configuration or replace an existing FS installation'
	);
const applyRecorderConsent = (recorder: Recorder): void => {
	if (!recorder.loaded) {
		return;
	}
	const owners = [...(gates.get(document) ?? [])];
	const consent =
		window.FS === recorder.api &&
		owners.length > 0 &&
		owners.every((owner) => owner.consent);
	const elementConsent =
		consent && owners.every((owner) => owner.elementConsent);
	if (
		recorder.appliedConsent === consent &&
		recorder.appliedElementConsent === elementConsent
	) {
		return;
	}
	recorder.api('setIdentity', { consent: elementConsent });
	if (recorder.appliedConsent !== consent) {
		if (consent) {
			recorder.api(
				recorder.started || recorder.appliedConsent === false
					? 'restart'
					: 'start'
			);
			recorder.started = true;
		} else {
			recorder.api('shutdown');
		}
	}
	recorder.appliedConsent = consent;
	recorder.appliedElementConsent = elementConsent;
};
const observeRecorderElement = (
	recorder: Recorder,
	element: HTMLScriptElement | undefined
): void => {
	recorder.element = element;
	if (!recorder.inserted) {
		if (typeof MutationObserver === 'undefined') {
			markRecorderInserted(recorder);
		} else {
			recorder.insertionObserver ??= new MutationObserver((records) => {
				readRecorderInsertions(recorder, records);
			});
			// Start before core appends, including body-targeted shallow copies.
			for (const target of [document.head, document.body]) {
				if (target) {
					recorder.insertionObserver.observe(target, { childList: true });
				}
			}
		}
	}
	// An interrupted append can transfer the bootstrap to a new element.
	// Only the current SDK element can make this recorder ready.
	element?.addEventListener(
		'load',
		() => {
			if (recorder.element !== element) {
				return;
			}
			markRecorderInserted(recorder);
			recorder.loaded = true;
			applyRecorderConsent(recorder);
		},
		{ once: true }
	);
	element?.addEventListener(
		'error',
		() => {
			if (recorder.element === element) {
				rejectQueue(
					recorder.api,
					new Error(`fullStory: error loading ${element?.src}`)
				);
			}
		},
		{ once: true }
	);
};
const configurationOf = (options: ResolvedFullStoryOptions): string =>
	JSON.stringify([
		options.orgId,
		options.host,
		options.script,
		options.scriptUrl,
	]);
const matchingRecorder = (configuration: string): Recorder | undefined => {
	if (!window.FS) {
		return undefined;
	}
	const recorder = recorders.get(window.FS);
	if (!recorder || recorder.configuration !== configuration) {
		throw reloadError();
	}
	return recorder;
};
declare global {
	interface Window {
		FS?: FullStoryApi;
		_fs_org?: string;
		_fs_host?: string;
		_fs_script?: string;
		_fs_capture_on_startup?: boolean;
		_fs_namespace?: string;
	}
}

/** FullStory loader metadata. Bootstrap waits for the mapped consent. */
export const fullStoryManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: { crossorigin: 'anonymous', 'data-fs-namespace': 'FS' },
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'fullstory',
	vendorDetails: {
		homepageUrl: 'https://www.fullstory.com/',
		legalName: 'FullStory, Inc.',
		name: 'FullStory',
		privacyPolicyUrl: 'https://www.fullstory.com/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface FullStoryOptions {
	/** Organization ID supplied by FullStory. */
	orgId: string;
	/** FullStory host. Defaults to the organization's regional FullStory host. */
	host?: string;
	/** Script host/path without a scheme. Defaults to the organization's regional edge. */
	script?: string;
	/** Consent for elements configured as capture with consent. @default false */
	elementConsent?: boolean;
	/** Consent condition required before loading. @default 'measurement' */
	category?: Script['category'];
	/** Exact loader URL override. Blank values use the vendor URL. */
	scriptUrl?: string;
}

interface ResolvedFullStoryOptions extends FullStoryOptions {
	host: string;
	script: string;
	scriptUrl: string;
}

const fullStoryDomain = /^(?:[^.]+\.)*fullstory\.com(?:\/|$)/u;
const regionLabel = /^[a-z]{2,3}[0-9]+$/u;

// Matches @fullstory/browser 2.1.2's orgLocale rules.
const orgLocale = (orgId: string): string | undefined => {
	const sections = orgId.split('-');
	const locale = sections.at(-1);
	if (
		sections.length < 3 ||
		(sections[0]?.length ?? 0) > 1 ||
		locale === 'na1'
	) {
		return undefined;
	}
	return locale;
};
const regionalize = (value: string, locale: string | undefined): string => {
	const pathIndex = value.indexOf('/');
	const host = pathIndex === -1 ? value : value.slice(0, pathIndex);
	// Check the host alone so a proxy path cannot match FullStory's domain.
	if (!locale || !fullStoryDomain.test(host)) {
		return value;
	}
	const path = pathIndex === -1 ? '' : value.slice(pathIndex);
	const labels = host.split('.');
	const insertAt = labels.length - 2;
	const existing = insertAt > 0 ? labels[insertAt - 1] : undefined;
	if (existing === locale) {
		return value;
	}
	if (existing !== undefined && regionLabel.test(existing)) {
		labels[insertAt - 1] = locale;
	} else {
		labels.splice(insertAt, 0, locale);
	}
	return labels.join('.') + path;
};
const resolveOptions = (
	options: FullStoryOptions,
	orgId: string
): ResolvedFullStoryOptions => {
	const locale = orgLocale(orgId);
	const host = regionalize(
		trimToUndefined(options.host) ?? 'fullstory.com',
		locale
	);
	const script = regionalize(
		trimToUndefined(options.script) ?? 'edge.fullstory.com/s/fs.js',
		locale
	);
	return {
		...options,
		host,
		orgId,
		script,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://${script}?org=${encodeURIComponent(orgId)}`
		),
	};
};

const reuseFullStory = createScriptReuse<ResolvedFullStoryOptions>();

const createFullStory = function createFullStory(
	options: ResolvedFullStoryOptions
): Script {
	const category = options.category ?? 'measurement';
	const { orgId, host, script: scriptPath, scriptUrl } = options;
	const script = resolveManifest(fullStoryManifest, { scriptUrl });
	const configuration = configurationOf(options);
	const gate: Gate = {
		consent: false,
		elementConsent: options.elementConsent ?? false,
	};
	let ownedRecorder: Recorder | undefined;
	const updateGate = (consent: boolean): void => {
		gate.consent = consent;
		let owners = gates.get(document);
		if (!owners) {
			owners = new Set();
			gates.set(document, owners);
		}
		owners.add(gate);
	};
	const update = (consent: boolean): void => {
		updateGate(consent);
		const recorder = ownedRecorder ?? matchingRecorder(configuration);
		if (recorder) {
			ownedRecorder = recorder;
			applyRecorderConsent(recorder);
		}
	};
	return {
		...script,
		category,
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			const { element, hasConsent } = info;
			const src = element?.isConnected ? null : element?.getAttribute('src');
			// Core still inserts the element if configuration validation throws.
			if (src) {
				element?.removeAttribute('src');
			}
			const existing = matchingRecorder(configuration);
			ownedRecorder = existing;
			updateGate(hasConsent);
			if (existing) {
				readRecorderInsertions(existing);
				if (!existing.inserted && !existing.element?.isConnected && element) {
					existing.element?.removeAttribute('src');
					observeRecorderElement(existing, element);
				}
				if (element === existing.element && src) {
					element?.setAttribute('src', src);
				}
				applyRecorderConsent(existing);
				return;
			}
			if (!getScriptRegistrations(info).some((owner) => owner.hasConsent)) {
				return;
			}
			window._fs_org = orgId;
			window._fs_host = host;
			window._fs_script = scriptPath;
			window._fs_capture_on_startup = false;
			window._fs_namespace = 'FS';
			const api = createApi();
			const recorder: Recorder = {
				api,
				configuration,
				element,
				inserted: false,
				loaded: false,
				started: false,
			};
			recorders.set(api, recorder);
			ownedRecorder = recorder;
			window.FS = api;
			// Removing an async script cannot guarantee that its execution stops.
			// Keep completion across disposal so remounts reuse even a pending SDK.
			observeRecorderElement(recorder, element);
			api('init', {
				env: { captureOnStartup: false, host, orgId, script: scriptPath },
			});
			if (src) {
				element?.setAttribute('src', src);
			}
		},
		onConsentChange({ hasConsent }) {
			update(hasConsent);
		},
		onDispose({ element }) {
			if (typeof document === 'undefined') {
				return;
			}
			gates.get(document)?.delete(gate);
			const current = window.FS ? recorders.get(window.FS) : undefined;
			const recorder = ownedRecorder ?? current;
			if (recorder) {
				// Core supplies registered elements even after replacement detaches them.
				if (element !== undefined && element === recorder.element) {
					markRecorderInserted(recorder);
				}
				applyRecorderConsent(recorder);
			}
		},
		onLoad({ hasConsent }) {
			updateGate(hasConsent);
			const recorder = matchingRecorder(configuration);
			if (!recorder) {
				return;
			}
			applyRecorderConsent(recorder);
		},
	};
};

/**
 * Starts FullStory after consent and shuts down capture on revoke.
 * Capture is always disabled at initialization, including in-flight revocation.
 * @param options - FullStory organization, endpoint and element consent.
 * @returns A gated script, or an inactive script for a missing organization ID.
 * @throws {Error} If FS belongs to another installer or recorder endpoints have changed. Reload the page first.
 * @example fullStory({ orgId: 'YOUR_ORG_ID' });
 * @see https://developer.fullstory.com/browser/getting-started/
 */
export const fullStory = function fullStory(options: FullStoryOptions): Script {
	const orgId = readId(options?.orgId);
	if (!orgId) {
		return skipMissingId('fullStory', 'orgId', {
			category: options?.category ?? 'measurement',
			manifest: fullStoryManifest,
		});
	}
	const resolved = resolveOptions(options, orgId);
	const configuration = configurationOf(resolved);
	if (typeof document !== 'undefined') {
		matchingRecorder(configuration);
	}
	const script = reuseFullStory(resolved, createFullStory);
	// A retained runtime, including a pending download, needs callbacks only.
	// Evaluate at mount time because callers can retain scripts across disposal.
	Object.defineProperty(script, 'callbackOnly', {
		configurable: true,
		enumerable: true,
		get: () => {
			if (typeof window === 'undefined' || !window.FS) {
				return false;
			}
			const recorder = recorders.get(window.FS);
			if (!recorder || recorder.configuration !== configuration) {
				return true;
			}
			readRecorderInsertions(recorder);
			if (recorder.element?.isConnected) {
				return false;
			}
			return recorder.inserted;
		},
	});
	return script;
};
