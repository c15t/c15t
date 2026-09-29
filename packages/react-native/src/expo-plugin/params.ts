import {
	CONSENT_CATEGORY_IDS,
	LOCALE_TAG_PATTERN,
	SK_AD_NETWORK_IDENTIFIER_PATTERN,
} from './constants';
import type { C15tConsentCategoryId } from './constants';
import { C15tPluginError } from './errors';

/**
 * Transport the embedded core should run.
 *
 * The iOS bridge names four modes and the JavaScript provider accepts three
 * (`ProviderTransportKind` in `@c15t/core`); Android names none, because it
 * infers all of them from which keys are present. This is the host-facing
 * spelling, and the two maps below translate it per platform.
 */
export const TRANSPORT_MODES = [
	'custom',
	'hosted',
	'offline',
	'selfHosted',
] as const;

/** Transport the embedded core should run. */
export type C15tTransportMode = (typeof TRANSPORT_MODES)[number];

/** Transport kind `@c15t/core`'s provider factories report. */
export type C15tProviderTransportKind = 'custom' | 'hosted' | 'offline';

/**
 * One locale's Markdown prompt copy, ready to write into a string table.
 *
 * `locale` doubles as the `.lproj` bundle's name, which is why
 * {@link LOCALE_TAG_PATTERN} gates it in `resolveParams`.
 */
export interface C15tTrackingMarkdownLocalization {
	/** Locale tag as Xcode spells it, for example `fr-CA`. */
	readonly locale: string;
	/** Markdown prompt copy, trimmed. */
	readonly value: string;
}

/**
 * `com.c15t.backend.mode` values, per mode.
 *
 * `custom` becomes the iOS bridge's `none`: no transport at all, so an async
 * command from a frame the host has not installed over is a no-op rather than a
 * write that looks delivered.
 */
export const IOS_TRANSPORT_MODE: Record<C15tTransportMode, string> = {
	custom: 'none',
	hosted: 'hosted',
	offline: 'offline',
	selfHosted: 'selfHosted',
};

/**
 * What JavaScript is told the mode is.
 *
 * A self-hosted `@c15t/backend` speaks the hosted wire, so the provider wants
 * `hosted()`. Reporting `selfHosted` would leave a host looking for a provider
 * factory that does not exist.
 */
export const PROVIDER_TRANSPORT_MODE: Record<
	C15tTransportMode,
	C15tProviderTransportKind
> = {
	custom: 'custom',
	hosted: 'hosted',
	offline: 'offline',
	selfHosted: 'hosted',
};

/**
 * Parameters accepted by `@c15t/react-native/expo-plugin` in `app.json`.
 *
 * Everything here is published inside the app binary, so nothing here may be a
 * secret. There is no credential parameter: the embedded cores identify a
 * project by backend URL and send no key, so nothing here has anywhere to put
 * one. See `native/CONTRACT.md`.
 */
