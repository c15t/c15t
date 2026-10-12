import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { C15tPluginError } from './errors';
import type { ResolvedC15tParams } from './params';

/**
 * Everything the workflow checks need that is not the config.
 *
 * Injectable so a test can say "this is `expo start`, no native project yet"
 * without shelling out.
 */
export interface WorkflowContext {
	/** Absolute path to the app project root. */
	readonly projectRoot: string;
	/** Process arguments, for telling `expo prebuild` from `expo start`. */
	readonly argv?: readonly string[];
	/** Process environment, for the EAS Build markers. */
	readonly env?: Readonly<Record<string, string | undefined>>;
}

/**
 * Commands that either produce a native project or consume one.
 *
 * Everything else that evaluates the config is `expo start`, and `expo start`
 * on a managed project means Expo Go.
 */
const NATIVE_COMMAND_TOKENS = new Set([
	'add',
	'build',
	'configure',
	'config',
	'config:customize',
	'doctor',
	'export',
	'export:embed',
	'install',
	'prebuild',
	'remove',
	'run',
]);

const isNativeBuildInvocation = function isNativeBuildInvocation(
	argv: readonly string[]
): boolean {
	return argv.some((token) => {
		const value = token.trim();
		return (
			NATIVE_COMMAND_TOKENS.has(value) ||
			value.startsWith('run:') ||
			value.startsWith('--dev-client')
		);
	});
};

const isEasBuild = function isEasBuild(
	env: Readonly<Record<string, string | undefined>>
): boolean {
	return Object.entries(env).some(
		([key, value]) =>
			value !== undefined &&
			value !== '' &&
			(key.startsWith('EAS_BUILD') || key.startsWith('EAS_LOCAL_BUILD'))
	);
};

const hasNativeProject = function hasNativeProject(
	projectRoot: string
): boolean {
	return (
		existsSync(join(projectRoot, 'ios')) ||
		existsSync(join(projectRoot, 'android'))
	);
};

/**
 * Refuse to configure a project that is heading for Expo Go.
 *
 * Expo Go ships a fixed set of native modules, so a project that uses this
 * plugin and still launches in Expo Go has a JavaScript bundle with no consent
 * core behind it: every read answers deny-all, the banner never appears, and the
 * failure looks like a c15t bug rather than a missing build. Catching it here
 * costs one sentence instead of a day.
 *
 * @param params - Resolved plugin parameters; `skipNativeBuildCheck` waives it.
 * @param context - Project root, argv, and environment.
 * @throws {C15tPluginError} When the only thing this config could launch into is
 * Expo Go.
 */
export const assertCustomNativeBuild = function assertCustomNativeBuild(
	params: ResolvedC15tParams,
	context: WorkflowContext
): void {
	if (params.skipNativeBuildCheck) {
		return;
	}

	const argv = context.argv ?? process.argv;
	const env = context.env ?? process.env;

	if (isEasBuild(env) || isNativeBuildInvocation(argv)) {
		return;
	}
	if (hasNativeProject(context.projectRoot)) {
		return;
	}

	throw new C15tPluginError(
		`@c15t/react-native needs a custom native build and this project has ` +
			`none, so it would launch in Expo Go with no consent core behind it. ` +
			`Create a development build with "npx expo run:ios" or ` +
			`"eas build --profile development --platform all" and open that instead. ` +
			`In CI that only evaluates the config, pass "skipNativeBuildCheck": true.`
	);
};

/** How the Android package can be registered by hand. */
const MANUAL_ANDROID_PACKAGE_PATTERN = /\bC15tReactNativePackage\b/u;

/** How the iOS target can be linked by hand. */
const MANUAL_IOS_POD_PATTERN =
	/^\s*pod\s+['"](?:C15tReactNative|@c15t\/react-native)['"]/imu;

/** How the Android module can be wired into a bare build by hand. */
const MANUAL_GRADLE_PROJECT_PATTERN =
	/project\(\s*['"]:c15t-react-native['"]\s*\)/u;

const assertNotRegisteredManually = function assertNotRegisteredManually(
	matched: boolean,
	fileLabel: string,
	fix: string
): void {
	if (!matched) {
		return;
	}
	throw new C15tPluginError(
		`${fileLabel} already registers the c15t native module by hand, and ` +
			`this plugin registers it too, which fails the build with a duplicate ` +
			`module name. Keep one: ${fix}, or remove ` +
			`"@c15t/react-native/expo-plugin" from app.json if this app owns its ` +
			`native wiring.`
	);
};

/**
 * Reject a `MainApplication` that lists the c15t package explicitly.
 *
 * Autolinking supplies the package, so a hand-written entry point list produces
 * two registrations of the same TurboModule.
 *
 * @param contents - `MainApplication.java` or `.kt` source.
 * @throws {C15tPluginError} When the package is already there.
 */
export const assertNoManualAndroidRegistration =
	function assertNoManualAndroidRegistration(contents: string): void {
		assertNotRegisteredManually(
			MANUAL_ANDROID_PACKAGE_PATTERN.test(contents),
			'MainApplication',
			'delete the C15tReactNativePackage entry from the package list'
		);
	};

/**
 * Reject a `Podfile` that pods the c15t iOS target explicitly.
 *
 * @param contents - `ios/Podfile` contents.
 * @throws {C15tPluginError} When the pod is already there.
 */
export const assertNoManualIosRegistration =
	function assertNoManualIosRegistration(contents: string): void {
		assertNotRegisteredManually(
			MANUAL_IOS_POD_PATTERN.test(contents),
			'ios/Podfile',
			'delete the pod line for C15tReactNative'
		);
	};

/**
 * Reject an app `build.gradle` that includes the c15t module by path.
 *
 * @param contents - `android/app/build.gradle` contents.
 * @throws {C15tPluginError} When the module is already included.
 */
export const assertNoManualGradleRegistration =
	function assertNoManualGradleRegistration(contents: string): void {
		assertNotRegisteredManually(
			MANUAL_GRADLE_PROJECT_PATTERN.test(contents),
			'android/app/build.gradle',
			'delete the implementation project(":c15t-react-native") line'
		);
	};
