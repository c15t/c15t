import { describe, expect, it } from 'vitest';

import {
	checkAutolinkConfig,
	checkReactNativeAutolinking,
} from './react-native-autolink';

/** A config that says a host app can link the library on both platforms. */
const working = {
	'@c15t/react-native': {
		platforms: {
			android: {
				packageImportPath:
					'import com.c15t.reactnative.C15tReactNativePackage;',
				packageInstance: 'new C15tReactNativePackage()',
				sourceDir:
					'/app/node_modules/@c15t/react-native/android/c15t-react-native',
			},
			ios: {
				podspecPath:
					'/app/node_modules/@c15t/react-native/C15tReactNative.podspec',
			},
		},
	},
};

describe('checkAutolinkConfig', () => {
	it('accepts a library the CLI can link on both platforms', () => {
		expect(checkAutolinkConfig(working)).toStrictEqual([]);
	});

	// The regression this guard exists for. `react-native.config.cjs` pointed Android
	// autolinking at `android`, where the build file has no namespace, and the CLI's two
	// lookups came up empty: `react-native config` exited 1 and the host app died in
	// settings evaluation rather than at a compiler.
	it('rejects an Android source directory above the library module', () => {
		const sourceDir = '/app/node_modules/@c15t/react-native/android';
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: {
						...working['@c15t/react-native'].platforms.android,
						sourceDir,
					},
				},
			},
		});

		expect(failures.join('\n')).toContain(sourceDir);
		expect(failures.join('\n')).toContain('no namespace');
	});

	// A library config written in the app shape validates, is ignored, and leaves the CLI
	// guessing, so the package silently disappears from the config entirely.
	it('reports a package the CLI never lists', () => {
		const failures = checkAutolinkConfig({});

		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain('dependency.platforms');
	});

	it('reports Android autolinking switched off', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: null,
				},
			},
		});

		expect(failures.join('\n')).toContain('no Android half');
	});

	// The import is written into the app's generated PackageList, so a wrong package or class
	// name is a host app that does not compile.
	it('reports a package class the CLI could not resolve', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: {
						...working['@c15t/react-native'].platforms.android,
						packageImportPath: 'import com.c15t.wrong.C15tReactNativePackage;',
					},
				},
			},
		});

		expect(failures.join('\n')).toContain('packageImportPath');
	});

	// Codegen emits NativeC15tSpec into the package named by codegenConfig, and the autolinked
	// library has to be in that same package for the module to compile against the spec.
	it('reports a Java package that disagrees with Codegen', () => {
		const message = checkAutolinkConfig(
			working,
			'com.c15t.somewhere.else'
		).join('\n');

		expect(message).toContain('Codegen generates NativeC15tSpec into');
		expect(message).toContain('com.c15t.somewhere.else');
		expect(message).toContain('com.c15t.reactnative');
	});

	it('accepts the Codegen package the package manifest actually declares', () => {
		// The default argument reads package.json, so an empty answer here is the invariant
		// holding: codegenConfig and the shipped namespace have not drifted apart.
		expect(checkAutolinkConfig(working)).toStrictEqual([]);
	});

	// iOS resolution rides along because the same config file feeds `pod install`, and a pod
	// that stops being discovered is a broken iOS build with no Android involvement.
	it('reports a missing podspec', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: { ...working['@c15t/react-native'].platforms, ios: null },
			},
		});

		expect(failures.join('\n')).toContain('no iOS half');
	});

	it('reports a podspec that is not the binding', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					ios: { podspecPath: '/somewhere/Else.podspec' },
				},
			},
		});

		expect(failures.join('\n')).toContain('Else.podspec');
	});
});

describe('checkReactNativeAutolinking', () => {
	// The whole path, from the example app's own install of the CLI. This is the assertion CI
	// is paid for: `packages/react-native/android` builds the same library without ever asking
	// the CLI what it makes of it.
	it('resolves @c15t/react-native from the bare example app', () => {
		expect(checkReactNativeAutolinking()).toStrictEqual([]);
	}, 60_000);
});
