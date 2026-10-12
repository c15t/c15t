import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import withC15tOnce from '../index';
import { applyParamsOnConfig } from '../with-c15t';
import {
	EAS_BUILD_ENV,
	FIXTURE_DIR,
	PREBUILD_ARGV,
	START_ARGV,
	applyToFixture,
	fixtureConfig,
	gradleFile,
	runMod,
} from './helpers';

const PROPS = { backendURL: 'https://consent.example.com' };

const CLEAN_MAIN_APPLICATION = `package com.example.consentdemo

import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultComponents
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.loadReactHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.react.ReactNativeHost

class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost get() = loadReactHost(this) {
    // Packages that cannot be autolinked yet can be added manually here, for example:
    // add(MyReactNativePackage())
  }
}
`;

const MANUAL_MAIN_APPLICATION = CLEAN_MAIN_APPLICATION.replace(
	'// add(MyReactNativePackage())',
	'add(C15tReactNativePackage())'
);

const CLEAN_PODFILE = `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")

platform :ios, min_ios_version_supported
prepare_react_native_project!

target 'ConsentDemo' do
  use_expo_modules!
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
`;

let emptyProjectRoot = '';
let generatedProjectRoot = '';

beforeAll(() => {
	emptyProjectRoot = mkdtempSync(join(tmpdir(), 'c15t-expo-bare-'));
	generatedProjectRoot = mkdtempSync(join(tmpdir(), 'c15t-expo-cng-'));
	mkdirSync(join(generatedProjectRoot, 'ios'));
	mkdirSync(join(generatedProjectRoot, 'android'));
});

afterAll(() => {
	rmSync(emptyProjectRoot, { force: true, recursive: true });
	rmSync(generatedProjectRoot, { force: true, recursive: true });
});

describe('Expo Go', () => {
	it('refuses a project whose only launch target is Expo Go', () => {
		expect(() =>
			applyParamsOnConfig(fixtureConfig(), PROPS, {
				argv: START_ARGV,
				env: {},
				projectRoot: emptyProjectRoot,
			})
		).toThrowError(/needs a custom native build[\s\S]*Expo Go/u);
	});

	// Every one of these is a way to be building a real binary, which is all the
	// check needs to see before it stays out of the way.
	it.each([
		['prebuild', { argv: PREBUILD_ARGV, env: {} }],
		['eas build', { argv: ['node', 'eas', 'build'], env: EAS_BUILD_ENV }],
		['expo run:ios', { argv: ['node', 'expo', 'run:ios'], env: {} }],
	])('stays quiet during %s', (_label, context) => {
		expect(() =>
			applyParamsOnConfig(fixtureConfig(), PROPS, {
				...context,
				projectRoot: emptyProjectRoot,
			})
		).not.toThrowError();
	});

	it('stays quiet once Continuous Native Generation has written the projects', () => {
		expect(() =>
			applyParamsOnConfig(fixtureConfig(), PROPS, {
				argv: START_ARGV,
				env: {},
				projectRoot: generatedProjectRoot,
			})
		).not.toThrowError();
	});

	it('accepts a waiver for a harness that only evaluates the config', () => {
		expect(() =>
			applyToFixture(
				{ ...PROPS, skipNativeBuildCheck: true },
				{ argv: START_ARGV, env: {}, projectRoot: emptyProjectRoot }
			)
		).not.toThrowError();
	});

	it('reads the project root from the config when the caller gives none', () => {
		expect(() =>
			applyParamsOnConfig(
				{ ...fixtureConfig(), _internal: { projectRoot: emptyProjectRoot } },
				PROPS,
				{ argv: START_ARGV, env: {} }
			)
		).toThrowError(/custom native build/u);
	});
});

describe('a bare workflow that already wired the module', () => {
	it('rejects a MainApplication that lists the package', async () => {
		await expect(
			runMod(applyToFixture(PROPS), 'android', 'mainApplication', {
				contents: MANUAL_MAIN_APPLICATION,
				language: 'kt',
				path: 'android/app/src/main/java/com/example/consentdemo/MainApplication.kt',
			})
		).rejects.toThrowError(/already registers the c15t native module/u);
	});

	it('leaves an autolinked MainApplication untouched', async () => {
		const applied = await runMod(
			applyToFixture(PROPS),
			'android',
			'mainApplication',
			{
				contents: CLEAN_MAIN_APPLICATION,
				language: 'kt',
				path: 'MainApplication.kt',
			}
		);

		expect(applied.modResults.contents).toBe(CLEAN_MAIN_APPLICATION);
	});

	it('rejects a Podfile that pods the target by hand', async () => {
		await expect(
			runMod(applyToFixture(PROPS), 'ios', 'podfile', {
				contents: CLEAN_PODFILE.replace(
					'  use_expo_modules!',
					"  use_expo_modules!\n  pod 'C15tReactNative', :path => '../node_modules/@c15t/react-native'"
				),
				language: 'rb',
				path: 'ios/Podfile',
			})
		).rejects.toThrowError(/ios\/Podfile/u);
	});

	it('leaves an autolinked Podfile untouched', async () => {
		const applied = await runMod(applyToFixture(PROPS), 'ios', 'podfile', {
			contents: CLEAN_PODFILE,
			language: 'rb',
			path: 'ios/Podfile',
		});

		expect(applied.modResults.contents).toBe(CLEAN_PODFILE);
	});

	it('rejects an app gradle that includes the module by path', async () => {
		await expect(
			runMod(applyToFixture(PROPS), 'android', 'appBuildGradle', {
				contents: gradleFile('app-build.gradle').contents.replace(
					'implementation("com.facebook.react:react-android")',
					'implementation("com.facebook.react:react-android")\n    implementation project(":c15t-react-native")'
				),
				language: 'groovy',
				path: 'android/app/build.gradle',
			})
		).rejects.toThrowError(/duplicate/u);
	});
});

describe('over-the-air updates', () => {
	it('refuses an update channel that spans every binary', () => {
		const config = fixtureConfig();
		delete config.runtimeVersion;

		expect(() =>
			applyParamsOnConfig(config, PROPS, {
				argv: PREBUILD_ARGV,
				env: {},
				projectRoot: FIXTURE_DIR,
			})
		).toThrowError(/runtimeVersion/u);
	});

	it('says nothing when updates are off', () => {
		const config = fixtureConfig();
		delete config.runtimeVersion;
		config.updates = { enabled: false };

		expect(() =>
			applyParamsOnConfig(config, PROPS, {
				argv: PREBUILD_ARGV,
				env: {},
				projectRoot: FIXTURE_DIR,
			})
		).not.toThrowError();
	});

	it('says nothing when the app does not use updates at all', () => {
		const config = fixtureConfig();
		delete config.runtimeVersion;
		delete config.updates;

		expect(() =>
			applyParamsOnConfig(config, PROPS, {
				argv: PREBUILD_ARGV,
				env: {},
				projectRoot: FIXTURE_DIR,
			})
		).not.toThrowError();
	});
});

describe('package surface', () => {
	it('exports the plugin the app.json string names', () => {
		expect(typeof withC15tOnce).toBe('function');
	});

	it('applies once when another plugin pulls it in too', () => {
		const applied = withC15tOnce(fixtureConfig(), PROPS as never);
		const twice = withC15tOnce(applied, PROPS as never);

		expect(twice).toBe(applied);
	});
});
