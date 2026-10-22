import type { Script, ScriptCallbackInfo } from '@c15t/core';

import type { IntegrationConsentCondition } from '../../registry';
import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** Default's scheduler display configuration. */
export type DefaultComAutoDisplayScheduler =
	| boolean
	| {
			/** Show Default's loading indicator while opening the scheduler. */
			loader?: boolean;
			/** CSS selector or element for the scheduler container. */
			target: string | HTMLElement;
	  };

/** Options for the current Default Pixel. */
export interface DefaultComPixelOptions {
	/** Scheduler display setting forwarded to Default without modification. */
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	/**
	 * Consent required to permit tracking and, by default, load the Pixel.
	 * @default 'measurement'
	 */
	category?: IntegrationConsentCondition;
	/**
	 * `always` loads before consent and forwards the current consent state.
	 * Default can still fetch its form list, capture forms and show a scheduler.
	 * @default 'after-consent'
	 */
	loadMode?: 'after-consent' | 'always';
	/** Public key from your Default workspace. Whitespace is trimmed. */
	publicKey: string;
	/** Scheduler origins allowed by your Default workspace. */
	schedulerOrigins?: string[];
	/**
	 * Custom or proxied loader for the current Pixel generation.
	 * Blank values use the default URL.
	 * @default 'https://handshake.default.com/index.js'
	 */
	scriptUrl?: string;
}

/** Options for a standalone Default Forms SDK installation. */
export interface DefaultComFormsSdkOptions extends Omit<
	DefaultComPixelOptions,
	'category' | 'loadMode'
> {
	/** Scheduler display setting. Omission restores the default `true`. */
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	/**
	 * Consent required to load and initialize the standalone Forms SDK.
	 * @default 'functionality'
	 */
	category?: IntegrationConsentCondition;
	/** Default API endpoint override, for example a configured same-origin proxy. */
	endpoint?: string;
	/**
	 * Custom or proxied loader for the current Forms SDK generation.
	 * Blank values use the default URL.
	 * @default 'https://handshake.default.com/sdk.js'
	 */
	scriptUrl?: string;
}

interface DefaultComConsent {
	analytics: boolean;
	marketing: boolean;
}

interface DefaultComPixelBootstrap {
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	key?: string;
	q?: unknown[];
	schedulerOrigins?: string[];
	/** Update either or both permissions. Omitted fields retain their value. */
	setConsent?: (consent: Partial<DefaultComConsent>) => void;
}

/** Configuration accepted by DefaultPixelSDK.init(). */
export interface DefaultComFormsSdkInitOptions {
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	endpoint?: string;
	publicKey: string;
	schedulerOrigins?: string[];
}

/** Field values accepted by Default's manual form submission API. */
export type DefaultComFormResponses = Record<
	string,
	string | number | boolean | string[] | null
>;

/** Manual submission to a Pixel form ID, an HTML form ID, or both. */
export type DefaultComSubmitFormOptions = {
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	metadata?: Record<string, unknown>;
	responses: DefaultComFormResponses;
} & (
	| { formId: string; pixelFormId?: string }
	| { formId?: string; pixelFormId: string }
);

/** Result of a submission request, which does not prove workflow delivery. */
export type DefaultComSubmitFormResult =
	| {
			error: string;
			/** HTTP status, or zero when the request never reached Default. */
			status: number;
			success: false;
	  }
	| {
			redirect?: { url: string };
			scheduler?: { url: string };
			status: number;
			success: true;
			/** Unvalidated server response. Narrow before reading workflow fields. */
			workflow?: unknown;
	  };

/** Email-field warmup for hosts without a native form element. */
export interface DefaultComFormInteractionOptions {
	eventType?: string;
	fieldName: string;
	fieldType?: string;
	fieldValue: string;
	formId?: string;
	formName?: string;
	responses?: Record<string, string>;
}

/** Scheduler event payloads documented by Default. */
export interface DefaultComSchedulerEventMap {
	closed: undefined;
	displayed: { bookingParam: string; orgSlug: string };
	meeting_booked: {
		meetingId: string;
		personEmail: string;
		startTime: string;
	};
	meeting_cancelled: { meetingId: string };
	/** Reserved by Default; delivery is not guaranteed. */
	meeting_timeout: { meetingId?: string };
}

/** Subscribe to a scheduler event and receive an unsubscribe function. */
export type DefaultComSchedulerSubscription<
	EventType extends keyof DefaultComSchedulerEventMap,
> = (
	handler: (payload: DefaultComSchedulerEventMap[EventType]) => void
) => () => void;

