import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export type ClarityConsentValue = boolean | Record<string, string>;

type ClarityFunction = {
	(command: 'consent', value?: ClarityConsentValue): void;
	(command: 'event', value: string): void;
	(command: 'identify', id: string, session?: string, page?: string): unknown;
	(command: 'set', key: string, value: string | string[]): void;
	(command: 'start', options?: Record<string, unknown>): void;
	(command: 'upgrade', reason: string): void;
	(command: string, ...args: unknown[]): unknown;
};

declare global {
	interface Window {
		clarity: ClarityFunction & {
			q?: unknown[][];
			v?: string;
		};
	}
}

/**
 * Microsoft Clarity vendor manifest.
 *
 * Seeds the global queue stub before loading the vendor bundle and uses
 * Clarity's consent API for simple granted and denied transitions.
 */
export const clarityManifest = {
	...vendorManifestContract,
	vendor: 'clarity',
	category: 'measurement',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'clarity',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			properties: {
				v: '0.7.0',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'clarity',
			args: ['consent', true],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'clarity',
			args: ['consent', false],
		},
	],
} as const satisfies VendorManifest;

export interface ClarityOptions {
	/**
	 * Your Microsoft Clarity project ID.
	 * @example `abcdef1234`
	 */
	id: string;

	/**
	 * Optional initial consent value queued before the script loads.
	 *
	 * Object-shaped advanced consent vectors are supported only for this initial
	 * boot-time value. Later c15t consent changes are mapped to simple booleans.
	 */
	defaultConsent?: ClarityConsentValue;

	/** Clarity loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Microsoft Clarity script.
 *
 * @param options - The options for the Clarity script.
 * @returns The Clarity script configuration.
 */
export function clarity({
	id,
	defaultConsent,
	scriptUrl,
}: ClarityOptions): Script {
	const normalizedId = id.trim();

	if (scriptUrl === undefined && normalizedId.length === 0) {
		throw new Error(
			`Invalid Clarity id value "${id}". A non-empty id is required to construct the Clarity loader URL when scriptUrl is not provided.`
		);
	}

	let manifest = clarityManifest;

	if (defaultConsent !== undefined) {
		manifest = {
			...clarityManifest,
			install: [
				{
					type: 'callGlobal',
					global: 'clarity',
					args: ['consent', '{{defaultConsent}}'],
				},
				...clarityManifest.install,
			],
		} as const satisfies VendorManifest;
	}

	return resolveManifest(manifest, {
		defaultConsent,
		scriptUrl: scriptUrl ?? `https://www.clarity.ms/tag/${normalizedId}`,
	});
}
