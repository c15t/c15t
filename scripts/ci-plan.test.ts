import { describe, expect, it } from 'vitest';

import { createCiPlan, readWorkspaces } from './ci-plan';

// Use the real graph: dependency additions must change selection without a second map.
const repository = new URL('..', import.meta.url).pathname;
const workspaces = readWorkspaces(repository);
const plan = (files: string[]) => createCiPlan(files, workspaces);

describe('CI selection', () => {
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
		expect(result.compat).toHaveLength(6);
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
});
