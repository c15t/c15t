/**
 * GPP CMP API types (GPP 1.1).
 *
 * @packageDocumentation
 */

/** Loading state of the CMP. */
export type GPPCmpStatus = 'stub' | 'loading' | 'loaded' | 'error';

/** Whether the consent surface is shown. */
export type GPPDisplayStatus = 'hidden' | 'visible' | 'disabled';

/** Whether vendors may act on the GPP string. */
export type GPPSignalStatus = 'not ready' | 'ready';

/** One parsed subsection, keyed by field name. */
export type GPPParsedSubsection = Record<string, unknown>;

/** The object `ping` returns and every event carries. */
export interface GPPPingData {
	gppVersion: string;
	cmpStatus: GPPCmpStatus;
	cmpDisplayStatus: GPPDisplayStatus;
	signalStatus: GPPSignalStatus;
	/** Sections the CMP can produce, as `"id:prefix"`. */
	supportedAPIs: string[];
	cmpId: number;
	/** IDs of the sections in `gppString`. */
	sectionList: number[];
	/** Sections that apply to this visitor. `[-1]` when none does. */
	applicableSections: number[];
	gppString: string;
	/** Parsed sections by API prefix, each an array of subsections. */
	parsedSections: Record<string, GPPParsedSubsection[]>;
}

/** The object an event listener receives. */
export interface GPPEventData {
	eventName: string;
	listenerId: number;
	data: unknown;
	pingData: GPPPingData;
}

/** Callback passed to `__gpp`. */
export type GPPCallback<DataType = unknown> = (
	data: DataType,
	success: boolean
) => void;

/** A listener queued by a stub before the CMP loaded. */
export interface GPPQueuedListener {
	id: number;
	callback: GPPCallback<GPPEventData>;
	parameter?: unknown;
}

/**
 * The `__gpp` global. A stub also returns its queue when called with no
 * arguments, and its listeners when called with `'events'`.
 */
export type GPPApi = (
	command?: string,
	handler?: GPPCallback,
	parameter?: unknown,
	version?: string
) => unknown;

declare global {
	interface Window {
		__gpp?: GPPApi;
	}
}
