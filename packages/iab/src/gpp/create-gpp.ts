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
import type { GPPPingData } from './types';
import {
	resolveUSSectionDefinition,
	resolveUSSectionValues,
} from './us-section';
import type { GPPMspaMode, GPPUSApproach } from './us-section';

/** CMP ID the GPP specification reserves for unregistered string creators. */
const UNREGISTERED_CMP_ID = 1;

/** Options for {@link createGPP}. */
export interface CreateGPPOptions {
	/** The consent kernel to read choices from. */
	kernel: ConsentKernel;
	/**
	 * CMP ID reported by `ping`. Defaults to the IAB CMP ID the kernel holds
	 * (from `iab({ cmpId })` or the backend), else `1`, which the GPP
	 * specification reserves for string creators without a registered ID.
	 * TCF EU and MSPA US National strings need a registered ID.
	 */
	cmpId?: number;
	/** How US visitors are signalled. Default: `'state'`. */
	usApproach?: GPPUSApproach;
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
	/** Removes `__gpp`, its stub and the kernel subscription. */
	dispose: () => void;
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

/**
 * Mounts the GPP CMP API (`__gpp`) against a consent kernel and keeps the
 * GPP string in step with the visitor's choices.
 *
 * - Under an `iab` policy the TCF EU section (`tcfeuv2`) carries the TC
 *   String the IAB TCF CMP from `createIAB` confirmed.
 * - For US visitors the state section (`usca`, `usva`, …) or the MSPA US
 *   National section (`usnat`) reports sale, sharing and targeted
 *   advertising opt-outs and the GPC signal.
 * - Elsewhere no section applies and `applicableSections` is `[-1]`.
 *
 * `signalStatus` stays `not ready` until the policy resolves, while the
 * consent banner or dialog is open, and while a new TC String is decoded.
 *
 * @param options - Kernel, CMP ID and US signalling options.
 * @returns A handle with the current GPP string and `dispose`.
 * @throws {Error} When `cmpId` is neither 1 nor a registered CMP ID.
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
	const {
		kernel,
		mspaMode,
		optOutCategories = ['marketing'],
		tcf = true,
		usApproach = 'state',
	} = options;
	const configuredCmpId =
		options.cmpId === undefined ? undefined : assertGPPCmpId(options.cmpId);
	const usSections =
		usApproach === 'national'
			? [US_NATIONAL_SECTION]
			: US_SECTIONS.filter((section) => section !== US_NATIONAL_SECTION);
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
	/** Parsed TCF EU sections by TC String; `null` when it does not decode. */
	const parsedTCStrings = new Map<string, GPPSectionState['parsed']>();
	const decoding = new Set<string>();

	/** Decodes a TC String once, then calls `onDecoded`. */
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
			parsed = await parseTCFEUSection(tcString);
		} catch {
			// Publish the string without a parsed form.
		}
		decoding.delete(tcString);
		// Only the latest string matters; keep the cache to one entry.
		parsedTCStrings.clear();
		parsedTCStrings.set(tcString, parsed);
		if (!disposed) {
			onDecoded();
		}
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
			const tcString = snapshot.iab?.authority?.tcString ?? '';
			if (!tcString) {
				return { applicableSections: [TCF_EU_SECTION_ID], sections: [] };
			}
			if (!parsedTCStrings.has(tcString)) {
				void decodeTCString(tcString, onDecoded);
				return null;
			}
			return {
				applicableSections: [TCF_EU_SECTION_ID],
				sections: [
					{
						encoded: tcString,
						id: TCF_EU_SECTION_ID,
						parsed: parsedTCStrings.get(tcString) ?? null,
						prefix: TCF_EU_PREFIX,
					},
				],
			};
		}
		const definition = resolveUSSectionDefinition(snapshot, usApproach);
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
		const snapshot = kernel.getSnapshot();
		const visible = isPromptVisible(snapshot);
		// Until the policy resolves or a new TC String decodes, keep the
		// published sections and tell vendors to wait.
		const resolved = snapshot.policyPending
			? null
			: resolveSections(snapshot, sync);
		// Under an iab policy, wait for the vendor list: until it loads, the
		// TCF CMP cannot have confirmed or restored a TC String.
		const waitingForTCF = tcf && snapshot.model === 'iab' && !snapshot.iab?.gvl;
		published = {
			...published,
			...resolved,
			cmpDisplayStatus: visible ? 'visible' : 'hidden',
			cmpId: resolveCmpId(snapshot),
			signalStatus:
				resolved && !visible && !waitingForTCF ? 'ready' : 'not ready',
		};
		api.publish(published);
	};

	sync();
	const unsubscribe = kernel.subscribe(sync);

	return {
		dispose: () => {
			disposed = true;
			unsubscribe();
			api.destroy();
			destroyGPPStub();
		},
		getGPPString: () => api.getPingData().gppString,
		getPingData: api.getPingData,
	};
};