export interface C15tPluginProps {
	/**
	 * c15t backend base URL, without a trailing slash.
	 *
	 * Required for every mode except `offline`. A path is allowed, so a
	 * deployment fronted by a same-origin route works unchanged.
	 */
	backendURL?: string;
	/**
	 * URL used for `GET /init`, for a proxied init route.
	 *
	 * Defaults to `${backendURL}/init`. Set it when init resolves from a
	 * same-origin route while consent saves still go to `backendURL`, which is
	 * what `initURL` does in `@c15t/core`. Both embedded cores honour it.
	 */
	initURL?: string;
	/** Value sent as the `domain` field of `POST /subjects`. */
	domain?: string;
	/**
	 * The consent categories this app offers, the mobile spelling of the
	 * `consentCategories` a web host passes to its provider.
	 *
	 * The declaration only narrows the optional half of the resolved policy
	 * scope: a surface lists `necessary` plus the scope the policy governs that
	 * this list also names, so the same backend and the same declaration render
	 * the same rows on web and mobile. Omit it to offer the full policy scope.
	 */
	consentCategories?: readonly C15tConsentCategoryId[];
	/**
	 * The IAB vendor ids this app may disclose, the mobile spelling of the
	 * `iab.vendors` array a web host passes to its provider.
	 *
	 * The declaration narrows the vendor drawer only: the vendor list this app
	 * is served keeps the purposes, features, stacks, and both version numbers
	 * the policy was graded against, so a scoped app can still explain what
	 * purpose 7 means. Omit it to disclose every vendor the backend serves.
	 */
	vendors?: readonly number[];
	/**
	 * Transport mode.
	 *
	 * `hosted` starts the core from the embedded config. `selfHosted` is the
	 * same wire against a `@c15t/backend` the host runs itself. `offline` embeds
	 * no backend, which makes every command local-only. `custom` leaves the core
	 * unstarted so the host can install its own transport.
	 *
	 * @defaultValue 'hosted'
	 */
	mode?: C15tTransportMode;
	/**
	 * Write the App Tracking Transparency usage description and SKAdNetwork
	 * items.
	 *
	 * Opt-in and never implied: consent to marketing cookies is not Apple
	 * tracking authorization, and a binary that asks for ATT without needing it
	 * is an App Review problem.
	 *
	 * @defaultValue false
	 */
	enableAppTrackingTransparency?: boolean;
	/**
	 * Value for `NSUserTrackingUsageDescription`, the prompt the user sees.
	 *
	 * Required when ATT is enabled. Apple rejects a generic string, so the
	 * plugin will not invent one.
	 */
	trackingUsageDescription?: string;
	/**
	 * Value for `NSUserTrackingMarkdownUsageDescription`, the expanded European
	 * Union prompt Apple shows in place of the plain one.
	 *
	 * Apple renders it as Markdown: bold, italics, bullet lists, and paragraph
	 * breaks, but no underline. It is optional, and Apple's own region gate picks
	 * who sees it: iOS and iPadOS 27.2 or later, with the device and the signed-in
	 * Apple Account both inside one of the countries Apple enabled it for.
	 * Everywhere else, and on every older system, Apple shows
	 * {@link trackingUsageDescription} instead, which is why the plain key stays
	 * written whenever the App Tracking Transparency opt-in is on. This parameter
	 * never replaces it.
	 *
	 * The copy belongs to a sheet Apple draws: it is compiled into the app binary,
	 * no c15t surface reads it back, and c15t cannot decide when it appears. What
	 * c15t does control is the in-app preference centre, whose copy and styling are
	 * plain text and stay the host's to write.
	 *
	 * A blank value is refused rather than written. Apple answers an empty
	 * `NSUserTrackingMarkdownUsageDescription` with the plain description, so a
	 * blank one builds a binary whose author meant to localize the prompt and did
	 * not.
	 */
	trackingMarkdownUsageDescription?: string;
	/**
	 * Per-locale values for {@link trackingMarkdownUsageDescription}.
	 *
	 * iOS localizes a prompt string through `InfoPlist.strings` inside each
	 * `<locale>.lproj` bundle, because `Info.plist` holds one value per key, so
	 * these go into the bundle rather than into the plist per locale. Each key is a
	 * locale tag as Xcode spells it (`de`, `fr-CA`, `zh-Hans`), and each value is
	 * Markdown in the same grammar as the base string.
	 *
	 * A bundle that already declares the key keeps the host's entry, and every
	 * other entry in the same file is left alone. The base value stays optional:
	 * a locale not named here gets the app's own localization of the key, and with
	 * no base value that is {@link trackingUsageDescription}.
	 */
	trackingMarkdownUsageDescriptionLocalizations?: Readonly<
		Record<string, string>
	>;
	/**
	 * SKAdNetwork identifiers to register, written only when ATT is enabled.
	 *
	 * Each must look like `cstr6suwn9.skadnetwork`.
	 */
	skAdNetworkIdentifiers?: readonly string[];
	/**
	 * Domains to declare in `NSPrivacyTrackingDomains`.
	 *
	 * Defaults to the backend host when ATT is enabled. Accepted only with ATT
	 * enabled, because a tracking domain without a tracking prompt is a
	 * declaration the plugin cannot justify on the host's behalf.
	 */
	privacyTrackingDomains?: readonly string[];
	/**
	 * Force the Global Privacy Control signal on for a staged build.
	 *
	 * @defaultValue false
	 */
	forceGPC?: boolean;
	/**
	 * Let the embedded core start itself at launch.
	 *
	 * Set `false` when the host calls into the core itself. Defaults to `false`
	 * for `mode: 'custom'`, where leaving it on would race the host.
	 *
	 * @defaultValue true
	 */
	autoBootstrap?: boolean;
	/**
	 * Skip the check that the project is building a custom native client.
	 *
	 * For a build harness that drives `expo start` in a container without ever
	 * opening Expo Go.
	 *
	 * @defaultValue false
	 */
	skipNativeBuildCheck?: boolean;
}

