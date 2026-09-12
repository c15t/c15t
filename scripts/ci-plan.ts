import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import fg from 'fast-glob';

export interface Workspace {
	name: string;
	directory: string;
	dependencies: string[];
	scripts: Record<string, string>;
}

export const readWorkspaces = function readWorkspaces(
	rootDirectory = '.'
): Workspace[] {
	const root = JSON.parse(
		readFileSync(join(rootDirectory, 'package.json'), 'utf8')
	) as { workspaces: string[] };
	return fg
		.sync(
			root.workspaces.map((pattern) => `${pattern}/package.json`),
			{
				cwd: rootDirectory,
				ignore: [
					'**/node_modules/**',
					'**/dist/**',
					'**/.next/**',
					'**/.nuxt/**',
					'**/.output/**',
					'**/storybook-static/**',
				],
			}
		)
		.map((path) => {
			const manifest = JSON.parse(
				readFileSync(join(rootDirectory, path), 'utf8')
			);
			return {
				dependencies: Object.keys({
					...manifest.dependencies,
					...manifest.devDependencies,
					...manifest.peerDependencies,
					...manifest.optionalDependencies,
				}),
				directory: dirname(path),
				name: manifest.name,
				scripts: manifest.scripts ?? {},
			};
		});
};

/** Documentation never changes executable package code, including bundled copies. */
export const isDocumentation = function isDocumentation(path: string): boolean {
	return (
		path.startsWith('docs/') ||
		path.startsWith('.changeset/') ||
		/\.(?:md|mdx)$/u.test(path) ||
		/^packages\/[^/]+\/readme\.json$/u.test(path) ||
		/^packages\/[^/]+\/docs\//u.test(path)
	);
};

