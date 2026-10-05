/**
 * Binds the GPP CMP API to a consent kernel.
 *
 * @packageDocumentation
 */

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
} from '@c15t/core';

import { isValidCmpId, MAX_CMP_ID } from '../tcf/cmp-id';
import { createGPPCmpApi } from './cmp-api';
import type { GPPSectionState, GPPState } from './cmp-api';
import { encodeUSSection } from './encoder';
import {
	GPC_SUBSECTION_TYPE,
	TCF_EU_PREFIX,
	TCF_EU_SECTION_ID,
	US_NATIONAL_SECTION,
	US_SECTIONS,
} from './sections';
import { destroyGPPStub, initializeGPPStub } from './stub';
import { parseTCFEUSection } from './tcf-section';
import type { GPPParsedSubsection, GPPPingData } from './types';
import {
	resolveUSSectionDefinition,
	resolveUSSectionValues,
} from './us-section';
import type { GPPMspaMode, GPPUSApproach, GPPUSFallback } from './us-section';

/** CMP ID the GPP specification reserves for unregistered string creators. */
const UNREGISTERED_CMP_ID = 1;

/** Options for {@link createGPP}. */
export interface CreateGPPOptions {
	/** The consent kernel to read choices from. */
	kernel: ConsentKernel;
	/**
	 * CMP ID reported by `ping`. Defaults to the IAB CMP ID the kernel holds
	 * (from `iab({ cmpId })` or the backend), else `1`, which the GPP
	 * specification reserves for string creators without a registered ID,
	 * including MSPA US National strings. A TCF EU section needs the
	 * registered ID its TC String names.
	 */
	cmpId?: number;
	/** How US visitors are signalled. Default: `'state'`. */
	usApproach?: GPPUSApproach;
	/**
	 * Under the state approach, the section for a US visitor whose region is
	 * unknown or whose state has no section c15t encodes. `'usnat'` reports
	 * the opt-outs in the MSPA US National section, as a transaction not
	 * covered by the MSPA unless `mspaMode` is set. `'none'` reports no
	 * section (`applicableSections: [-1]`), for publishers that reserve
	 * `usnat` for the MSPA national approach. Default: `'usnat'`.
	 */
	usFallback?: GPPUSFallback;
	/**
	 * MSPA mode for covered transactions. Omit unless the publisher signed
	 * the IAB Multi-State Privacy Agreement; the string then reports the
	 * transaction as not covered.
	 */
	mspaMode?: GPPMspaMode;
	/**
	 * Categories whose refusal opts the visitor out of sale, sharing and
	 * targeted advertising. Default: `['marketing']`.
	 */
	optOutCategories?: readonly AllConsentNames[];
	/**
	 * Add the TCF EU section, carrying the TC String the IAB TCF CMP
	 * confirmed, under an `iab` policy. Default: `true`.
	 */
	tcf?: boolean;
}

/** Handle returned by {@link createGPP}. */
export interface GPPHandle {
	/** The current GPP string, or `''` when no section is present. */
	getGPPString: () => string;
	/** The data `__gpp('ping')` returns now. */
	getPingData: () => GPPPingData;
	/**
	 * Removes the kernel subscription and, while this instance still owns
	 * `__gpp`, the API, the stub and the frame bridge.
	 */
	dispose: () => void;
}

/** Collaborators {@link createGPPRuntime} takes, so tests can control them. */
export interface GPPRuntimeDependencies {
	/** Decodes a TC String into its parsed `tcfeuv2` subsections. */
	parseTCFEUSection: (tcString: string) => Promise<GPPParsedSubsection[]>;
}

const assertGPPCmpId = function assertGPPCmpId(value: number): number {
	if (value !== UNREGISTERED_CMP_ID && !isValidCmpId(value)) {
		throw new Error(
			`@c15t/iab/gpp: cmpId must be 1 (no registered CMP ID) or a registered CMP ID up to ${MAX_CMP_ID}. Received: ${String(value)}.`
		);
	}
	return value;
};