/** Validated parameters, with defaults applied. */
export interface ResolvedC15tParams {
	/** Transport the embedded core should run. */
	readonly mode: C15tTransportMode;
	/** {@link mode} as the JavaScript provider spells it. */
	readonly providerMode: C15tProviderTransportKind;
	/** Normalised backend base URL, or `null` when no backend is embedded. */
	readonly backendURL: string | null;
	/** Hostname of {@link backendURL}, used for the iOS privacy manifest. */
	readonly backendHost: string | null;
	/** Normalised init URL override, or `null`. */
	readonly initURL: string | null;
	/** `domain` sent on subject writes, or `null` to let the core derive it. */
	readonly domain: string | null;
	/**
	 * Category ids the app declares, de-duplicated; empty means no declaration.
	 *
	 * Written as the `com.c15t.categories` plist array and the comma-separated
	 * `com.c15t.CATEGORIES` meta-data. Absent keys are the full-scope answer,
	 * so the empty list is written nowhere rather than as an empty value.
	 */
	readonly consentCategories: readonly C15tConsentCategoryId[];
	/**
	 * Vendor ids the app declares, de-duplicated; empty means no declaration.
	 *
	 * Written as the `com.c15t.vendors` plist string and the comma-separated
	 * `com.c15t.VENDORS` meta-data. Absent keys are the full-disclosure answer,
	 * so the empty list is written nowhere rather than as an empty value. Both
	 * embedded cores also prune whatever they are served down to this list, so a
	 * backend that ignores the declaration still cannot widen the drawer.
	 */
	readonly vendors: readonly number[];
	/** App Tracking Transparency opt-in, resolved. */
	readonly appTrackingTransparency: {
		readonly enabled: boolean;
		/**
		 * Base `NSUserTrackingMarkdownUsageDescription`, or `null` to let Apple fall
		 * back to {@link usageDescription}.
		 */
		readonly markdownUsageDescription: string | null;
		/**
		 * Per-locale Markdown prompt copy, in the order the host wrote it.
		 *
		 * Written into each `<locale>.lproj/InfoPlist.strings`, never into the plist.
		 */
		readonly markdownUsageDescriptionLocalizations: readonly C15tTrackingMarkdownLocalization[];
		readonly usageDescription: string | null;
		readonly skAdNetworkIdentifiers: readonly string[];
	};
	/** Domains for `NSPrivacyTrackingDomains`; empty unless ATT is enabled. */
	readonly privacyTrackingDomains: readonly string[];
	/** Whether GPC is forced on for this build. */
	readonly forceGPC: boolean;
	/** Whether the embedded core starts itself at launch. */
	readonly autoBootstrap: boolean;
	/** Whether the custom-native-build check is waived. */
	readonly skipNativeBuildCheck: boolean;
}

const USAGE =
	'configure it in app.json as ' +
	`{ "plugins": [["@c15t/react-native/expo-plugin", { "backendURL": "https://consent.example.com" }]] }`;

const isLoopbackHost = function isLoopbackHost(hostname: string): boolean {
	return (
		hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
	);
};

/**
 * Parse a URL prop into a `URL`, rejecting the shapes that cannot work.
 *
 * Credentials, a query, and a hash are all wrong here: the value lands in a
 * public binary and is read by the core as a base to append paths to.
 */
const parseURL = function parseURL(value: string): URL | null {
	let parsed: URL;
	try {
		parsed = new URL(value.trim());
	} catch {
		return null;
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		return null;
	}
	if (parsed.protocol === 'http:' && !isLoopbackHost(parsed.hostname)) {
		return null;
	}
	if (parsed.username !== '' || parsed.password !== '') {
		return null;
	}
	if (parsed.search !== '' || parsed.hash !== '') {
		return null;
	}
	return parsed;
};

/** Normalise a URL prop, or throw with the shape that was expected. */
const normalizeURL = function normalizeURL(
	value: string,
	label: string
): { readonly href: string; readonly hostname: string } {
	const parsed = parseURL(value);
	if (parsed === null) {
		throw new C15tPluginError(
			`${label} must be an https URL without credentials, a query, or a ` +
				`hash, or plain http on a loopback host. Got ${JSON.stringify(value)}. ` +
				`${USAGE}`
		);
	}
	const trimmed = value.trim().replace(/\/+$/u, '');
	return { hostname: parsed.hostname, href: trimmed };
};

