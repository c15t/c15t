/**
 * GPP CMP API (`__gpp`, GPP 1.1).
 *
 * Answers every generic command synchronously from the last published
 * state. Publishing fires events in the order the GPP CMP API requires:
 * `signalStatus` first (`not ready`) and last (`ready`), with display and
 * section changes in between.
 *
 * @packageDocumentation
 */

import { encodeGPPString } from './encoder';
import { GPP_VERSION } from './sections';
import type {
	GPPApi,
	GPPCallback,
	GPPDisplayStatus,
	GPPEventData,
	GPPParsedSubsection,
	GPPPingData,
	GPPQueuedListener,
	GPPSignalStatus,
} from './types';

/** One section in the published state. */
export interface GPPSectionState {
	id: number;
	prefix: string;
	encoded: string;
	/** Parsed subsections, or `null` when they cannot be read. */
	parsed: GPPParsedSubsection[] | null;
}

/** Everything `__gpp` reports, apart from the CMP status. */
export interface GPPState {
	cmpId: number;
	cmpDisplayStatus: GPPDisplayStatus;
	signalStatus: GPPSignalStatus;
	applicableSections: number[];
	sections: GPPSectionState[];
}

/** Control interface over an installed `__gpp`. */
export interface GPPCmpApi {
	/** Replaces the published state, firing the events the change implies. */
	publish: (next: GPPState) => void;
	/** The data `ping` would return now. */
	getPingData: () => GPPPingData;
	/** Removes listeners, and `__gpp` while it is still this API. */
	destroy: () => void;
	/** Whether `window.__gpp` is this API. */
	isInstalled: () => boolean;
}

/** Configuration for {@link createGPPCmpApi}. */
export interface GPPCmpApiConfig {
	/** Sections the CMP can produce, as `"id:prefix"`. */
	supportedAPIs: string[];
	/** State published at installation. */
	initial: GPPState;
}

const sameNumbers = (left: number[], right: number[]): boolean =>
	left.length === right.length &&
	left.every((value, index) => value === right[index]);

/** Prefixes of sections added, removed or changed between two states. */
const changedPrefixes = function changedPrefixes(
	previous: GPPSectionState[],
	next: GPPSectionState[]
): string[] {
	const before = new Map(previous.map((section) => [section.prefix, section]));
	const after = new Map(next.map((section) => [section.prefix, section]));
	const prefixes = new Set([...before.keys(), ...after.keys()]);
	return [...prefixes].filter((prefix) => {
		const left = before.get(prefix);
		const right = after.get(prefix);
		return (
			left?.encoded !== right?.encoded ||
			(left?.parsed === null) !== (right?.parsed === null)
		);
	});
};

/**
 * Sections whose data is available only in event listeners. TCF 2.2 has
 * vendors read consent from events, so, like the IAB reference
 * implementation, `getSection` and `getField` answer `null` for it.
 */
const EVENT_ONLY_PREFIXES = new Set(['tcfeuv2']);

/** Every `__gpp` this module installed, so a replacement can be recognised. */
const ownApis = new WeakSet<GPPApi>();

/** A stub with its queue and listeners on properties, as the spec's sample stores them. */
type StubWithProperties = GPPApi & { queue?: unknown; events?: unknown };

/** Commands a stub answers with its own state rather than queueing. */
const STUB_COMMANDS = new Set([undefined, 'events', 'queue']);

/**
 * Reads queued calls and listeners from a stub. Two conventions exist: the
 * GPP specification's sample stub keeps listeners on `__gpp.events`, and
 * the IAB `@iabgpp/stub` package returns them from `__gpp('events')`. Both
 * return the queue from `__gpp()`.
 */