const isPromptVisible = (snapshot: ConsentSnapshot): boolean =>
	snapshot.activeUI === 'banner' || snapshot.activeUI === 'dialog';

/** The confirmed TC String, or `''` while none is held. */
const heldTCString = (snapshot: ConsentSnapshot): string =>
	snapshot.iab?.authority?.tcString ?? '';

/**
 * {@link createGPP} with its collaborators supplied.
 *
 * @internal
 */
export const createGPPRuntime = function createGPPRuntime(
	options: CreateGPPOptions,
	dependencies: GPPRuntimeDependencies
): GPPHandle {
	const {
		kernel,
		mspaMode,
		optOutCategories = ['marketing'],
		tcf = true,
		usApproach = 'state',
		usFallback = 'usnat',
	} = options;
	const configuredCmpId =
		options.cmpId === undefined ? undefined : assertGPPCmpId(options.cmpId);
	const usSections = US_SECTIONS.filter((section) =>
		section === US_NATIONAL_SECTION
			? usApproach === 'national' || usFallback === 'usnat'
			: usApproach === 'state'
	);
	const supportedAPIs = [
		...(tcf ? [`${TCF_EU_SECTION_ID}:${TCF_EU_PREFIX}`] : []),
		...usSections.map((section) => `${section.id}:${section.prefix}`),
	];

	const resolveCmpId = (snapshot: ConsentSnapshot): number => {
		if (configuredCmpId !== undefined) {
			return configuredCmpId;
		}
		const fromKernel = snapshot.iab?.cmpId;
		return isValidCmpId(fromKernel) ? fromKernel : UNREGISTERED_CMP_ID;
	};

	let disposed = false;
	/** The parsed form of the latest decoded TC String. */
	let decoded: { tcString: string; parsed: GPPSectionState['parsed'] } | null =
		null;
	const decoding = new Set<string>();

	/**
	 * Decodes a TC String once, then calls `onDecoded`. A result for a string
	 * the kernel no longer holds is dropped, so a slow decode of an older
	 * string never replaces the current one.
	 */
	const decodeTCString = async (
		tcString: string,
		onDecoded: () => void
	): Promise<void> => {
		if (decoding.has(tcString)) {
			return;
		}
		decoding.add(tcString);
		let parsed: GPPSectionState['parsed'] = null;
		try {
			parsed = await dependencies.parseTCFEUSection(tcString);
		} catch {
			// Publish the string without a parsed form.
		}
		decoding.delete(tcString);
		if (disposed || heldTCString(kernel.getSnapshot()) !== tcString) {
			return;
		}
		decoded = { parsed, tcString };
		onDecoded();
	};

	/**
	 * Sections and applicable sections for a snapshot, or `null` while the
	 * TC String it holds is still being decoded; `onDecoded` runs once it is.
	 */
	const resolveSections = (
		snapshot: ConsentSnapshot,
		onDecoded: () => void
	): Pick<GPPState, 'applicableSections' | 'sections'> | null => {
		if (tcf && snapshot.model === 'iab') {
			const tcString = heldTCString(snapshot);
			if (!tcString) {
				return { applicableSections: [TCF_EU_SECTION_ID], sections: [] };
			}
			if (decoded?.tcString !== tcString) {
				void decodeTCString(tcString, onDecoded);
				return null;
			}
			return {
				applicableSections: [TCF_EU_SECTION_ID],
				sections: [
					{
						encoded: tcString,
						id: TCF_EU_SECTION_ID,
						parsed: decoded.parsed,
						prefix: TCF_EU_PREFIX,
					},
				],
			};
		}
		const definition = resolveUSSectionDefinition(
			snapshot,
			usApproach,
			usFallback
		);
		if (!definition) {
			return { applicableSections: [-1], sections: [] };
		}
		const values = resolveUSSectionValues(definition, snapshot, {
			mspaMode,
			optOutCategories,
		});
		return {
			applicableSections: [definition.id],
			sections: [
				{
					encoded: encodeUSSection(definition, values),
					id: definition.id,
					parsed: definition.gpc
						? [
								values.core,
								{ Gpc: values.gpc, SubsectionType: GPC_SUBSECTION_TYPE },
							]
						: [values.core],
					prefix: definition.prefix,
				},
			],
		};
	};

	/**
	 * Whether the published sections cannot describe the visitor yet. Under
	 * an `iab` rule the applicable section exists only once the TCF CMP has
	 * loaded the vendor list and confirmed or restored a TC String, so the
	 * signal waits for it, including after the TC String is withdrawn.
	 */
	const waitingForTCF = (snapshot: ConsentSnapshot): boolean =>
		tcf &&
		snapshot.model === 'iab' &&
		(!snapshot.iab?.gvl || !heldTCString(snapshot));

	const initialSnapshot = kernel.getSnapshot();
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		initializeGPPStub();
	}
	let published: GPPState = {
		applicableSections: [0],
		cmpDisplayStatus: isPromptVisible(initialSnapshot) ? 'visible' : 'hidden',
		cmpId: resolveCmpId(initialSnapshot),
		sections: [],
		signalStatus: 'not ready',
	};
	const api = createGPPCmpApi({ initial: published, supportedAPIs });

	const sync = (): void => {
		if (disposed) {
			return;
		}
		const snapshot = kernel.getSnapshot();
		const visible = isPromptVisible(snapshot);
		// Until the policy resolves or a new TC String decodes, keep the
		// published sections and tell vendors to wait.
		const resolved = snapshot.policyPending
			? null
			: resolveSections(snapshot, sync);
		published = {
			...published,
			...resolved,
			cmpDisplayStatus: visible ? 'visible' : 'hidden',
			cmpId: resolveCmpId(snapshot),
			signalStatus:
				resolved && !visible && !waitingForTCF(snapshot)
					? 'ready'
					: 'not ready',
		};
		api.publish(published);
	};

	sync();
	const unsubscribe = kernel.subscribe(sync);

	return {
		dispose: () => {
			if (disposed) {
				return;
			}
			disposed = true;
			unsubscribe();
			// Another instance may have replaced this one; the stub and frame
			// bridge are shared, so only the instance that owns `__gpp` removes
			// them.
			const owner = api.isInstalled();
			api.destroy();
			if (owner) {
				destroyGPPStub();
			}
		},
		getGPPString: () => api.getPingData().gppString,
		getPingData: api.getPingData,
	};
};