/** Select reverse dependencies first, then build their forward dependency closure. */
// oxlint-disable-next-line complexity -- Selection combines independent integration capabilities; graph traversal stays explicit.
export const createCiPlan = function createCiPlan(
	files: string[],
	workspaces: Workspace[],
	forceFull = false
) {
	let full = forceFull;
	const runtime = files.filter((path) => !isDocumentation(path));
	const owners = new Set<string>();
	for (const path of runtime) {
		const [owner] = workspaces
			.filter((workspace) => path.startsWith(`${workspace.directory}/`))
			.sort((left, right) => right.directory.length - left.directory.length);
		if (owner) {
			owners.add(owner.name);
		} else {
			// Root config, shared build helpers, deleted packages, and unknown inputs
			// widen the run. An unrecognised file must never silently skip validation.
			full = true;
		}
	}
	const affected = new Set(
		full ? workspaces.map((workspace) => workspace.name) : owners
	);
	let previous = -1;
	while (previous !== affected.size) {
		previous = affected.size;
		for (const workspace of workspaces) {
			if (
				workspace.dependencies.some((dependency) => affected.has(dependency))
			) {
				affected.add(workspace.name);
			}
		}
	}
	const selected = workspaces.filter((workspace) =>
		affected.has(workspace.name)
	);
	const required = new Set(affected);
	const examples = [
		['nextjs', 'nextjs'],
		['react', 'react'],
		['vue', 'vue'],
		['svelte', 'svelte'],
		['javascript', 'javascript'],
		['nuxt', 'nuxt'],
		['tanstack-start', 'tanstack-start'],
		['astro', 'astro-demo'],
		['sveltekit', 'sveltekit-demo'],
	]
		.filter(([, directory]) =>
			selected.some(
				(workspace) => workspace.directory === `examples/${directory}`
			)
		)
		.map(([id]) => id ?? '');
	if (affected.has('@c15t/example-conformance')) {
		examples.splice(
			0,
			examples.length,
			'nextjs',
			'react',
			'vue',
			'svelte',
			'javascript',
			'nuxt',
			'tanstack-start',
			'astro',
			'sveltekit'
		);
	}
	const parity = selected
		.filter((workspace) =>
			/^apps\/storybook-(?:react|vue|svelte|astro)$/u.test(workspace.directory)
		)
		.map((workspace) => workspace.directory.replace('apps/storybook-', ''));
	if (parity.includes('react')) {
		parity.splice(0, parity.length, 'react', 'svelte', 'vue', 'astro');
	}
	if (parity.length && !parity.includes('react')) {
		parity.unshift('react');
	}
	// Changes to the comparison runner must exercise the complete contract.
	if (
		selected.some(
			(workspace) => workspace.directory === 'apps/parity-runner'
		) &&
		!parity.length
	) {
		parity.push('react', 'svelte', 'vue', 'astro');
	}
	const journeys = selected
		.filter((workspace) =>
			/^benchmarks\/(?:nextjs|nuxt|sveltekit)-browser-bench$/u.test(
				workspace.directory
			)
		)
		.map((workspace) =>
			workspace.directory
				.replace('benchmarks/', '')
				.replace('-browser-bench', '')
		);
	if (affected.has('@c15t/example-conformance')) {
		journeys.splice(0, journeys.length, 'nextjs', 'nuxt', 'sveltekit');
	}
	const compat = selected
		.filter((workspace) => workspace.scripts['test:compat'])
		.map((workspace) => workspace.name.replace('@c15t/next-compat-', ''));
	const tests = selected
		.filter(
			(workspace) =>
				workspace.scripts.test &&
				workspace.name !== '@c15t/backend' &&
				workspace.directory !== 'examples/shared'
		)
		.map((workspace) => workspace.name);
	const types = selected
		.filter((workspace) => workspace.scripts['check-types'])
		.map((workspace) => workspace.name);
	for (const workspace of workspaces) {
		if (
			parity.some(
				(target) => workspace.directory === `apps/storybook-${target}`
			) ||
			journeys.some(
				(target) => workspace.directory === `benchmarks/${target}-browser-bench`
			) ||
			examples.some(
				(target) =>
					workspace.directory ===
					`examples/${({ astro: 'astro-demo', sveltekit: 'sveltekit-demo' } as Record<string, string>)[target] ?? target}`
			)
		) {
			required.add(workspace.name);
		}
	}
	previous = -1;
	while (previous !== required.size) {
		previous = required.size;
		for (const workspace of workspaces) {
			if (required.has(workspace.name)) {
				for (const dependency of workspace.dependencies) {
					required.add(dependency);
				}
			}
		}
	}
	const build = workspaces
		.filter(
			(workspace) =>
				workspace.directory.startsWith('packages/') &&
				required.has(workspace.name) &&
				workspace.scripts.build
		)
		.map((workspace) => workspace.name);
	const styles = selected.some((workspace) =>
		/benchmarks\/(?:tw3-test|tw4-test|no-tw-test|css-layer-preview)$/u.test(
			workspace.directory
		)
	);
	const integrations = [
		{ kind: 'examples', targets: examples.join(',') },
		{ kind: 'compat', targets: compat.join(',') },
		{ kind: 'parity', targets: parity.join(',') },
		{ kind: 'journeys', targets: journeys.join(',') },
		{ kind: 'styles', targets: styles ? 'all' : '' },
	].filter((entry) => entry.targets.length > 0);
	return {
		backend: affected.has('@c15t/backend'),
		build,
		bundle: affected.has('@c15t/next-bundle-bench'),
		compat,
		coverage: selected
			.filter(
				(workspace) =>
					tests.includes(workspace.name) &&
					workspace.dependencies.includes('@c15t/vitest-config')
			)
			.map((workspace) => workspace.directory),
		docs: full || files.some(isDocumentation),
		examples,
		full,
		integrations,
		journeys,
		parity,
		performance: selected.some(
			(workspace) =>
				workspace.directory.startsWith('benchmarks/') &&
				Boolean(workspace.scripts['bench:ci'])
		),
		styles,
		testBrowsers: tests.some((name) =>
			[
				'@c15t/react',
				'@c15t/nextjs',
				'@c15t/tanstack-start',
				'@c15t/browser',
			].includes(name)
		),
		testTypes: selected
			.filter((workspace) => workspace.scripts['check-types:test'])
			.map((workspace) => workspace.name),
		tests,
		types,
	};
};

export type CiPlan = ReturnType<typeof createCiPlan>;

/** Keep workspace names in the artifact, outside GitHub's job-output secret filter. */
export const ciSchedulingOutputs = (plan: CiPlan) => ({
	backend: plan.backend,
	build: plan.build.length > 0,
	bundle: plan.bundle,
	docs: plan.docs,
	integrations: plan.integrations,
	packageChecks:
		plan.tests.length + plan.types.length + plan.testTypes.length > 0,
	performance: plan.performance,
	testBrowsers: plan.testBrowsers,
});

if (import.meta.main) {
	const base = process.env.CI_DIFF_BASE;
	const full = process.argv.includes('--full') || !base;
	const files = full
		? []
		: execFileSync(
				'git',
				['diff', '--no-renames', '--name-only', '-z', `${base}...HEAD`],
				{ encoding: 'utf8' }
			)
				.split('\0')
				.filter(Boolean);
	const plan = createCiPlan(files, readWorkspaces(), full);
	writeFileSync('ci-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
	if (process.env.GITHUB_OUTPUT) {
		for (const [key, value] of Object.entries(ciSchedulingOutputs(plan))) {
			appendFileSync(
				process.env.GITHUB_OUTPUT,
				`${key}=${JSON.stringify(value)}\n`
			);
		}
	}
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`## Selected checks\n\nBase: ${base ?? 'full run'}\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\`\n`
		);
	}
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}
