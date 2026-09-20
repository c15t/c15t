import path from 'node:path';

import type { C15tPluginProps } from '@c15t/react-native/expo-plugin';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withPodfile } from 'expo/config-plugins';
import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * Point the generated Podfile at the consent core checked out in this repository.
 *
 * `@c15t/react-native`'s podspec depends on the `C15tCore` pod without a path, which
 * is right for a published install: CocoaPods finds the released pod in a spec repo.
 * Inside the monorepo nothing is released, so `pod install` would look for a pod that
 * is not in any repo. This adds the local path, and only here, because an app that
 * installs the package from the registry must not carry it. Set
 * `C15T_LOCAL_PODS=false` to leave the Podfile alone.
 *
 * It lives in this file rather than in `plugins/` because Expo 57 evaluates
 * `app.config.ts` by stripping its types and `require`-ing the result, which resolves
 * relative imports as CommonJS: a sibling `.ts` plugin is invisible to that loader.
 */
const withC15tLocalCorePod: ConfigPlugin = (config) =>
	withPodfile(config, (cfg) => {
		const corePath = path
			.resolve(__dirname, '..', '..', 'native', 'core-swift')
			.split(path.sep)
			.join('/');

		if (cfg.modResults.contents.includes("pod 'C15tCore'")) {
			return cfg;
		}

		const targetBlock = /^target\s+['"][^'"]+['"]\s+do\s*$/mu;

		if (!targetBlock.test(cfg.modResults.contents)) {
			throw new Error(
				'withC15tLocalCorePod: the generated Podfile has no target block to add C15tCore to.'
			);
		}

		cfg.modResults.contents = cfg.modResults.contents.replace(
			targetBlock,
			(match) => `${match}\n  pod 'C15tCore', :path => '${corePath}'`
		);

		return cfg;
	});

/**
 * Backend and key for the embedded consent core.
 *
 * Expo loads `.env` into `process.env` before it evaluates this file, so one file
 * feeds both the native configuration (here, through the config plugin) and the
 * JavaScript screens (through the `EXPO_PUBLIC_` copy, which Metro inlines). A value
 * already in the real environment wins over the file, which is how CI overrides it.
 *
 * Everything written here ends up in a public `.ipa` and `.apk`, so nothing secret may
 * appear. There is no key to configure either: a project is its backend URL.
 */
const backendURL =
	process.env.EXPO_PUBLIC_C15T_BACKEND_URL ??
	'http://localhost:3000/api/self-host';

/** Truthy spellings that mean "off"; anything else present means on. */
const isOff = (value: string | undefined): boolean =>
	['0', 'false', 'no', 'off'].includes((value ?? '').toLowerCase());

/**
 * The prompt Apple draws, compiled into the binary at prebuild.
 *
 * `trackingUsageDescription` is the plain alert and stays required. Apple shows it on
 * every older system and to every device outside the countries where it enabled the
 * expanded sheet, so the Markdown key sits beside it rather than replacing it. The
 * Markdown copy is what iOS and iPadOS 27.2 draws in its place for a device signed in
 * inside one of those countries, and Apple renders it as Markdown: bold, italics,
 * bullet lists, and paragraph breaks. No underline.
 *
 * Per-locale Markdown goes into each `<locale>.lproj/InfoPlist.strings` at prebuild,
 * keyed the way Xcode spells the tag, because `Info.plist` holds one value per key.
 * Whether the device ever runs this app in one of those locales is the app's own
 * localization list, not something this plugin decides.
 */
const trackingUsageDescription =
	'We ask to link your activity across apps and websites for one reason: to stop showing you ads you have already dismissed.';

const trackingMarkdownUsageDescription = `**We link your activity across apps and websites for one reason.**

- Fewer repeats of the ads you have already dismissed
- No name, no email, and nothing you type

You can change this in Settings at any time.`;

