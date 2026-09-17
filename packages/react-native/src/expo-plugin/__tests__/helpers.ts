import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ExportedConfig, Mod } from '@expo/config-plugins';

import type { C15tPluginProps } from '../params';
import { applyParamsOnConfig } from '../with-c15t';
import type { WorkflowContext } from '../workflow';
import fixtureAppJson from './fixtures/app.json';

const thisDirectory = dirname(fileURLToPath(import.meta.url));

/** Directory holding `app.json` and the native project fixtures. */
export const FIXTURE_DIR = join(thisDirectory, 'fixtures');

/** Read a fixture from this directory's `fixtures/` folder. */
export const readFixture = function readFixture(name: string): string {
	return readFileSync(join(FIXTURE_DIR, name), 'utf8');
};

/** argv for `expo prebuild`, the command Continuous Native Generation runs. */
export const PREBUILD_ARGV = ['node', '/usr/local/bin/expo', 'prebuild'];

/** argv for `expo start`, which on a managed project means Expo Go. */
export const START_ARGV = ['node', '/usr/local/bin/expo', 'start'];

/** Environment an EAS Build worker runs with. */
export const EAS_BUILD_ENV = {
	EAS_BUILD: 'true',
	EAS_BUILD_PLATFORM: 'ios',
	EAS_BUILD_PROFILE: 'production',
};

/** The fixture `app.json`, as the object `@expo/config` hands a plugin. */
export const fixtureConfig = function fixtureConfig(): ExportedConfig {
	return structuredClone((fixtureAppJson as { expo: ExportedConfig }).expo);
};

/**
 * Apply the plugin the way a prebuild would: config in, mods registered, no
 * file written yet. Every test starts here.
 */
export const applyToFixture = function applyToFixture(
	props: C15tPluginProps | undefined,
	context: Partial<WorkflowContext> = {}
): ExportedConfig {
	return applyParamsOnConfig(fixtureConfig(), props, {
		argv: PREBUILD_ARGV,
		env: {},
		projectRoot: FIXTURE_DIR,
		...context,
	});
};

/**
 * Run one registered mod against a hand-built file contents.
 *
 * This is how Expo's own plugin tests work: `applyParamsOnConfig` only
 * registers mods, and a mod is a function from a file to a file, so the file
 * under test can come from a fixture instead of a generated project.
 */
export const runMod = async function runMod<T>(
	config: ExportedConfig,
	platform: 'android' | 'ios',
	modName: string,
	modResults: T
): Promise<ExportedConfig> {
	const mods = config.mods?.[platform] as
		| Record<string, Mod<T> | undefined>
		| undefined;
	const mod = mods?.[modName];
	if (mod === undefined) {
		throw new Error(`no ${platform}.${modName} mod was registered`);
	}

	const applied = await mod({
		...config,
		modRequest: {
			introspect: false,
			modName,
			platform,
			platformProjectRoot: join(FIXTURE_DIR, platform),
			projectRoot: FIXTURE_DIR,
		},
		modResults,
	});

	return applied;
};

/** The `Info.plist` the plugin leaves behind, from `config.ios.infoPlist`. */
export const runInfoPlist = function runInfoPlist(
	config: ExportedConfig,
	infoPlist: Record<string, unknown> = config.ios?.infoPlist ?? {}
): Promise<ExportedConfig> {
	return runMod(config, 'ios', 'infoPlist', infoPlist);
};

/** A fixture file as the gradle and source mods receive it. */
export const gradleFile = function gradleFile(
	name: string,
	language: 'groovy' | 'kt' | 'rb' = 'groovy'
) {
	return { contents: readFixture(name), language, path: name };
};