/** Scheduler display and event helpers available on DefaultPixelSDK. */
export interface DefaultComScheduler {
	/**
	 * Display a scheduler URL using modal, inline or disabled behavior.
	 * @param url - Scheduler URL returned by Default.
	 * @param option - Display configuration. Defaults to a modal.
	 * @returns A function that removes the displayed scheduler.
	 */
	display: (url: string, option?: DefaultComAutoDisplayScheduler) => () => void;
	onClosed: DefaultComSchedulerSubscription<'closed'>;
	onDisplayed: DefaultComSchedulerSubscription<'displayed'>;
	onMeetingBooked: DefaultComSchedulerSubscription<'meeting_booked'>;
	onMeetingCancelled: DefaultComSchedulerSubscription<'meeting_cancelled'>;
	onMeetingTimeout: DefaultComSchedulerSubscription<'meeting_timeout'>;
}

/** Public standalone Forms SDK API, loaded after its configured consent. */
export interface DefaultComFormsSdkClient {
	/** Configure the SDK and start it on the first call. */
	init: (options: DefaultComFormsSdkInitOptions) => void;
	/**
	 * Subscribe to an event from an allowed scheduler origin.
	 * @param eventType - Scheduler event name.
	 * @param handler - Callback receiving that event's payload.
	 * @returns A function that removes the subscription.
	 */
	on: <EventType extends keyof DefaultComSchedulerEventMap>(
		eventType: EventType,
		handler: (payload: DefaultComSchedulerEventMap[EventType]) => void
	) => () => void;
	/** Warm form context for pre-enrichment, swallowing request failures. */
	recordFormInteraction: (
		options: DefaultComFormInteractionOptions
	) => Promise<void>;
	scheduler: DefaultComScheduler;
	/** Update either or both permissions. Omitted fields retain their value. */
	setConsent: (consent: Partial<DefaultComConsent>) => void;
	/** Submit form values and return Default's request result. */
	submitForm: (
		options: DefaultComSubmitFormOptions
	) => Promise<DefaultComSubmitFormResult>;
}

declare global {
	interface Window {
		__defaultPixel__?: DefaultComPixelBootstrap;
		DefaultPixel?: Pick<
			DefaultComFormsSdkClient,
			'on' | 'scheduler' | 'submitForm'
		>;
		DefaultPixelSDK?: DefaultComFormsSdkClient;
	}
}

const vendorDetails = {
	homepageUrl: 'https://www.default.com/',
	legalName: 'Tomo HQ, Inc.',
	name: 'Default',
	privacyPolicyUrl: 'https://www.default.com/legal/privacy',
};

/** Current Default Pixel loader. The helper supplies its runtime bootstrap. */
export const defaultComPixelManifest = {
	...vendorManifestContract,
	category: '{{category}}',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'default-com',
	vendorDetails,
} satisfies VendorManifest;

/** Standalone Forms SDK loader. Shares the Pixel's preference-center vendor. */
export const defaultComFormsSdkManifest = {
	...vendorManifestContract,
	category: '{{category}}',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'default-com',
	vendorDetails,
} satisfies VendorManifest;

type SdkRegistration = symbol | HTMLScriptElement;
interface SdkState {
	options?: DefaultComFormsSdkInitOptions;
	registrations: Map<SdkRegistration, DefaultComConsent>;
}
const sdkStates = new WeakMap<DefaultComFormsSdkClient, SdkState>();
const sdkOwners = new Map<SdkRegistration, DefaultComFormsSdkClient>();
const formsElements = new WeakSet<HTMLScriptElement>();
const loadedFormsElements = new WeakSet<HTMLScriptElement>();

const registrationOf = (
	info: ScriptCallbackInfo
): SdkRegistration | undefined => info.registration ?? info.element;

const forwardSdkConsent = (sdk: DefaultComFormsSdkClient): void => {
	const states = [...(sdkStates.get(sdk)?.registrations.values() ?? [])];
	sdk.setConsent({
		analytics: states.length > 0 && states.every((state) => state.analytics),
		marketing: states.length > 0 && states.every((state) => state.marketing),
	});
};

// Stable identity lets core retain the resource across configuration updates.
const disposeFormsSdk = (info: ScriptCallbackInfo): void => {
	const registration = registrationOf(info);
	const sdk =
		registration === undefined ? undefined : sdkOwners.get(registration);
	if (registration !== undefined && sdk) {
		sdkOwners.delete(registration);
		sdkStates.get(sdk)?.registrations.delete(registration);
		forwardSdkConsent(sdk);
	}
};

