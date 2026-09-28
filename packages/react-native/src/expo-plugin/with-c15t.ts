import {
	withAndroidManifest,
	withAppBuildGradle,
	withInfoPlist,
	withMainApplication,
	withPodfile,
	withProjectBuildGradle,
} from '@expo/config-plugins';
import type { ConfigPlugin, ExportedConfig } from '@expo/config-plugins';

import { applyAndroidManifest } from './android';
import { EXTRA_KEY } from './constants';
import { applyAppBuildGradle, applyProjectBuildGradle } from './gradle';
import { applyInfoPlist, buildPrivacyManifestDeclarations } from './ios';
import { resolveParams } from './params';
import type {
	C15tPluginProps,
	C15tProviderTransportKind,
	ResolvedC15tParams,
} from './params';
import {
	assertUpdatesCannotOutrunTheBinary,
	buildProtocolInfo,
} from './updates';
import {
	assertCustomNativeBuild,
	assertNoManualAndroidRegistration,
	assertNoManualGradleRegistration,
	assertNoManualIosRegistration,
} from './workflow';
import type { WorkflowContext } from './workflow';

/** What the plugin publishes under `extra.c15t`. */
export interface C15tExtraConfig {
	/** Transport mode in the spelling the JavaScript provider takes. */
	mode: C15tProviderTransportKind;
	/** Backend base URL, or `null` when none is embedded. */
	backendURL: string | null;
	/** Init URL override, or `null`. */
	initURL: string | null;
	/** `domain` sent on subject writes, or `null`. */
	domain: string | null;
	/** Whether the binary carries the App Tracking Transparency keys. */
	enableAppTrackingTransparency: boolean;
	/** Protocol range this bundle speaks. */
	protocol: ReturnType<typeof buildProtocolInfo>;
}

const buildExtra = function buildExtra(
	params: ResolvedC15tParams
): C15tExtraConfig {
	return {
		backendURL: params.backendURL,
		domain: params.domain,
		enableAppTrackingTransparency: params.appTrackingTransparency.enabled,
		initURL: params.initURL,
		mode: params.providerMode,
		protocol: buildProtocolInfo(),
	};
};

const resolveProjectRoot = function resolveProjectRoot(
	config: ExportedConfig
): string {
	const internal = (config as { _internal?: { projectRoot?: unknown } })
		._internal;
	return typeof internal?.projectRoot === 'string' &&
		internal.projectRoot.length > 0
		? internal.projectRoot
		: process.cwd();
};

/**
 * Merge c15t's declarations into `ios.privacyManifests`.
 *
 * A host may already declare domains for its own trackers, so the lists union
 * rather than replace.
 */
const applyPrivacyDeclarations = function applyPrivacyDeclarations(
	config: ExportedConfig,
	params: ResolvedC15tParams
): ExportedConfig {
	const declarations = buildPrivacyManifestDeclarations(params);
	const ios = config.ios ?? {};
	const existing = ios.privacyManifests ?? {};

	return {
		...config,
		ios: {
			...ios,
			privacyManifests: {
				...existing,
				NSPrivacyTracking: declarations.NSPrivacyTracking,
				NSPrivacyTrackingDomains: [
					...new Set([
						...(existing.NSPrivacyTrackingDomains ?? []),
						...declarations.NSPrivacyTrackingDomains,
					]),
				],
			},
		},
	};
};

/**
 * Apply every c15t modification to an Expo config.
 *
 * This is the whole plugin, and it is exported separately from
 * {@link withC15t} because it is the part worth testing: it resolves the
 * parameters, refuses the configurations that cannot work, publishes the values
 * JavaScript needs, and registers the mods. Each mod is then a one-line call
 * into a pure function over the file it edits.
 *
 * Nothing here runs inside the app. Every write happens at `expo prebuild`,
 * `expo run:*`, or `eas build` time, which is what makes the plugin usable with
 * Continuous Native Generation: there is no patch step and nothing to re-apply
 * after `npx expo prebuild --clean`.
 *
 * @param config - The Expo config, as `app.json` plus any `app.config.js`.
 * @param props - The parameters the host passed for this plugin.
 * @param context - Overrides for the workflow checks; tests use it to name the
 * command being run.
 * @returns A config with `extra.c15t`, the privacy declarations, and the mods.
 * @throws {C15tPluginError} When parameters are unusable, the project is heading
 * for Expo Go, the native module is registered by hand as well, or an
 * over-the-air configuration can outrun the binary.
 */
export const applyParamsOnConfig = function applyParamsOnConfig(
	config: ExportedConfig,
	props: C15tPluginProps | undefined,
	context: Partial<WorkflowContext> = {}
): ExportedConfig {
	const params = resolveParams(props);

	assertCustomNativeBuild(params, {
		argv: context.argv,
		env: context.env,
		projectRoot: context.projectRoot ?? resolveProjectRoot(config),
	});
	assertUpdatesCannotOutrunTheBinary(config);

	let next: ExportedConfig = {
		...config,
		extra: { ...config.extra, [EXTRA_KEY]: buildExtra(params) },
	};

	next = applyPrivacyDeclarations(next, params);

	next = withInfoPlist(next, (configWithPlist) => ({
		...configWithPlist,
		modResults: applyInfoPlist(params, configWithPlist.modResults),
	}));

	next = withAndroidManifest(next, (configWithManifest) => ({
		...configWithManifest,
		modResults: applyAndroidManifest(params, configWithManifest.modResults),
	}));

	next = withProjectBuildGradle(next, (configWithGradle) => ({
		...configWithGradle,
		modResults: applyProjectBuildGradle(configWithGradle.modResults),
	}));

	next = withAppBuildGradle(next, (configWithGradle) => {
		assertNoManualGradleRegistration(configWithGradle.modResults.contents);
		return {
			...configWithGradle,
			modResults: applyAppBuildGradle(configWithGradle.modResults),
		};
	});

	next = withMainApplication(next, (configWithApplication) => {
		assertNoManualAndroidRegistration(
			configWithApplication.modResults.contents
		);
		return configWithApplication;
	});

	next = withPodfile(next, (configWithPodfile) => {
		assertNoManualIosRegistration(configWithPodfile.modResults.contents);
		return configWithPodfile;
	});

	return next;
};

/**
 * Configure the native c15t core for an Expo app.
 *
 * Use it directly when composing configs by hand; the package default export
 * wraps this in `createRunOncePlugin` so a project that also pulls the plugin in
 * through another plugin does not apply it twice.
 */
export const withC15t: ConfigPlugin<C15tPluginProps> = function withC15t(
	config,
	props
) {
	return applyParamsOnConfig(config, props);
};
