import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ciSchedulingOutputs, createCiPlan, readWorkspaces } from './ci-plan';

// Use the real graph: dependency additions must change selection without a second map.
const repository = new URL('..', import.meta.url).pathname;
const workspaces = readWorkspaces(repository);
const plan = (files: string[]) => createCiPlan(files, workspaces);

describe('CI selection', () => {
	it('runs the device builds for whichever autolink config the package has', () => {
		// The device group is the only job that asks Expo whether the library was linked,
		// and it selects on paths alone. The config was renamed from `.cjs` to `.js` and the
		// selector went on naming the old literal, so edits to the very file whose breakage
		// dropped the library in silence stopped selecting the check that would have caught
		// it. Reading the directory is what keeps this honest if it moves again.
		const packageRoot = new URL('../packages/react-native/', import.meta.url)
			.pathname;
		const configs = readdirSync(packageRoot).filter((entry) =>
			entry.startsWith('react-native.config.')
		);
		expect(configs).not.toHaveLength(0);
		for (const config of configs) {
			expect(plan([`packages/react-native/${config}`])).toMatchObject({
				mobileBrowserOrDevice: true,
			});
		}
	});
	it('runs no runtime work for the docs and generated files in PR 1105', () => {
		const result = plan([
			'docs/docs.config.ts',
			'docs/shared/react/components/frame.mdx',
			'packages/react/AGENTS.md',
			'packages/nextjs/AGENTS.md',
			'packages/c15t/AGENTS.md',
			'packages/scripts/docs/frameworks/next/script-loader.md',
		]);
		expect(result).toMatchObject({
			backend: false,
			build: [],
			bundle: false,
			compat: [],
			docs: true,
			examples: [],
			journeys: [],
			parity: [],
			performance: false,
			styles: false,
			tests: [],
			types: [],
		});
	});
	it('follows core changes through all consumer frameworks', () => {
		const result = plan(['packages/core/src/kernel.ts']);
		expect(result.tests).toContain('@c15t/react');
		expect(result.examples).toContain('nextjs');
		expect(result.examples).toContain('sveltekit');
		expect(result.compat).toContain('16-static-export');
		expect(result.bundle).toBe(true);
	});
	it('follows Next through the umbrella package used by examples', () => {
		const result = plan(['packages/nextjs/src/index.ts']);
		expect([...result.compat].sort()).toEqual([
			'15-app',
			'15-pages',
			'16-app',
			'16-cache-components',
			'16-pages',
			'16-static-export',
		]);
		expect(result.examples).toContain('nextjs');
		expect(result.examples).toContain('vue');
		expect(result.tests).not.toContain('@c15t/node-sdk');
	});
	it('keeps CSS consumers and backend databases covered', () => {
		expect(plan(['packages/ui/src/styles.css']).styles).toBe(true);
		expect(plan(['packages/backend/src/index.ts']).backend).toBe(true);
		expect(plan(['packages/cli/src/index.ts']).backend).toBe(false);
	});
	it.each([
		'bun.lock',
		'package.json',
		'turbo.json',
		'packages/shared/rslib-utils.ts',
		'packages/deleted/package.json',
		'.github/actions/setup/action.yml',
	])('widens safely for %s', (file) => {
		const result = plan([file]);
		expect(result.full).toBe(true);
		expect(result.backend).toBe(true);
		expect(result.examples).toHaveLength(9);
	});
	it('runs benchmark helper tests when benchmark infrastructure changes', () => {
		expect(plan(['benchmarks/shared/src/budgets.ts']).tests).toContain(
			'@c15t/benchmarking'
		);
	});
	it('builds dependencies of an example without selecting their unrelated consumers', () => {
		const result = plan(['examples/vue/src/main.ts']);
		expect(result.build).toContain('@c15t/core');
		expect(result.examples).toEqual(['vue']);
		expect(result.compat).toEqual([]);
	});
	it('runs the mobile SDK jobs for the package, the kernels, and the mobile bench', () => {
		for (const file of [
			'packages/react-native/src/index.ts',
			'packages/react-native/android/c15t-react-native/library.gradle',
			'benchmarks/mobile/src/run.ts',
		]) {
			const result = plan([file]);
			expect(result.mobile, file).toBe(true);
			expect(result.build).toContain('@c15t/react-native');
		}
		expect(plan(['packages/react-native/src/index.ts']).tests).toContain(
			'@c15t/react-native'
		);
		expect(plan(['benchmarks/mobile/src/run.ts']).tests).toContain(
			'@c15t/mobile-bench'
		);
	});
	it('follows a core change into the mobile SDK that runs the same kernel', () => {
		const result = plan(['packages/core/src/kernel.ts']);
		expect(result.mobile).toBe(true);
		expect(result.mobileBrowserOrDevice).toBe(false);
	});
	it.each([
		'native/core-swift/Sources/C15tCore/ConsentCore.swift',
		'native/core-android/c15t-core/src/main/kotlin/com/c15t/core/C15tKernel.kt',
		'native/protocol/evaluation-eu-opt-in.json',
	])('selects the whole graph for the native path %s', (file) => {
		const result = plan([file]);
		expect(result.full).toBe(true);
		expect(result.mobile).toBe(true);
		expect(result.mobileBrowserOrDevice).toBe(true);
	});
	it('keeps packages that only share benchmark tooling off the mobile runners', () => {
		// The mobile bench depends on @c15t/benchmarking, which the backend depends on
		// too. Selecting the mobile group through that edge would put a macOS runner on
		// every backend pull request.
		for (const file of [
			'packages/backend/src/index.ts',
			'benchmarks/shared/src/budgets.ts',
		]) {
			expect(plan([file]).mobile, file).toBe(false);
			expect(plan([file]).mobileBrowserOrDevice, file).toBe(false);
		}
	});
	it('runs app builds only for files an app compiles', () => {
		const device = [
			'examples/expo-dev/App.tsx',
			'examples/react-native-bare/ios/Podfile',
			'packages/react-native/ios/C15tReactNative/Bridge/Wire.swift',
			'packages/react-native/C15tReactNative.podspec',
			'packages/react-native/Package.swift',
		];
		for (const file of device) {
			expect(plan([file]).mobileBrowserOrDevice, file).toBe(true);
		}
		// JavaScript inside the SDK is covered by the mobile SDK jobs, and an app
		// build on every kernel tweak would cost macOS minutes for no new signal.
		expect(
			plan(['packages/react-native/src/index.ts']).mobileBrowserOrDevice
		).toBe(false);
		expect(plan(['packages/backend/src/index.ts']).mobileBrowserOrDevice).toBe(
			false
		);
	});
	it('runs no mobile work for mobile documentation', () => {
		const result = plan([
			'docs/mobile/react-native.mdx',
			'native/CONTRACT.md',
			'packages/react-native/README.md',
			'benchmarks/mobile/README.md',
		]);
		expect(result).toMatchObject({
			build: [],
			docs: true,
			mobile: false,
			mobileBrowserOrDevice: false,
			tests: [],
		});
	});
});