const normalizeMode = function normalizeMode(
	mode: C15tTransportMode | undefined
): C15tTransportMode {
	if (mode === undefined) {
		return 'hosted';
	}
	if (!TRANSPORT_MODES.includes(mode)) {
		throw new C15tPluginError(
			`mode must be one of ${TRANSPORT_MODES.join(', ')}; got ` +
				`${JSON.stringify(mode)}.`
		);
	}
	return mode;
};

const normalizeOptionalText = function normalizeOptionalText(
	value: string | undefined,
	label: string
): string | null {
	if (value === undefined) {
		return null;
	}
	const trimmed = value.trim();
	if (trimmed === '' || /\s/u.test(trimmed)) {
		throw new C15tPluginError(`${label} must be a single non-empty token.`);
	}
	return trimmed;
};

const normalizeTrackingDomain = function normalizeTrackingDomain(
	value: string
): string {
	const trimmed = value.trim();
	if (
		trimmed === '' ||
		/\s/u.test(trimmed) ||
		trimmed.includes('://') ||
		trimmed.includes('/') ||
		trimmed.includes(':')
	) {
		throw new C15tPluginError(
			`privacyTrackingDomains entries must be bare hostnames such as ` +
				`"ads.example.com"; got ${JSON.stringify(value)}.`
		);
	}
	return trimmed.toLowerCase();
};

const normalizeConsentCategories = function normalizeConsentCategories(
	categories: readonly string[] | undefined
): C15tConsentCategoryId[] {
	if (categories === undefined) {
		return [];
	}
	if (categories.length === 0) {
		// An empty list means "no declaration" to both cores, which is the full
		// policy scope: the opposite of what a host typing `[]` looks like it
		// means. Omitting the parameter says the full-scope thing honestly.
		throw new C15tPluginError(
			'consentCategories must name at least one category. Omit it ' +
				'entirely to offer the full policy scope.'
		);
	}
	const trimmed = categories.map((category) => category.trim());
	const unknown = [
		...new Set(
			trimmed.filter(
				(category) =>
					!(CONSENT_CATEGORY_IDS as readonly string[]).includes(category)
			)
		),
	];
	if (unknown.length > 0) {
		// Both cores drop an unknown name rather than trusting it, so writing it
		// would ship a declaration whose rows quietly differ from the list the
		// host typed. Refuse it while someone is still reading app.json.
		throw new C15tPluginError(
			`consentCategories accepts only ` +
				`${CONSENT_CATEGORY_IDS.join(', ')}; unknown: ` +
				`${unknown.map((name) => JSON.stringify(name)).join(', ')}.`
		);
	}
	return [...new Set(trimmed)] as C15tConsentCategoryId[];
};

/**
 * Validate and de-duplicate a declared vendor scope.
 *
 * Ids are positive integers because that is what the IAB publishes and what both
 * cores parse; an entry that is not one is dropped by the readers rather than
 * trusted, so the plugin refuses it here instead of shipping a declaration whose
 * drawer quietly differs from the list someone typed into `app.json`.
 *
 * An id the served vendor list does not carry costs nothing: pruning a document
 * never adds an entry to satisfy a scope, so a custom or out-of-range id is
 * simply an id nobody is ever shown.
 */
const normalizeVendors = function normalizeVendors(
	vendors: readonly number[] | undefined
): number[] {
	if (vendors === undefined) {
		return [];
	}
	if (vendors.length === 0) {
		// An empty list means "no declaration" to both cores, which is every
		// vendor the backend serves: the opposite of what a host typing `[]`
		// looks like it means. Omitting the parameter says that honestly.
		throw new C15tPluginError(
			'vendors must name at least one vendor id. Omit it entirely to ' +
				'disclose every vendor the backend serves.'
		);
	}
	const invalid = [
		...new Set(
			vendors.filter(
				(vendor) =>
					!Number.isInteger(vendor) || !Number.isFinite(vendor) || vendor <= 0
			)
		),
	];
	if (invalid.length > 0) {
		throw new C15tPluginError(
			`vendors accepts positive integer IAB vendor ids; invalid: ` +
				`${invalid.map((vendor) => JSON.stringify(vendor)).join(', ')}.`
		);
	}
	return [...new Set(vendors)];
};

/**
 * Trim a Markdown prompt value, refusing one that carries no copy.
 *
 * Blank is not a default here. Apple answers an empty
 * `NSUserTrackingMarkdownUsageDescription` with the plain description, so a value
 * that trims to nothing builds a binary whose author meant to change the expanded
 * prompt and changed nothing.
 */