const trackingMarkdownUsageDescriptionLocalizations = {
	de: `**Wir verknüpfen Ihre Aktivitäten über Apps und Websites aus einem Grund.**

- Weniger Wiederholungen von Anzeigen, die Sie bereits verworfen haben
- Kein Name, keine E-Mail und nichts, was Sie eingeben

Sie können das jederzeit in den Einstellungen ändern.`,
	'fr-CA': `**Nous relions votre activité dans plusieurs applications et sites pour une seule raison.**

- Moins de répétitions des annonces que vous avez déjà ignorées
- Ni nom, ni courriel, et rien de ce que vous tapez

Vous pouvez changer cela dans Réglages à tout moment.`,
	'zh-Hans': `**我们跨应用和网站关联您的活动，只为一个原因。**

- 更少重复展示您已经忽略的广告
- 不收集姓名、电子邮件或您输入的内容

您可以随时在设置中更改。`,
};

const c15tPluginProps: C15tPluginProps = {
	backendURL,
	// The App Tracking Transparency opt-in. Consent to marketing cookies is not Apple
	// tracking authorization, so this fixture asks for both: the banner decides what
	// c15t may store, and the Apple sheet decides what the advertising identifier is
	// worth. See the tracking card on the Consent tab for the request itself.
	enableAppTrackingTransparency: true,
	// Self-hosted and hosted speak the same wire; the mode only decides where the
	// core starts looking.
	mode: backendURL.includes('c15t.com') ? 'hosted' : 'selfHosted',
	trackingMarkdownUsageDescription,
	trackingMarkdownUsageDescriptionLocalizations,
	trackingUsageDescription,
};

/**
 * A plugin list, in the spelling `app.config.ts` needs.
 *
 * `ExpoConfig['plugins']` describes the `app.json` form: strings and tuples. A
 * TypeScript config may also return a plugin function, which the runtime accepts and
 * the generated type does not name, so the list carries the wider type and meets the
 * config through one cast.
 */
type PluginEntry = ConfigPlugin | NonNullable<ExpoConfig['plugins']>[number];

const plugins: PluginEntry[] = [
	// Only while this example lives next to the core it builds against.
	...(process.env.C15T_LOCAL_PODS === 'false' ? [] : [withC15tLocalCorePod]),
	// `expo export` and `expo run:*` both count as a native-build invocation, so
	// the plugin's Expo Go guard passes on its own. There is no `skipNativeBuildCheck`
	// here on purpose: this project has no Expo Go path, and a bare `expo config` in
	// CI should keep saying so.
	['@c15t/react-native/expo-plugin', c15tPluginProps],
];

/**
 * `sort-keys` is waived on the config literal: Expo documents these fields in the
 * order below, and `name` and `slug` buried under `android` reads worse than an
 * unsorted object.
 */
/* eslint-disable eslint/sort-keys */
const c15tExpoConfig = ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: 'c15t Expo Dev',
	slug: 'c15t-expo-dev',
	version: '1.0.0',
	orientation: 'portrait',
	scheme: 'c15texpodev',
	userInterfaceStyle: 'light',
	// Native only. Leaving `web` in the default set makes `expo export` demand
	// react-native-web for a fixture that will never render in a browser.
	platforms: ['ios', 'android'],
	// No `newArchEnabled` here. Expo SDK 57 dropped the field because the New
	// Architecture is the only option, which is what @c15t/react-native needs: the
	// TurboModule has no legacy-bridge fallback.
	ios: {
		bundleIdentifier: 'com.c15t.expodev',
		supportsTablet: true,
	},
	android: {
		package: 'com.c15t.expodev',
	},
	plugins: plugins as ExpoConfig['plugins'],
	extra: {
		c15t: {
			backendURL,
			forceFakeNative: !isOff(process.env.EXPO_PUBLIC_C15T_FAKE_NATIVE),
			sampleIntervalMs:
				Number(process.env.EXPO_PUBLIC_C15T_SAMPLE_INTERVAL_MS) || 1000,
		},
	},
});

export default c15tExpoConfig;