describe('CI scheduling outputs', () => {
	it('keeps workspace names out of job outputs while selecting runtime work', () => {
		const output = ciSchedulingOutputs(plan(['packages/core/src/kernel.ts']));
		expect(output).toMatchObject({ build: true, packageChecks: true });
		expect(JSON.stringify(output)).not.toContain('@c15t/');
	});
	it('skips runtime jobs for documentation', () => {
		expect(ciSchedulingOutputs(plan(['docs/guide.mdx']))).toMatchObject({
			build: false,
			integrations: [],
			mobile: false,
			mobileBrowserOrDevice: false,
			packageChecks: false,
		});
	});
	it('schedules both mobile groups as booleans', () => {
		const sdk = ciSchedulingOutputs(
			plan(['packages/react-native/src/index.ts'])
		);
		expect(sdk.mobile).toBe(true);
		expect(sdk.mobileBrowserOrDevice).toBe(false);
		const apps = ciSchedulingOutputs(plan(['examples/expo-dev/App.tsx']));
		expect(apps.mobileBrowserOrDevice).toBe(true);
		expect(JSON.stringify(apps)).not.toContain('@c15t/');
	});
	it('schedules packages when only test types are selected', () => {
		const result = createCiPlan(
			['fixtures/typecheck/types.ts'],
			[
				{
					dependencies: [],
					directory: 'fixtures/typecheck',
					name: 'fixture',
					scripts: { 'check-types:test': 'tsc --noEmit' },
				},
			]
		);
		expect(ciSchedulingOutputs(result).packageChecks).toBe(true);
	});
});

it('every selected artifact consumer has a package build in the real graph', () => {
	const missingBuilds = workspaces.filter((workspace) => {
		const result = plan([`${workspace.directory}/ci-fixture.ts`]);
		const consumesArtifact =
			result.backend ||
			result.bundle ||
			result.performance ||
			result.mobile ||
			result.mobileBrowserOrDevice ||
			result.integrations.length > 0;
		return consumesArtifact && result.build.length === 0;
	});
	expect(missingBuilds.map((workspace) => workspace.name)).toEqual([]);
});
