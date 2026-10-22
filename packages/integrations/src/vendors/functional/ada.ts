import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { trimToUndefined } from '../_shared/script-url';

const ADA_MESSAGING_SDK_URL = 'https://messaging-assets.ada.support/sdk.js';

/** Ada Messaging metadata. The helper imports its module after consent. */
export const adaManifest = {
	...vendorManifestContract,
	category: 'functionality',
	install: [],
	vendor: 'ada',
	vendorDetails: {
		homepageUrl: 'https://www.ada.cx/',
		legalName: 'Ada Support Inc.',
		name: 'Ada',
		privacyPolicyUrl: 'https://www.ada.cx/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

/** Configuration for Ada's Messaging Web SDK. */
export interface AdaOptions {
	/** Public AI Agent handle supplied by Ada. */
	handle: string;
	/**
	 * Regional cluster supplied by Ada, such as `eu`, `us2`, or `maple`.
	 * Leave unset for an Agent on the default cluster.
	 */
	cluster?: string;
	/** Ada base-domain segment. Set only when Ada supplies an override. */
	domain?: string;
}

interface AdaMessagingInterface {
	start: (settings: AdaOptions) => Promise<void>;
	stop: () => Promise<void>;
}

interface AdaMessagingModule {
	createAdaEmbedInterface: () => AdaMessagingInterface;
}

interface StartAttempt {
	cancelled: boolean;
	started: boolean;
	stop?: Promise<void>;
}

// Ada permits one interface per page, including fresh helper objects.
let instance: AdaMessagingInterface | undefined;
let attempt: StartAttempt | undefined;
let operations = Promise.resolve();
// Settings of the granted configuration; undefined while Messaging is off.
let active: AdaOptions | undefined;
// Invariant: every symbol here belongs to the configuration in `active`.
const registrations = new Set<symbol>();

const stop = (current: StartAttempt): Promise<void> => {
	if (!current.started || !instance) {
		return Promise.resolve();
	}
	if (!current.stop) {
		const client = instance;
		current.stop = (async () => {
			try {
				await client.stop();
			} catch (error) {
				console.error('ada: failed to stop Messaging.', error);
			}
		})();
	}
	return current.stop;
};

const sameSettings = (left: AdaOptions, right: AdaOptions): boolean =>
	left.handle === right.handle &&
	left.cluster === right.cluster &&
	left.domain === right.domain;

const deactivate = (): void => {
	active = undefined;
	if (!attempt || attempt.cancelled) {
		return;
	}
	attempt.cancelled = true;
	// Stop immediately: awaiting start first would leave a pending SDK active.
	const pending = [operations, stop(attempt)];
	operations = (async () => {
		await Promise.all(pending);
	})();
};

const startMessaging = (settings: AdaOptions): void => {
	if (active) {
		return;
	}
	active = settings;
	const current: StartAttempt = { cancelled: false, started: false };
	attempt = current;
	const pending = operations;
	operations = (async () => {
		try {
			await pending;
			if (current.cancelled) {
				return;
			}
			// Ada's entry performs network/storage work during evaluation.
			// Keep this import inside the granted-consent lifecycle.
			const sdk: AdaMessagingModule = await import(
				/* webpackIgnore: true */
				/* @vite-ignore */
				ADA_MESSAGING_SDK_URL
			);
			if (current.cancelled) {
				return;
			}
			if (typeof sdk.createAdaEmbedInterface !== 'function') {
				throw new Error(
					'Ada Messaging did not export createAdaEmbedInterface.'
				);
			}
			// A second interface rejects with start_owner_conflict. Revocation
			// already ran stop() before this start, and Ada documents that
			// stop() then start() creates a new client with the new settings.
			instance ??= sdk.createAdaEmbedInterface();
			current.started = true;
			await instance.start(settings);
		} catch (error) {
			if (!current.cancelled) {
				active = undefined;
				registrations.clear();
				console.error('ada: failed to start Messaging.', error);
			}
		}
	})();
};

/**
 * Loads Ada Messaging only after the script's mapped consent is granted.
 *
 * Repeated registrations share one private Messaging interface. A
 * registration whose settings differ from the active configuration logs a
 * `console.warn` and is ignored until the page reloads. When the last granted
 * loader revokes consent or disposes the script, Ada's documented `stop()` runs,
 * including while `start()` is pending. A later grant waits for pending work.
 * Once every registration is gone and `stop()` has run, a later registration
 * can restart the reused interface with different settings.
 *
 * @param options - AI Agent handle and optional Ada regional settings.
 * @returns A callback-only script gated on functionality consent.
 * @remarks A missing or blank `handle` logs `ada: missing or invalid handle`
 * with `console.error` and returns a script that never loads. `stop()` does
 * not erase the visitor's stored conversation. An import already in progress
 * cannot be cancelled, so keep c15t's reload-on-revocation behavior enabled.
 * @example
 * ada({ handle: 'YOUR_ADA_HANDLE' });
 * @see https://docs.ada.cx/messaging/web/getting-started
 * @see https://docs.ada.cx/messaging/web/sdk-api-reference#stop
 */
export const ada = function ada(options: AdaOptions): Script {
	const handle = readId(options?.handle);
	if (handle === undefined) {
		return skipMissingId('ada', 'handle', {
			category: 'functionality',
			manifest: adaManifest,
		});
	}

	const settings: AdaOptions = { handle };
	const cluster = trimToUndefined(options.cluster);
	const domain = trimToUndefined(options.domain);
	if (cluster) {
		settings.cluster = cluster;
	}
	if (domain) {
		settings.domain = domain;
	}

	const registration = Symbol('ada');
	let ignored = false;
	const dispose = (info: ScriptCallbackInfo): void => {
		if (ignored) {
			return;
		}
		registrations.delete(info.registration ?? registration);
		if (registrations.size === 0) {
			deactivate();
		}
	};

	const update = (info: ScriptCallbackInfo): void => {
		if (!info.hasConsent) {
			dispose(info);
			return;
		}
		if (ignored || typeof window === 'undefined') {
			return;
		}
		if (active && !sameSettings(active, settings)) {
			ignored = true;
			registrations.delete(info.registration ?? registration);
			console.warn(
				'ada: Ada supports one configuration per page. These settings are ignored until the page reloads.'
			);
			return;
		}
		registrations.add(info.registration ?? registration);
		startMessaging(settings);
	};

	return {
		...resolveManifest(adaManifest),
		observeConsentBeforeLoad: true,
		onBeforeLoad: update,
		onConsentChange: update,
		onDispose: dispose,
		onLoad: update,
	};
};
