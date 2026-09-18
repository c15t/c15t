/**
 * Fixed names and floors the plugin writes into the native projects.
 *
 * These two tables are the whole surface between the plugin and the embedded
 * cores, so they are transcribed from the readers rather than invented:
 * `C15tBridgeConfiguration.InfoPlistKey` in `ios/C15tReactNative/Bridge/`
 * for iOS, and `C15tAndroid` plus `C15tReactNativeBootstrap` on Android. The
 * platforms spell the same idea differently because the readers already did,
 * and a plugin that "cleaned that up" would write keys nothing reads.
 *
 * Every entry here must have a named reader on its platform, and
 * `__tests__/native-key-readers.test.ts` fails the build when one does not.
 * A key in an `Info.plist` or an `AndroidManifest.xml` looks like configuration
 * to everyone who reads the build, and a value no code reads is a wrong
 * promise rather than a spare knob, so neither table keeps one "for later".
 */

/** Android `<meta-data>` names the plugin writes, in full. */
export const ANDROID_META = {
	/** Present only when the host bootstraps the core itself. */
	autoBootstrap: 'com.c15t.reactnative.AUTO_BOOTSTRAP',
	/** Comma-separated category ids the app offers, read by `C15tAndroid`. */
	categories: 'com.c15t.CATEGORIES',
	/** Value sent as the `domain` field of `POST /subjects`. */
	domain: 'com.c15t.DOMAIN',
	/** Staged-build switch that forces GPC on. */
	forceGpc: 'com.c15t.FORCE_GPC',
	/** Overrides `${portalUrl}/init` for a proxied init route. */
	initUrl: 'com.c15t.INIT_URL',
	/** c15t backend base URL, the value the core calls `portalUrl`. */
	portalUrl: 'com.c15t.PORTAL_URL',
} as const;

/** iOS `Info.plist` keys, matching `C15tBridgeConfiguration.InfoPlistKey`. */
export const IOS_PLIST_KEY = {
	/** Present only when the host bootstraps the core itself. */
	autoBootstrap: 'com.c15t.reactnative.AutoBootstrap',
	/** Hosted project URL or self-hosted base URL. */
	backendURL: 'com.c15t.backend.url',
	/** Category id array the app offers, read by the iOS bridge. */
	categories: 'com.c15t.categories',
	/** Value sent as the `domain` field of `POST /subjects`. */
	domain: 'com.c15t.backend.domain',
	/** Staged-build switch that forces GPC on, as a real Boolean. */
	gpc: 'com.c15t.gpc',
	/** Overrides `${backendURL}/init`, for a proxied init route. */
	initURL: 'com.c15t.backend.initUrl',
	/** One of the iOS bridge's own `TransportMode` raw values. */
	transportMode: 'com.c15t.backend.mode',
} as const;

/** androidx.startup provider the app manifest declares. */
export const ANDROID_STARTUP_PROVIDER =
	'androidx.startup.InitializationProvider';

/** Authority suffix androidx.startup requires on its provider. */
export const ANDROID_STARTUP_AUTHORITY_SUFFIX = '.androidx-startup';

/** The literal every androidx.startup `<meta-data>` value must carry. */
export const ANDROID_STARTUP_META_VALUE = 'androidx.startup';

/**
 * The initializer that starts c15t before the first Activity exists.
 *
 * The bridge registers it, so the core is hydrated before the first JavaScript
 * frame. The plain Android library ships an equivalent one and either winning
 * is correct, because `C15t.bootstrap` ignores a second call.
 */
export const ANDROID_INITIALIZER =
	'com.c15t.reactnative.C15tReactNativeInitializer';

/** Consent writes are network writes, so the app needs this permission. */
export const ANDROID_INTERNET_PERMISSION = 'android.permission.INTERNET';

/**
 * `minSdk` the shipped AARs compile against.
 *
 * From `native/core-android/gradle/libs.versions.toml`. An app below this
 * fails in the manifest merger with a message that names neither c15t nor this
 * number, so the plugin raises it instead.
 */
export const MIN_ANDROID_MIN_SDK = 24;

/** `compileSdk` the shipped AARs compile against, same source as above. */
export const MIN_ANDROID_COMPILE_SDK = 36;

/** Key under `extra` that carries the same values to JavaScript. */
export const EXTRA_KEY = 'c15t';

/** Name recorded in the plugin history so the plugin never runs twice. */
export const PLUGIN_NAME = '@c15t/react-native/expo-plugin';

/**
 * Category ids a host may declare, the same list the web provider accepts as
 * `consentCategories`.
 *
 * Transcribed the way the key tables above are: from `ConsentCategory` in both
 * native cores and `CONSENT_CATEGORIES` in the package's own protocol
 * vocabulary. The cores drop a name outside this list rather than trusting it,
 * so the plugin refuses it at prebuild instead of shipping a declaration that
 * silently narrows to fewer rows than the host typed.
 */
export const CONSENT_CATEGORY_IDS = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;

/** One declared consent category id. */
export type C15tConsentCategoryId = (typeof CONSENT_CATEGORY_IDS)[number];

/**
 * Shape Apple accepts for an SKAdNetwork identifier.
 *
 * Apple's prose says 11 characters and its published partner list carries both
 * 10 and 11 (`cstr6suwn9.skadnetwork` and `l9udre998ab.skadnetwork`), so the
 * check accepts either. It is here to catch a host pasting a URL or an app id,
 * not to out-rule Apple's registry.
 */
export const SK_AD_NETWORK_IDENTIFIER_PATTERN =
	/^[a-z0-9]{10,11}\.skadnetwork$/iu;