const denyDetachedFormsSdk = (info: ScriptCallbackInfo): void => {
	const registration = registrationOf(info);
	if (registration === undefined) {
		return;
	}
	const sdk = sdkOwners.get(registration);
	if (sdk) {
		sdkStates.get(sdk)?.registrations.set(registration, {
			analytics: false,
			marketing: false,
		});
		forwardSdkConsent(sdk);
	}
};

const snapshotSdkOptions = (
	options: DefaultComFormsSdkInitOptions
): DefaultComFormsSdkInitOptions => ({
	...options,
	autoDisplayScheduler:
		typeof options.autoDisplayScheduler === 'object'
			? { ...options.autoDisplayScheduler }
			: (options.autoDisplayScheduler ?? true),
	schedulerOrigins: options.schedulerOrigins?.slice(),
});

const sameSdkOptions = (
	previous: DefaultComFormsSdkInitOptions | undefined,
	next: DefaultComFormsSdkInitOptions
): boolean => {
	if (!previous) {
		return false;
	}
	const previousDisplay = previous.autoDisplayScheduler;
	const nextDisplay = next.autoDisplayScheduler;
	return (
		previous.publicKey === next.publicKey &&
		(previous.endpoint ?? 'https://api.default.com') ===
			(next.endpoint ?? 'https://api.default.com') &&
		previous.schedulerOrigins?.length === next.schedulerOrigins?.length &&
		(previous.schedulerOrigins?.every(
			(origin, index) => origin === next.schedulerOrigins?.[index]
		) ??
			true) &&
		(previousDisplay === nextDisplay ||
			(typeof previousDisplay === 'object' &&
				typeof nextDisplay === 'object' &&
				previousDisplay.target === nextDisplay.target &&
				(previousDisplay.loader ?? false) === (nextDisplay.loader ?? false)))
	);
};
type DefaultComLoader = 'defaultComPixel' | 'defaultComFormsSdk';
const pageLoaders = new WeakMap<Document, DefaultComLoader>();
const blockedLoaderType = 'application/x-c15t-default-conflict';
interface PixelConfiguration extends DefaultComFormsSdkInitOptions {
	scriptUrl: string;
}
const pixelConfigurations = new WeakMap<Document, PixelConfiguration>();
const conflictsWithPixel = (options: PixelConfiguration): boolean => {
	const previous =
		typeof document === 'undefined'
			? undefined
			: pixelConfigurations.get(document);
	return (
		previous !== undefined &&
		(previous.scriptUrl !== options.scriptUrl ||
			!sameSdkOptions(previous, options))
	);
};
const assertPixelConfiguration = (options: PixelConfiguration): void => {
	if (conflictsWithPixel(options)) {
		throw new Error(
			'defaultComPixel: Reload the page to change Default Pixel configuration.'
		);
	}
};

const claimLoader = function claimLoader(
	info: ScriptCallbackInfo,
	helper: DefaultComLoader,
	alwaysLoad = false
): boolean {
	if (
		typeof document === 'undefined' ||
		!info.element ||
		(!alwaysLoad && (!info.hasConsent || info.vendor?.granted === false))
	) {
		return false;
	}
	const existing = pageLoaders.get(document);
	const conflictingGlobal =
		helper === 'defaultComPixel'
			? window.DefaultPixelSDK !== undefined
			: window.__defaultPixel__?.key !== undefined;
	if ((existing !== undefined && existing !== helper) || conflictingGlobal) {
		// Core catches callback errors, so throwing would still insert the loader.
		// Disable the element itself before core appends it.
		info.element.removeAttribute('src');
		info.element.type = blockedLoaderType;
		console.error(
			`${helper}: conflicting Default installation. Use one Default helper per page. The conflicting loader will not run.`
		);
		return false;
	}
	pageLoaders.set(document, helper);
	return true;
};

const ownsLoader = function ownsLoader(
	info: ScriptCallbackInfo,
	helper: DefaultComLoader
): boolean {
	return (
		typeof document !== 'undefined' &&
		pageLoaders.get(document) === helper &&
		info.element?.type !== blockedLoaderType
	);
};

const mapConsent = function mapConsent(
	info: ScriptCallbackInfo
): DefaultComConsent {
	const permitted = info.hasConsent && info.vendor?.granted !== false;
	return {
		analytics: permitted && info.consents.measurement === true,
		marketing: permitted && info.consents.marketing === true,
	};
};

