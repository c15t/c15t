import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';

interface GorgiasChatApi {
	init: () => Promise<unknown>;
	disableSegment: () => void;
}

declare global {
	interface Window {
		GorgiasChat?: GorgiasChatApi;
	}
}

/** Gorgias Chat loader, gated on functionality consent. */
export const gorgiasChatManifest = {
	...vendorManifestContract,
	category: 'functionality',
	install: [
		{
			async: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	vendor: 'gorgias',
	vendorDetails: {
		homepageUrl: 'https://www.gorgias.com/',
		legalName: 'Gorgias Inc.',
		name: 'Gorgias Chat',
		privacyPolicyUrl: 'https://www.gorgias.com/legal/privacy',
	},
} as const satisfies VendorManifest;

export interface GorgiasChatOptions {
	/** Public v3 app key, or the legacy v2 application ID from your snippet. */
	appKey: string;
	/** Installation snippet version. @default 3 */
	version?: 2 | 3;
}

interface GorgiasLoad {
	element: HTMLScriptElement;
	measurement: boolean;
	api?: GorgiasChatApi;
	initializing: boolean;
	segmentDisabled: boolean;
	removeListener: () => void;
}

/**
 * Loads Gorgias Chat after its mapped consent gate allows it.
 *
 * Disables Segment when measurement is denied, using Gorgias's documented
 * readiness wrapper. Gorgias has no documented analytics re-enable or full
 * shutdown API. Keep c15t's default reload on consent revocation enabled.
 *
 * @param options - Gorgias installation key and snippet version.
 * @returns The consent-gated Gorgias Chat script configuration.
 * @remarks Missing or blank `appKey` values log an error and return a script
 *   that never loads. Remove existing Gorgias installation snippets before
 *   registering this helper. Once disabled, Segment stays disabled until a
 *   page reload, even if measurement consent is granted again.
 * @example
 * gorgiasChat({ appKey: 'YOUR_GORGIAS_APP_KEY' });
 * @see https://docs.gorgias.com/en-US/customize-the-chat-widget-with-HTML-and-JavaScript-286032
 */
export const gorgiasChat = function gorgiasChat(
	options: GorgiasChatOptions
): Script {
	const appKey = readId(options?.appKey);
	if (appKey === undefined) {
		return skipMissingId('gorgiasChat', 'appKey', {
			category: 'functionality',
			manifest: gorgiasChatManifest,
		});
	}

	const version = options.version ?? 3;
	const encodedKey = encodeURIComponent(appKey);
	const script = resolveManifest(gorgiasChatManifest, {
		scriptSrc:
			version === 2
				? `https://config.gorgias.chat/gorgias-chat-bundle-loader.js?applicationId=${encodedKey}`
				: `https://config.gorgias.chat/bundle-loader/${encodedKey}`,
	});
	let current: GorgiasLoad | undefined;

	const isCurrent = (load: GorgiasLoad): boolean =>
		current === load && load.element.isConnected;
	const disableSegment = (load: GorgiasLoad): void => {
		if (load.api && !load.segmentDisabled) {
			load.api.disableSegment();
			load.segmentDisabled = true;
		}
	};
	const cancel = (): void => {
		current?.removeListener();
		current = undefined;
	};
	const ready = (load: GorgiasLoad): void => {
		if (!isCurrent(load) || load.api) {
			return;
		}
		load.api = window.GorgiasChat;
		if (!load.api) {
			return;
		}
		load.removeListener();
		if (!load.measurement) {
			disableSegment(load);
		}
	};
	const waitForInit = async (load: GorgiasLoad): Promise<void> => {
		if (!isCurrent(load) || load.api || load.initializing) {
			return;
		}
		const api = window.GorgiasChat;
		if (!api) {
			return;
		}
		load.initializing = true;
		// The vendor's pre-init Proxy throws on reads of every method except
		// init. Do not inspect disableSegment until its promise resolves.
		try {
			await api.init();
		} catch (error) {
			if (isCurrent(load)) {
				cancel();
				console.error('gorgiasChat: chat initialization failed.', error);
			}
			return;
		}
		ready(load);
	};
	const update = (info: ScriptCallbackInfo): GorgiasLoad | undefined => {
		if (!info.hasConsent) {
			if (current) {
				disableSegment(current);
			}
			cancel();
			return;
		}
		if (!info.element) {
			return;
		}
		if (current?.element !== info.element) {
			cancel();
			const onReady = (): void => {
				if (current && current.element === info.element) {
					ready(current);
				}
			};
			const load: GorgiasLoad = {
				element: info.element,
				initializing: false,
				measurement: info.consents.measurement === true,
				removeListener: () =>
					window.removeEventListener('gorgias-widget-loaded', onReady),
				segmentDisabled: false,
			};
			current = load;
			window.addEventListener('gorgias-widget-loaded', onReady);
		}
		const load = current;
		if (load) {
			load.measurement = info.consents.measurement === true;
			if (isCurrent(load) && !load.measurement) {
				disableSegment(load);
			}
		}
		return load;
	};

	return {
		...script,
		onBeforeLoad: update,
		onConsentChange(info) {
			const load = update(info);
			if (load) {
				void waitForInit(load);
			}
		},
		onDispose: cancel,
		onError: cancel,
		onLoad(info) {
			if (!info.element?.isConnected) {
				return;
			}
			const load = update(info);
			if (load) {
				void waitForInit(load);
			}
		},
		// The readiness listener must exist before the remote loader executes.
		serverStart: undefined,
		target: 'body',
	};
};
