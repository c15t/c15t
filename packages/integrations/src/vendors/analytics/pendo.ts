import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		pendo?: {
			_q?: unknown[][];
			initialize: (options: Record<string, unknown>) => void;
			stopSendingEvents: () => void;
			startSendingEvents: () => void;
			isSendingEvents?: () => boolean;
		};
	}
}

/** Pendo's agent, without initialization before consent. */
export const pendoManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'pendo',
	vendorDetails: {
		homepageUrl: 'https://www.pendo.io/',
		legalName: 'Pendo.io, Inc.',
		name: 'Pendo',
		privacyPolicyUrl: 'https://www.pendo.io/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface PendoOptions {
	/** Public Pendo application key. */
	apiKey: string;
	/** Visitor metadata passed to initialize. */
	visitor?: Record<string, unknown>;
	/** Account metadata passed to initialize. */
	account?: Record<string, unknown>;
	/** SDK initialization options, including disableCookies and excludeAllText. */
	initializeOptions?: Record<string, unknown>;
	/** Consent condition required before loading. @default 'measurement' */
	category?: Script['category'];
	/** Custom, regional or proxied agent URL. */
	scriptUrl?: string;
}

const reusePendo = createScriptReuse<PendoOptions>();

const createPendo = function createPendo(options: PendoOptions): Script {
	const category = options?.category ?? 'measurement';
	const apiKey = readId(options?.apiKey);
	if (!apiKey) {
		return skipMissingId('pendo', 'apiKey', {
			category,
			manifest: pendoManifest,
		});
	}
	const script = resolveManifest(pendoManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://cdn.pendo.io/agent/static/${encodeURIComponent(apiKey)}/pendo.js`
		),
	});
	const initializeOptions = {
		...options.initializeOptions,
	};
	if (options.visitor) {
		initializeOptions.visitor = options.visitor;
	}
	if (options.account) {
		initializeOptions.account = options.account;
	}
	let initialized = false;
	let hasConsent = false;
	let loaded = false;
	let appliedConsent: boolean | undefined;
	let activationQueued = false;
	const applyConsent = (): void => {
		if (!loaded || appliedConsent === hasConsent) {
			return;
		}
		if (!hasConsent) {
			const api = window.pendo;
			if (!api) {
				throw new Error('pendo: loader did not install the Pendo API');
			}
			api.stopSendingEvents();
			appliedConsent = false;
			return;
		}
		if (activationQueued) {
			return;
		}
		activationQueued = true;
		queueMicrotask(() => {
			activationQueued = false;
			if (!loaded || !hasConsent || appliedConsent === true) {
				return;
			}
			const api = window.pendo;
			if (!api) {
				throw new Error('pendo: loader did not install the Pendo API');
			}
			const resume = appliedConsent === false;
			if (!initialized) {
				appliedConsent = undefined;
				api.initialize(initializeOptions);
				initialized = true;
			}
			if (!hasConsent || !loaded) {
				return;
			}
			if (resume) {
				api.startSendingEvents();
			}
			appliedConsent = true;
		});
	};
	return {
		...script,
		category,
		onBeforeLoad({ hasConsent: consent }) {
			hasConsent = consent;
		},
		onConsentChange({ hasConsent: consent }) {
			hasConsent = consent;
			applyConsent();
		},
		onDispose() {
			hasConsent = false;
			applyConsent();
			loaded = false;
		},
		onLoad({ element, hasConsent: consent }) {
			if (!element?.isConnected) {
				return;
			}
			hasConsent = consent;
			loaded = true;
			applyConsent();
		},
	};
};

/**
 * Initializes Pendo only after consent, then stops/resumes event sending.
 * The helper preserves identity on revoke. clearSession creates an anonymous
 * identity and can send identification events; it is not a shutdown API.
 * @param options - Application key, identity metadata and agent options.
 * @returns A gated script, or an inactive script for a missing API key.
 * @example pendo({ apiKey: 'YOUR_API_KEY', visitor: { id: 'VISITOR_ID' } });
 * @see https://web-sdk.pendo.io/public/events
 */
export const pendo = function pendo(options: PendoOptions): Script {
	if (!readId(options?.apiKey)) {
		return skipMissingId('pendo', 'apiKey', {
			category: options?.category ?? 'measurement',
			manifest: pendoManifest,
		});
	}
	return reusePendo(options, createPendo);
};