const forwardPixelConsent = function forwardPixelConsent(
	info: ScriptCallbackInfo
): void {
	if (typeof window !== 'undefined' && ownsLoader(info, 'defaultComPixel')) {
		window.__defaultPixel__?.setConsent?.(mapConsent(info));
	}
};

/**
 * Loads the current Default Pixel after measurement consent by default.
 *
 * @param options - Workspace key, consent gate, load mode and Pixel configuration.
 * @returns A consent-aware script, or a skipped script for an invalid key.
 * @remarks
 * Use one Default helper per page. The first helper to load claims the page.
 * A conflicting helper logs an error and disables its loader before insertion.
 * The claim lasts until navigation, including after withdrawal or disposal.
 * A pre-existing Forms SDK global also prevents the Pixel loader from running.
 *
 * The Pixel receives measurement consent as `analytics` and marketing consent
 * as `marketing`. Effective helper or vendor denial sends both values as false.
 * Keep c15t's default revocation reload enabled. Default's consent API does not
 * stop form capture, scheduler activity or an already loaded Vector script.
 * `loadMode: 'always'` explicitly permits the loader and form-list requests
 * before consent, plus form capture and scheduling while tracking is denied.
 * The helper queues the current mapped state before inserting the loader.
 * After loading starts, configuration changes require a new document.
 * Missing, blank or non-string keys log an error and skip loading.
 * @throws {Error} If the workspace key, loader URL or scheduler settings change
 * after a Pixel helper starts in this document. The loader also rejects
 * pre-created configurations before replacing existing registrations.
 * @example defaultComPixel({ publicKey: 'YOUR_PUBLIC_KEY' });
 * @see https://docs.os.default.com/settings/pixel
 * @see https://docs.os.default.com/forms/privacy
 */
export const defaultComPixel = function defaultComPixel(
	options: DefaultComPixelOptions
): Script {
	const category = options?.category ?? 'measurement';
	const alwaysLoad = options?.loadMode === 'always';
	const script = resolveManifest(defaultComPixelManifest, {
		category,
		scriptUrl: resolveScriptUrl(
			options?.scriptUrl,
			'https://handshake.default.com/index.js'
		),
	});
	const publicKey = readId(
		typeof options?.publicKey === 'string' ? options.publicKey : undefined
	);
	if (publicKey === undefined) {
		return skipMissingId('defaultComPixel', 'publicKey', {
			category: script.category,
			manifest: defaultComPixelManifest,
		});
	}
	const configuration: PixelConfiguration = {
		autoDisplayScheduler:
			typeof options.autoDisplayScheduler === 'object'
				? { ...options.autoDisplayScheduler }
				: options.autoDisplayScheduler,
		publicKey,
		schedulerOrigins: options.schedulerOrigins?.slice(),
		scriptUrl: script.src ?? '',
	};
	assertPixelConfiguration(configuration);
	return {
		...script,
		alwaysLoad: alwaysLoad || undefined,
		onBeforeLoad(info) {
			if (conflictsWithPixel(configuration)) {
				if (info.element) {
					info.element.removeAttribute('src');
					info.element.type = blockedLoaderType;
				}
				console.error(
					'defaultComPixel: Reload the page to change Default Pixel configuration.'
				);
				return;
			}
			if (!claimLoader(info, 'defaultComPixel', alwaysLoad)) {
				return;
			}
			pixelConfigurations.set(document, configuration);
			window.__defaultPixel__ ??= {};
			const config = window.__defaultPixel__;
			config.key = publicKey;
			if (configuration.schedulerOrigins !== undefined) {
				config.schedulerOrigins = configuration.schedulerOrigins?.slice();
			}
			if (configuration.autoDisplayScheduler !== undefined) {
				config.autoDisplayScheduler =
					typeof configuration.autoDisplayScheduler === 'object'
						? { ...configuration.autoDisplayScheduler }
						: configuration.autoDisplayScheduler;
			}
			config.q ??= [];
			config.setConsent ??= (consent) => {
				config.q?.push(['setConsent', consent]);
			};
			config.setConsent(mapConsent(info));
		},
		onConsentChange(info) {
			assertPixelConfiguration(configuration);
			forwardPixelConsent(info);
		},
		onLoad(info) {
			if (info.element?.isConnected) {
				forwardPixelConsent(info);
			}
		},
		// The runtime wrapper must apply consent before the loader is inserted.
		serverStart: undefined,
		validate: () => assertPixelConfiguration(configuration),
	};
};