const normalizeMarkdownUsageDescription =
	function normalizeMarkdownUsageDescription(
		value: string | undefined,
		label: string
	): string {
		const trimmed = typeof value === 'string' ? value.trim() : '';
		if (trimmed === '') {
			throw new C15tPluginError(
				`${label} is blank. Apple shows ` +
					`NSUserTrackingUsageDescription whenever the Markdown key carries ` +
					`no copy, so an empty one ships a binary that looks like it has an ` +
					`expanded prompt and does not. Write the Markdown prompt, or omit ` +
					`${label} to ship the plain one alone.`
			);
		}
		return trimmed;
	};

/**
 * Validate the per-locale Markdown prompt map.
 *
 * A locale tag is not only a label: it names the `<locale>.lproj` bundle the
 * string is written into, so a tag with a path separator in it would put a file
 * somewhere no build ever reads. That check is here for the same reason the
 * SKAdNetwork shape check is, to catch a paste error at prebuild rather than ship
 * a localization that silently does nothing.
 *
 * An empty value is refused for the reason the base string is, and de-duplication
 * runs on the trimmed tag so two spellings of one locale cannot both reach a
 * bundle.
 */
const normalizeMarkdownLocalizations = function normalizeMarkdownLocalizations(
	localizations: Readonly<Record<string, string>> | undefined
): C15tTrackingMarkdownLocalization[] {
	if (localizations === undefined) {
		return [];
	}

	const entries = Object.entries(localizations);
	if (entries.length === 0) {
		throw new C15tPluginError(
			'trackingMarkdownUsageDescriptionLocalizations is empty. Omit it ' +
				'entirely to ship the base prompt in the app default language.'
		);
	}

	const invalidLocales = [
		...new Set(
			entries
				.map(([locale]) => locale.trim())
				.filter((locale) => !LOCALE_TAG_PATTERN.test(locale))
		),
	];
	if (invalidLocales.length > 0) {
		throw new C15tPluginError(
			`trackingMarkdownUsageDescriptionLocalizations keys must be locale ` +
				`tags Xcode writes a bundle for, such as "de", "fr-CA", or ` +
				`"zh-Hans", because each one names the .lproj folder the string is ` +
				`written into; invalid: ` +
				`${invalidLocales.map((locale) => JSON.stringify(locale)).join(', ')}.`
		);
	}

	const blankLocales = [
		...new Set(
			entries
				.filter(([, value]) => typeof value !== 'string' || value.trim() === '')
				.map(([locale]) => locale.trim())
		),
	];
	if (blankLocales.length > 0) {
		throw new C15tPluginError(
			`trackingMarkdownUsageDescriptionLocalizations has no copy for ` +
				`${blankLocales.join(', ')}. An empty value is not a localization, ` +
				`and Apple answers one with the plain description, which is the ` +
				`copy these locales were meant to replace. Fill them in, or drop ` +
				`those keys.`
		);
	}

	const byLocale = new Map<string, string>();
	for (const [locale, value] of entries) {
		const trimmed = typeof value === 'string' ? value.trim() : '';
		if (trimmed !== '') {
			byLocale.set(locale.trim(), trimmed);
		}
	}

	return [...byLocale].map(([locale, value]) => ({ locale, value }));
};