const readStub = function readStub(stub: StubWithProperties | undefined): {
	queue: unknown[][];
	events: GPPQueuedListener[];
} {
	const call = (...args: [] | [string]): unknown => {
		try {
			return stub?.(...args);
		} catch {
			return undefined;
		}
	};
	let events: unknown = stub?.events;
	if (!Array.isArray(events)) {
		events = call('events');
	}
	let queue: unknown = call();
	if (!Array.isArray(queue)) {
		queue = stub?.queue;
	}
	return {
		events: Array.isArray(events) ? (events as GPPQueuedListener[]) : [],
		// A stub without an `events` command queued that call above.
		queue: Array.isArray(queue)
			? (queue as unknown[][]).filter(
					(args) => Array.isArray(args) && !STUB_COMMANDS.has(args[0] as string)
				)
			: [],
	};
};

/**
 * Whether `existing` is a CMP that has loaded, rather than a stub or an
 * API this module installed. A stub answers `ping` with `cmpStatus: 'stub'`
 * or queues it. Older stubs, such as the specification's sample, return
 * the ping data instead of calling back.
 */
const isLoadedForeignCmp = function isLoadedForeignCmp(
	existing: GPPApi | undefined
): boolean {
	if (!existing || ownApis.has(existing)) {
		return false;
	}
	const statusOf = (data: unknown): unknown =>
		data && typeof data === 'object'
			? (data as { cmpStatus?: unknown }).cmpStatus
			: undefined;
	let status: unknown;
	try {
		const returned = existing('ping', (data) => {
			status = statusOf(data);
		});
		status ??= statusOf(returned);
	} catch {
		return false;
	}
	return status !== undefined && status !== 'stub';
};

/**
 * Installs `__gpp`, taking over the calls and listeners a stub queued.
 *
 * @param config - Supported sections and the initial state.
 * @returns Control interface over the API.
 * @throws {Error} When another CMP that has already loaded owns `__gpp`.
 *
 * @internal
 */