/**
 * Loads the standalone Default Forms SDK after functionality consent by default.
 *
 * @param options - Public workspace key, SDK endpoint and scheduler options.
 * @returns A consent-gated SDK script, or a skipped script for an invalid key.
 * @remarks
 * Use one Default helper per page. The first permitted helper claims the page.
 * A conflicting helper logs an error and disables its loader before insertion.
 * The SDK loader is also blocked when `__defaultPixel__.key` already exists,
 * because the SDK would auto-initialize before this helper forwards consent.
 * This helper never clears or sets Pixel configuration. Claims last until
 * navigation, including after withdrawal or disposal.
 *
 * For a standalone installation, the helper calls `setConsent` before `init`
 * and starts each SDK client once per page. Later permitted configuration
 * changes call `init` again without restarting identity or session warmup.
 * Omitted endpoint and scheduler origins restore the SDK defaults; an omitted
 * scheduler display option restores `true`. This does not isolate workspace
 * identities. A load that finishes while denied receives both consent values
 * as false and waits for a later grant before initialization.
 * Removal and disposal withdraw consent from the owned SDK after its final
 * registration leaves. Keep c15t's default revocation reload enabled because
 * Default does not offer a complete form or scheduler shutdown API.
 * Missing, blank or non-string keys log an error and skip loading.
 * @example defaultComFormsSdk({ publicKey: 'YOUR_PUBLIC_KEY' });
 * @see https://docs.os.default.com/pixel-sdk-reference
 * @see https://docs.os.default.com/forms/privacy
 */
export const defaultComFormsSdk = function defaultComFormsSdk(
	options: DefaultComFormsSdkOptions
): Script {
	const category = options?.category ?? 'functionality';
	const script = resolveManifest(defaultComFormsSdkManifest, {
		category,
		scriptUrl: resolveScriptUrl(
			options?.scriptUrl,
			'https://handshake.default.com/sdk.js'
		),
	});
	const publicKey = readId(
		typeof options?.publicKey === 'string' ? options.publicKey : undefined
	);
	if (publicKey === undefined) {
		return {
			...skipMissingId('defaultComFormsSdk', 'publicKey', {
				category: script.category,
				manifest: defaultComFormsSdkManifest,
			}),
			id: 'default-com-forms-sdk',
		};
	}
	const initOptions: DefaultComFormsSdkInitOptions = {
		autoDisplayScheduler: options.autoDisplayScheduler ?? true,
		publicKey,
	};
	const endpoint = trimToUndefined(options.endpoint);
	if (endpoint !== undefined) {
		initOptions.endpoint = endpoint;
	}
	if (options.schedulerOrigins !== undefined) {
		initOptions.schedulerOrigins = options.schedulerOrigins;
	}
	const synchronize = (info: ScriptCallbackInfo): void => {
		const registration = registrationOf(info);
		if (!info.element?.isConnected) {
			if (info.element) {
				denyDetachedFormsSdk(info);
			} else {
				disposeFormsSdk(info);
			}
			return;
		}
		if (
			typeof window === 'undefined' ||
			!ownsLoader(info, 'defaultComFormsSdk') ||
			!formsElements.has(info.element) ||
			!loadedFormsElements.has(info.element) ||
			registration === undefined
		) {
			return;
		}
		const previous = sdkOwners.get(registration);
		const permitted = info.hasConsent && info.vendor?.granted !== false;
		const sdk = !permitted && previous ? previous : window.DefaultPixelSDK;
		if (!sdk) {
			return;
		}
		if (previous && previous !== sdk) {
			disposeFormsSdk(info);
		}
		let state = sdkStates.get(sdk);
		if (!state) {
			state = { registrations: new Map() };
			sdkStates.set(sdk, state);
		}
		sdkOwners.set(registration, sdk);
		state.registrations.set(registration, mapConsent(info));
		forwardSdkConsent(sdk);
		if (permitted && !sameSdkOptions(state.options, initOptions)) {
			const applied = snapshotSdkOptions(initOptions);
			sdk.init(applied);
			state.options = snapshotSdkOptions(applied);
		}
	};
	return {
		...script,
		id: 'default-com-forms-sdk',
		onBeforeLoad(info) {
			if (claimLoader(info, 'defaultComFormsSdk') && info.element) {
				formsElements.add(info.element);
			}
		},
		onConsentChange: synchronize,
		onDispose: disposeFormsSdk,
		onLoad(info) {
			if (info.element?.isConnected && formsElements.has(info.element)) {
				loadedFormsElements.add(info.element);
				synchronize(info);
			}
		},
		serverStart: undefined,
	};
};