const resolveAppTrackingTransparency = function resolveAppTrackingTransparency(
	props: C15tPluginProps
): ResolvedC15tParams['appTrackingTransparency'] {
	const enabled = props.enableAppTrackingTransparency ?? false;

	// Asked before anything is validated, because "opt-in off, but here is
	// Markdown copy" has no good write to fall back to: the string would be
	// compiled into the binary and no sheet would ever draw it.
	const markdownProps = [
		props.trackingMarkdownUsageDescription === undefined
			? null
			: 'trackingMarkdownUsageDescription',
		props.trackingMarkdownUsageDescriptionLocalizations === undefined
			? null
			: 'trackingMarkdownUsageDescriptionLocalizations',
	].filter((name): name is string => name !== null);

	if (!enabled && markdownProps.length > 0) {
		throw new C15tPluginError(
			`enableAppTrackingTransparency is off, which leaves ` +
				`${markdownProps.join(' and ')} describing a prompt that cannot ` +
				`appear: only the expanded European Union ATT prompt reads ` +
				`NSUserTrackingMarkdownUsageDescription. Turn on App Tracking ` +
				`Transparency, or remove the Markdown description.`
		);
	}

	const markdownUsageDescription =
		props.trackingMarkdownUsageDescription === undefined
			? null
			: normalizeMarkdownUsageDescription(
					props.trackingMarkdownUsageDescription,
					'trackingMarkdownUsageDescription'
				);
	const markdownUsageDescriptionLocalizations = normalizeMarkdownLocalizations(
		props.trackingMarkdownUsageDescriptionLocalizations
	);

	if (!enabled) {
		return {
			enabled: false,
			markdownUsageDescription: null,
			markdownUsageDescriptionLocalizations: [],
			skAdNetworkIdentifiers: [],
			usageDescription: null,
		};
	}

	const usageDescription = props.trackingUsageDescription?.trim();
	if (!usageDescription) {
		throw new C15tPluginError(
			'enableAppTrackingTransparency needs trackingUsageDescription: the ' +
				'string the permission prompt shows. App Review rejects a generic ' +
				'one, so this plugin will not write a placeholder.'
		);
	}

	const identifiers = props.skAdNetworkIdentifiers ?? [];
	const invalid = identifiers.filter(
		(identifier) => !SK_AD_NETWORK_IDENTIFIER_PATTERN.test(identifier.trim())
	);
	if (invalid.length > 0) {
		throw new C15tPluginError(
			`skAdNetworkIdentifiers must look like "cstr6suwn9.skadnetwork"; ` +
				`invalid: ${invalid.map((value) => JSON.stringify(value)).join(', ')}.`
		);
	}

	return {
		enabled: true,
		markdownUsageDescription,
		markdownUsageDescriptionLocalizations,
		skAdNetworkIdentifiers: [
			...new Set(identifiers.map((identifier) => identifier.trim())),
		],
		usageDescription,
	};
};

/**
 * Resolve, validate, and default the plugin props.
 *
 * @param props - The value the host put in `app.json` for this plugin.
 * @returns Values ready to write into the native projects.
 * @throws {C15tPluginError} When a value cannot be embedded safely.
 */
export const resolveParams = function resolveParams(
	props: C15tPluginProps | undefined
): ResolvedC15tParams {
	if (props === undefined || props === null) {
		throw new C15tPluginError(`no parameters were passed; ${USAGE}`);
	}

	const mode = normalizeMode(props.mode);

	let backendURL: string | null = null;
	let backendHost: string | null = null;
	if (props.backendURL !== undefined) {
		const parsed = normalizeURL(props.backendURL, 'backendURL');
		backendURL = parsed.href;
		backendHost = parsed.hostname;
	} else if (mode !== 'offline') {
		throw new C15tPluginError(
			`backendURL is required for mode ${JSON.stringify(mode)}. ${USAGE}`
		);
	}

	const initURL =
		props.initURL === undefined
			? null
			: normalizeURL(props.initURL, 'initURL').href;

	const att = resolveAppTrackingTransparency(props);

	let privacyTrackingDomains: string[] = [];
	if (props.privacyTrackingDomains !== undefined) {
		if (!att.enabled) {
			throw new C15tPluginError(
				'privacyTrackingDomains was set without ' +
					'enableAppTrackingTransparency. Declaring a tracking domain ' +
					'without a tracking prompt is a claim this plugin will not make ' +
					'for you: enable ATT here, or declare the domains yourself under ' +
					'ios.privacyManifests in app.json.'
			);
		}
		privacyTrackingDomains = [
			...new Set(props.privacyTrackingDomains.map(normalizeTrackingDomain)),
		];
	} else if (att.enabled && backendHost !== null) {
		privacyTrackingDomains = [backendHost];
	}

	if (att.enabled && backendHost !== null) {
		if (!privacyTrackingDomains.includes(backendHost)) {
			throw new C15tPluginError(
				`privacyTrackingDomains must list ${backendHost}, the host of ` +
					`backendURL. Consent records and the c15t subject id are sent ` +
					`there, so Apple expects it declared whenever the app tracks. ` +
					`Got ${privacyTrackingDomains.join(', ') || '(none)'}.`
			);
		}
	}

	return {
		appTrackingTransparency: att,
		autoBootstrap: props.autoBootstrap ?? mode !== 'custom',
		backendHost,
		backendURL,
		consentCategories: normalizeConsentCategories(props.consentCategories),
		domain: normalizeOptionalText(props.domain, 'domain'),
		forceGPC: props.forceGPC ?? false,
		initURL,
		mode,
		privacyTrackingDomains,
		providerMode: PROVIDER_TRANSPORT_MODE[mode],
		skipNativeBuildCheck: props.skipNativeBuildCheck ?? false,
		vendors: normalizeVendors(props.vendors),
	};
};
