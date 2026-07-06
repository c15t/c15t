import { afterEach, vi } from 'vitest';
import {
	clearAllScripts,
	loadScripts,
	updateScripts,
} from '../../core/src/libs/script-loader';

export type GoogleTagDataState = {
	ics: {
		usedDefault: boolean;
		usedImplicit: boolean;
	};
};

type TikTokQueueMethodName =
	| 'load'
	| 'page'
	| 'track'
	| 'identify'
	| 'instances'
	| 'debug'
	| 'on'
	| 'off'
	| 'once'
	| 'ready'
	| 'alias'
	| 'group'
	| 'enableCookie'
	| 'disableCookie'
	| 'holdConsent'
	| 'revokeConsent'
	| 'grantConsent';

export type TikTokQueue = {
	[index: number]: unknown;
	length: number;
	push: (...items: unknown[]) => number;
} & {
	[K in TikTokQueueMethodName]?: (...args: unknown[]) => unknown;
};

type SnapchatQueueStub = ((...args: unknown[]) => void) & {
	handleRequest?: (...args: unknown[]) => void;
	loaded?: boolean;
	push?: SnapchatQueueStub;
	queue?: unknown[][];
	version?: string;
};

export type TestWindow = Window &
	typeof globalThis & {
		TiktokAnalyticsObject?: string;
		UET?: new (
			options: Record<string, unknown>
		) => {
			push: (...args: unknown[]) => void;
		};
		$crisp?: unknown[][];
		CRISP_COOKIE_DOMAIN?: string;
		CRISP_COOKIE_EXPIRE?: number;
		CRISP_RUNTIME_CONFIG?: {
			locale?: string;
			session_merge?: boolean;
		};
		CRISP_TOKEN_ID?: string;
		CRISP_WEBSITE_ID?: string;
		Intercom?: ((...args: unknown[]) => void) & { q?: unknown[][] };
		_linkedin_data_partner_ids?: string[];
		_linkedin_partner_id?: string;
		_fbq?: Record<string, unknown>;
		_hjSettings?: {
			hjid: number | string;
			hjsv: number;
		};
		_paq?: unknown[];
		_satellite?: Record<string, unknown>;
		_snaptr?: SnapchatQueueStub;
		adobeDataLayer?: unknown[];
		amplitude?: {
			_q?: Array<{
				name: string;
				args: unknown[];
				resolve: (value: unknown) => void;
			}>;
			_iq?: Record<string, unknown>;
			invoked?: boolean;
			Identify?: new () => {
				_q?: Array<{
					name: string;
					args: unknown[];
				}>;
				set: (property: string, value: unknown) => unknown;
			};
			init?: (...args: unknown[]) => unknown;
			track?: (...args: unknown[]) => unknown;
			identify?: (...args: unknown[]) => unknown;
			setUserId?: (...args: unknown[]) => unknown;
			setOptOut?: (...args: unknown[]) => unknown;
			flush?: (...args: unknown[]) => unknown;
		};
		analytics?: unknown[] & Record<string, (...args: unknown[]) => void>;
		clarity?: ((...args: unknown[]) => void) & {
			q?: unknown[][];
			v?: string;
		};
		dataLayer?: unknown[];
		databuddy?: {
			options: {
				disabled?: boolean;
			};
		};
		databuddyConfig?: Record<string, unknown>;
		fbq?: Record<string, unknown>;
		google_tag_data?: GoogleTagDataState;
		heap?: (unknown[] | Record<string, unknown>) & {
			appid?: string;
			clientConfig?: Record<string, unknown>;
			envId?: string;
			identify?: (...args: unknown[]) => unknown;
			track?: (...args: unknown[]) => unknown;
		};
		heapReadyCb?: Array<{
			name: string;
			fn: () => void;
		}>;
		htevents?: unknown[] & Record<string, (...args: unknown[]) => void>;
		hj?: ((...args: unknown[]) => void) & { q?: unknown[][] };
		intercomSettings?: Record<string, unknown>;
		lintrk?: ((...args: unknown[]) => void) & { q?: unknown[] };
		LogRocket?: {
			init: (appId: string, options?: Record<string, unknown>) => void;
		};
		mixpanel?: unknown[] & Record<string, (...args: unknown[]) => void>;
		pirsch?: (
			eventName: string,
			options?: {
				duration?: number;
				meta?: Record<string, unknown>;
				non_interactive?: boolean;
			}
		) => Promise<null | undefined>;
		pirschClearSession?: () => void;
		pirschInit?: () => void;
		pirschNotFound?: () => void;
		plausible?: ((...args: unknown[]) => void) & {
			o?: Record<string, unknown>;
			q?: unknown[][];
		};
		posthog?: {
			get_explicit_consent_status: () => string;
			init: (...args: unknown[]) => void;
			opt_in_capturing: () => void;
			opt_out_capturing: () => void;
		};
		rdt?: ((...args: unknown[]) => void) & {
			callQueue?: unknown[][];
			sendEvent?: (...args: unknown[]) => void;
		};
		rudderanalytics?: unknown[] & Record<string, (...args: unknown[]) => void>;
		rudderAnalyticsBuildType?: string;
		RudderSnippetVersion?: string;
		snaptr?: SnapchatQueueStub;
		ttq?: TikTokQueue;
		twq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
		uetq?: unknown[] | { push: (...args: unknown[]) => void };
		va?: (event: string, properties?: unknown) => void;
		vaq?: unknown[][];
	};

