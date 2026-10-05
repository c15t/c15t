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

/** Reads queued calls and listeners from a stub that follows the GPP contract. */
const readStub = function readStub(stub: GPPApi | undefined): {
	queue: unknown[][];
	events: GPPQueuedListener[];
} {
	const read = (...args: [] | [string]): unknown[] => {
		try {
			const value = stub?.(...args);
			return Array.isArray(value) ? value : [];
		} catch {
			return [];
		}
	};
	return {
		events: read('events') as GPPQueuedListener[],
		queue: read() as unknown[][],
	};
};

/**
 * Installs `__gpp`, taking over the calls and listeners a stub queued.
 *
 * @param config - Supported sections and the initial state.
 * @returns Control interface over the API.
 *
 * @internal
 */
export const createGPPCmpApi = function createGPPCmpApi(
	config: GPPCmpApiConfig
): GPPCmpApi {
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

	const getField = (parameter: unknown): unknown => {
		if (typeof parameter !== 'string') {
			return null;
		}
		const separator = parameter.indexOf('.');
		if (separator <= 0) {
			return null;
		}
		const section = findSection(parameter.slice(0, separator));
		const name = parameter.slice(separator + 1);
		const subsection = section?.parsed?.find((entry) =>
			Object.hasOwn(entry, name)
		);
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
				const parsed = findSection(parameter)?.parsed;
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

	return {
		destroy: () => {
			listeners.clear();
			if (typeof window !== 'undefined' && window.__gpp === api) {
				delete window.__gpp;
			}
		},
		getPingData,
		publish: (next) => {
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
			if (next.signalStatus === 'ready') {
				state = { ...state, signalStatus: 'ready' };
				fire('signalStatus', 'ready');
			}
		},
	};
};