export const createGPPCmpApi = function createGPPCmpApi(
	config: GPPCmpApiConfig
): GPPCmpApi {
	if (typeof window !== 'undefined' && isLoadedForeignCmp(window.__gpp)) {
		throw new Error(
			'@c15t/iab/gpp: another CMP already provides window.__gpp. Remove it, or do not mount createGPP() on this page.'
		);
	}
	let state = config.initial;
	let gppString = encodeGPPString(state.sections);
	const listeners = new Map<number, GPPCallback<GPPEventData>>();
	let lastListenerId = 0;

	const getPingData = (): GPPPingData => ({
		applicableSections: [...state.applicableSections],
		cmpDisplayStatus: state.cmpDisplayStatus,
		cmpId: state.cmpId,
		cmpStatus: 'loaded',
		gppString,
		gppVersion: GPP_VERSION,
		parsedSections: Object.fromEntries(
			state.sections
				.filter((section) => section.parsed !== null)
				.map((section) => [section.prefix, structuredClone(section.parsed)])
		) as GPPPingData['parsedSections'],
		sectionList: state.sections.map((section) => section.id),
		signalStatus: state.signalStatus,
		supportedAPIs: [...config.supportedAPIs],
	});

	const fire = (eventName: string, data: unknown): void => {
		for (const [listenerId, listener] of [...listeners]) {
			try {
				listener(
					{ data, eventName, listenerId, pingData: getPingData() },
					true
				);
			} catch {
				// A failing vendor callback must not stop the others.
			}
		}
	};

	const findSection = (prefix: unknown) =>
		state.sections.find((section) => section.prefix === prefix);
	/** A section's parsed data, unless it is readable only in events. */
	const readableSection = (prefix: unknown) =>
		EVENT_ONLY_PREFIXES.has(prefix as string)
			? undefined
			: findSection(prefix)?.parsed;

	const getField = (parameter: unknown): unknown => {
		if (typeof parameter !== 'string') {
			return null;
		}
		const separator = parameter.indexOf('.');
		if (separator <= 0) {
			return null;
		}
		const parsed = readableSection(parameter.slice(0, separator));
		const name = parameter.slice(separator + 1);
		const subsection = parsed?.find((entry) => Object.hasOwn(entry, name));
		return subsection ? structuredClone(subsection[name]) : null;
	};

	const api: GPPApi = (command, handler, parameter) => {
		if (typeof handler !== 'function') {
			return undefined;
		}
		switch (command) {
			case 'ping':
				handler(getPingData(), true);
				break;
			case 'addEventListener': {
				lastListenerId += 1;
				const listenerId = lastListenerId;
				listeners.set(listenerId, handler as GPPCallback<GPPEventData>);
				handler(
					{
						data: true,
						eventName: 'listenerRegistered',
						listenerId,
						pingData: getPingData(),
					} satisfies GPPEventData,
					true
				);
				break;
			}
			case 'removeEventListener':
				handler(listeners.delete(Number(parameter)), true);
				break;
			case 'hasSection':
				handler(Boolean(findSection(parameter)), true);
				break;
			case 'getSection': {
				const parsed = readableSection(parameter);
				handler(parsed ? structuredClone(parsed) : null, true);
				break;
			}
			case 'getField':
				handler(getField(parameter), true);
				break;
			default:
				handler(null, false);
		}
		return undefined;
	};

	if (typeof window !== 'undefined') {
		const { queue, events } = readStub(window.__gpp);
		for (const event of events) {
			if (typeof event?.callback === 'function' && Number.isInteger(event.id)) {
				listeners.set(event.id, event.callback);
				lastListenerId = Math.max(lastListenerId, event.id);
			}
		}
		ownApis.add(api);
		window.__gpp = api;
		for (const args of queue) {
			try {
				api(...(args as Parameters<GPPApi>));
			} catch {
				// A queued call with a failing callback must not stop the rest.
			}
		}
		if (events.length > 0) {
			fire('cmpStatus', 'loaded');
		}
	}

	let publishing = false;
	let pending: GPPState | null = null;
	const publishOnce = (next: GPPState): void => {
		const sections = changedPrefixes(state.sections, next.sections);
		const applicableChanged = !sameNumbers(
			state.applicableSections,
			next.applicableSections
		);
		const displayChanged = state.cmpDisplayStatus !== next.cmpDisplayStatus;
		if (
			sections.length === 0 &&
			!applicableChanged &&
			!displayChanged &&
			state.cmpId === next.cmpId &&
			state.signalStatus === next.signalStatus
		) {
			return;
		}
		if (state.signalStatus === 'ready') {
			state = { ...state, signalStatus: 'not ready' };
			fire('signalStatus', 'not ready');
		}
		if (displayChanged) {
			state = { ...state, cmpDisplayStatus: next.cmpDisplayStatus };
			fire('cmpDisplayStatus', next.cmpDisplayStatus);
		}
		state = { ...next, signalStatus: 'not ready' };
		gppString = encodeGPPString(state.sections);
		for (const prefix of sections) {
			fire('sectionChange', prefix);
		}
		// Stay `not ready` when a listener published a newer state meanwhile.
		if (next.signalStatus === 'ready' && !pending) {
			state = { ...state, signalStatus: 'ready' };
			fire('signalStatus', 'ready');
		}
	};

	return {
		destroy: () => {
			listeners.clear();
			if (typeof window !== 'undefined' && window.__gpp === api) {
				delete window.__gpp;
			}
		},
		getPingData,
		isInstalled: () => typeof window !== 'undefined' && window.__gpp === api,
		publish: (next) => {
			// A listener can change consent while events fire, which publishes
			// again. Finish the running publication first, then apply the
			// latest state, so a newer state is never overwritten by an older one.
			pending = next;
			if (publishing) {
				return;
			}
			publishing = true;
			try {
				while (pending) {
					const target = pending;
					pending = null;
					publishOnce(target);
				}
			} finally {
				publishing = false;
			}
		},
	};
};