/**
 * Mounts the GPP CMP API (`__gpp`) against a consent kernel and keeps the
 * GPP string in step with the visitor's choices. The policy rule c15t
 * matched decides whether a section applies:
 *
 * - Under an `iab` rule the TCF EU section (`tcfeuv2`) carries the TC
 *   String the IAB TCF CMP from `createIAB` confirmed.
 * - Under a rule that offers an opt-out (the `preferences` or `opt-out`
 *   right), a US visitor gets their state section (`usca`, `usva`, …) or
 *   the MSPA US National section (`usnat`), reporting sale, sharing and
 *   targeted advertising opt-outs and the GPC signal.
 * - Otherwise no section applies and `applicableSections` is `[-1]`.
 *
 * `signalStatus` stays `not ready` until the policy resolves, while the
 * consent banner or dialog is open, while an `iab` rule has no confirmed
 * TC String, and while a new TC String is decoded.
 *
 * @param options - Kernel, CMP ID and US signalling options.
 * @returns A handle with the current GPP string and `dispose`.
 * @throws {Error} When `cmpId` is neither 1 nor a registered CMP ID, or when
 * another CMP that has already loaded owns `__gpp`.
 *
 * @example
 * ```ts
 * import { createGPP } from '@c15t/iab/gpp';
 *
 * const gpp = createGPP({ kernel: runtime.kernel });
 * // later
 * gpp.dispose();
 * ```
 */
export const createGPP = function createGPP(
	options: CreateGPPOptions
): GPPHandle {
	return createGPPRuntime(options, { parseTCFEUSection });
};
