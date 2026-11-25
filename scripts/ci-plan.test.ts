import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { starterTargets } from '../internals/fixtures/acceptance/src/starter-targets';
import { ciSchedulingOutputs, createCiPlan, readWorkspaces } from './ci-plan';

// Use the real graph: dependency additions must change selection without a second map.
const repository = new URL('..', import.meta.url).pathname;
const workspaces = readWorkspaces(repository);
const plan = (files: string[]) => createCiPlan(files, workspaces);

describe('CI selection', () => {
	it('installs Chromium for integrations-only runtime tests', () => {
		const result = plan([
			'packages/integrations/src/vendors/analytics/default-com.ts',
		]);
		expect(result).toMatchObject({ full: false, testBrowsers: true });
		expect(result.tests).toContain('@c15t/integrations');
		expect(ciSchedulingOutputs(result)).toMatchObject({
			packageChecks: true,
			testBrowsers: true,
		});
	});

	it.each([
		'docs/integrations/default-com.mdx',
		'packages/node-sdk/src/index.ts',
	])('does not install Chromium for %s', (file) => {
		const result = plan([file]);
		expect(result).toMatchObject({ full: false, testBrowsers: false });
		expect(ciSchedulingOutputs(result).testBrowsers).toBe(false);
	});

	it('tests the compatibility package without requiring vendor-runtime coverage', () => {
		const result = plan(['bun.lock']);
		expect(result.tests).toContain('@c15t/scripts');
		expect(result.coverage).not.toContain('packages/scripts');
		expect(result.coverage).toContain('packages/integrations');
	});

	it('treats release notes as docs but validates publish locks as executable configuration', () => {
		expect(plan(['.tegami/fix.md'])).toMatchObject({
			docs: true,
			full: false,
			tests: [],
		});
		expect(plan(['.tegami/publish-lock.yaml']).full).toBe(true);
	});
	it('runs no runtime work for the docs and generated files in PR 1105', () => {
		const result = plan([
			'docs/docs.config.ts',
			'docs/shared/react/components/frame.mdx',
			'packages/react/AGENTS.md',
			'packages/nextjs/AGENTS.md',
			'packages/c15t/AGENTS.md',
			'packages/integrations/docs/frameworks/next/script-loader.md',
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
			starters: [],
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
	it('pairs an Astro-only change with every framework parity is measured against', () => {
		// The parity suite needs at least two of React, Svelte and Vue; React
		// and Astro alone fail it before comparing anything.
		const result = plan(['packages/astro/src/client.ts']);
		expect([...result.parity].sort()).toEqual([
			'astro',
			'react',
			'svelte',
			'vue',
		]);
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
		// The Tailwind framework matrix covers adapters the Next.js fixtures
		// never load.
		expect(plan(['packages/svelte/src/lib/index.ts']).styles).toBe(true);
		expect(plan(['packages/browser/src/index.ts']).styles).toBe(true);
		expect(plan(['packages/vue/src/index.ts']).styles).toBe(true);
		// The Next.js 15 matrix fixtures are nested packages that pin their own
		// Next.js version, so they own their files.
		expect(
			plan(['benchmarks/tailwind-matrix/v3/next-15/app/globals.css']).styles
		).toBe(true);
		expect(
			plan(['benchmarks/tailwind-matrix/v4/next-16-turbopack/app/globals.css'])
				.styles
		).toBe(true);
		expect(
			plan(['benchmarks/tailwind-matrix/v4/next-15-turbopack/app/globals.css'])
				.styles
		).toBe(true);
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
		expect(result.examples).toHaveLength(18);
		expect(result.starters).toHaveLength(starterTargets.length);
	});
	it('gives every starter in examples/ a smoke target', () => {
		// A full run selects every starter workspace. One without a target
		// would fail its CI leg as an unknown STARTER_TARGET.
		expect(plan(['bun.lock']).starters).toEqual(
			starterTargets.map((target) => target.id).sort()
		);
	});
	it('smoke-tests only the starter whose directory changed', () => {
		const result = plan(['examples/vue/src/App.vue']);
		expect(result.starters).toEqual(['vue']);
		expect(result.examples).toEqual([]);
		expect(result.build).toContain('@c15t/vue');
		expect(result.integrations).toContainEqual({
			kind: 'starters',
			targets: 'vue',
		});
	});
	it('runs the CLI quickstart tests when a starter changes', () => {
		// The CLI writes the starters' quickstart files and diffs them in tests.
		expect(plan(['examples/react/src/consent.tsx']).tests).toContain(
			'@c15t/cli'
		);
		expect(plan(['examples/nuxt/.env']).tests).toContain('@c15t/cli');
		expect(
			plan(['examples/showcase-analytics/src/main.tsx']).tests
		).not.toContain('@c15t/cli');
	});
	it('follows package dependencies into the starters', () => {
		expect(plan(['packages/backend/src/index.ts']).starters).toContain(
			'self-host'
		);
		const browser = plan(['packages/browser/src/index.ts']);
		expect(browser.starters).toContain('html');
		expect(browser.starters).toContain('javascript');
		expect(plan(['internals/fixtures/vue/src/main.ts']).starters).toEqual([]);
	});
	it('smoke-tests the oldest supported Svelte with @c15t/svelte', () => {
		expect(plan(['packages/svelte/src/lib/index.ts']).starters).toContain(
			'svelte-5-20'
		);
		const fixture = plan([
			'internals/svelte-compat/svelte-5-20/src/routes/+page.svelte',
		]);
		expect(fixture.starters).toEqual(['svelte-5-20']);
		expect(fixture.build).toContain('@c15t/svelte');
	});
	it('runs every starter when the smoke harness changes', () => {
		expect(
			plan(['internals/fixtures/acceptance/src/starters.test.ts']).starters
		).toHaveLength(starterTargets.length);
	});
	it('runs benchmark helper tests when benchmark infrastructure changes', () => {
		expect(plan(['benchmarks/shared/src/budgets.ts']).tests).toContain(
			'@c15t/benchmarking'
		);
	});
	it('builds dependencies of an example without selecting their unrelated consumers', () => {
		const result = plan(['internals/fixtures/vue/src/main.ts']);
		expect(result.build).toContain('@c15t/core');
		expect(result.examples).toEqual(['vue']);
		expect(result.compat).toEqual([]);
	});
	it('runs every target built from a changed example directory', () => {
		expect(plan(['internals/fixtures/script-tag/serve.ts']).examples).toEqual([
			'html',
		]);
		expect(plan(['internals/fixtures/nuxt/app/app.vue']).examples).toEqual([
			'nuxt',
			'nuxt-prerender',
			'nuxt-static',
		]);
		expect(
			plan(['internals/fixtures/nuxt-vapor/app/app.vue']).examples
		).toEqual(['nuxt-vapor', 'nuxt-vapor-future']);
	});
	it('runs the HTML journeys when a snippet the fixture serves changes', () => {
		const result = plan(['internals/doc-snippets/html/headless-bar.html']);
		expect(result.full).toBe(false);
		expect(result.examples).toEqual(['html']);
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
			packageChecks: false,
		});
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
			result.integrations.length > 0;
		return consumesArtifact && result.build.length === 0;
	});
	expect(missingBuilds.map((workspace) => workspace.name)).toEqual([]);
});

// Nitro writes .output/server/package.json with dependencies. When Turbo read it
// as a workspace, it dropped the lockfile from every task hash for the rest of
// the job, so CI rebuilt finished packages and ignored dependency updates.
it('keeps build output out of the workspaces Turbo and the CI plan read', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-workspaces-'));
	try {
		const { workspaces: globs } = JSON.parse(
			readFileSync(join(repository, 'package.json'), 'utf8')
		);
		const write = (path: string, manifest: Record<string, unknown>) => {
			mkdirSync(dirname(join(root, path)), { recursive: true });
			writeFileSync(join(root, path), JSON.stringify(manifest));
		};
		write('package.json', {
			name: 'root',
			packageManager: 'bun@1.3.11',
			private: true,
			workspaces: globs,
		});
		write('turbo.json', { tasks: {} });
		write('internals/fixture/package.json', { name: 'fixture' });
		write('benchmarks/bench/package.json', { name: 'bench' });
		for (const output of [
			'dist',
			'.next/standalone',
			'.nuxt',
			'.output/server',
			'storybook-static',
		]) {
			for (const owner of ['internals/fixture', 'benchmarks/bench']) {
				write(`${owner}/${output}/package.json`, {
					dependencies: { vue: '3.5.0' },
					name: `${owner}-${output}`,
				});
			}
		}

		const turbo = JSON.parse(
			execFileSync(
				join(repository, 'node_modules/.bin/turbo'),
				['ls', '--output=json'],
				{
					cwd: root,
					encoding: 'utf8',
					env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
					stdio: ['ignore', 'pipe', 'ignore'],
				}
			)
		) as { packages: { items: { path: string }[] } };

		expect(turbo.packages.items.map((item) => item.path).sort()).toEqual([
			'benchmarks/bench',
			'internals/fixture',
		]);
		expect(
			readWorkspaces(root)
				.map((workspace) => workspace.directory)
				.sort()
		).toEqual(['benchmarks/bench', 'internals/fixture']);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});