export { loadScripts, updateScripts };

export const deniedConsents = {
	necessary: true,
	functionality: false,
	measurement: false,
	marketing: false,
	experience: false,
};

export const grantedMeasurementConsents = {
	...deniedConsents,
	measurement: true,
};

export const grantedMarketingConsents = {
	...deniedConsents,
	marketing: true,
};

export function isArgumentsPayload(value: unknown): value is IArguments {
	return Object.prototype.toString.call(value) === '[object Arguments]';
}

export function toArgs(value: unknown): unknown[] {
	return Array.from(value as IArguments);
}

function installAppendProbe(
	target: HTMLHeadElement | HTMLBodyElement,
	onAppend: (script: HTMLScriptElement, win: TestWindow) => void
) {
	const originalAppendChild = target.appendChild.bind(target);

	return vi.spyOn(target, 'appendChild').mockImplementation((node: Node) => {
		const appended = originalAppendChild(node);

		if (node instanceof HTMLScriptElement) {
			onAppend(node, window as TestWindow);
		}

		return appended;
	});
}

export function installHeadProbe(
	onAppend: (script: HTMLScriptElement, win: TestWindow) => void
) {
	return installAppendProbe(document.head, onAppend);
}

export function installBodyProbe(
	onAppend: (script: HTMLScriptElement, win: TestWindow) => void
) {
	return installAppendProbe(document.body, onAppend);
}

function resetVendorGlobals() {
	const win = window as TestWindow;

	for (const key of [
		'TiktokAnalyticsObject',
		'UET',
		'$crisp',
		'CRISP_COOKIE_DOMAIN',
		'CRISP_COOKIE_EXPIRE',
		'CRISP_RUNTIME_CONFIG',
		'CRISP_TOKEN_ID',
		'CRISP_WEBSITE_ID',
		'Intercom',
		'_linkedin_data_partner_ids',
		'_linkedin_partner_id',
		'_fbq',
		'_hjSettings',
		'_paq',
		'_satellite',
		'_snaptr',
		'adobeDataLayer',
		'amplitude',
		'analytics',
		'clarity',
		'dataLayer',
		'databuddy',
		'databuddyConfig',
		'fbq',
		'google_tag_data',
		'heap',
		'heapReadyCb',
		'htevents',
		'hj',
		'intercomSettings',
		'lintrk',
		'LogRocket',
		'mixpanel',
		'pirsch',
		'pirschClearSession',
		'pirschInit',
		'pirschNotFound',
		'plausible',
		'posthog',
		'rdt',
		'rudderanalytics',
		'rudderAnalyticsBuildType',
		'RudderSnippetVersion',
		'snaptr',
		'ttq',
		'twq',
		'uetq',
		'va',
		'vaq',
	] as const) {
		delete win[key];
	}
}

export function registerVendorContractCleanup() {
	afterEach(() => {
		clearAllScripts();
		vi.restoreAllMocks();
		document.head.innerHTML = '';
		document.body.innerHTML = '';
		resetVendorGlobals();
	});
}
