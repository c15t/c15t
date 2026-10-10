const quickPackages = ['@c15t/core-benchmarks', '@c15t/script-lifecycle-bench'];

const profiles: Record<string, { packages: string[]; suites: string[] }> = {
	bundle: {
		packages: ['@c15t/next-bundle-bench'],
		suites: ['bundle', 'artifact'],
	},
	full: {
		packages: [
			...quickPackages,
			'@c15t/react-browser-bench',
			'@c15t/nextjs-browser-bench',
			'@c15t/nuxt-browser-bench',
			'@c15t/sveltekit-browser-bench',
			'@c15t/astro-browser-bench',
			'@c15t/tanstack-start-browser-bench',
		],
		suites: [
			'core-runtime',
			'policy-runtime',
			'script-lifecycle',
			'browser-runtime',
		],
	},
	quick: {
		packages: quickPackages,
		suites: ['core-runtime', 'policy-runtime', 'script-lifecycle'],
	},
};

/**
 * Packages split across several runners, with the share each one measures in
 * `C15T_BENCH_ONLY` / `C15T_BENCH_SKIP` syntax (see
 * `benchmarks/shared/src/selection.ts`).
 *
 * Every core-benchmarks pass spends about 30 seconds on each policy fixture
 * and two on all of core-runtime, and a runner makes six passes, so one
 * runner took ten minutes, the slowest job in CI. Each shard still alternates
 * base and head on its own runner. The last shard skips the fixtures named
 * before it rather than listing its own, so a new policy fixture is measured
 * there instead of by nobody.
 */
const shards: Record<string, { id: string; only: string[]; skip: string[] }[]> =
	{
		'@c15t/core-benchmarks': [
			{
				id: 'core-benchmarks-eu',
				only: ['core-runtime', 'policy-runtime:optin-choice-eu'],
				skip: [],
			},
			{
				id: 'core-benchmarks-california',
				only: ['policy-runtime:optout-california'],
				skip: [],
			},
			{
				id: 'core-benchmarks-world',
				only: ['policy-runtime'],
				skip: [
					'policy-runtime:optin-choice-eu',
					'policy-runtime:optout-california',
				],
			},
		],
	};

/** One runner's share of a profile. */
export interface BenchmarkShard {
	id: string;
	package: string;
	only: string[];
	skip: string[];
}

/** The runners a profile is measured on, one or more per package. */
export const createBenchmarkShards = function createBenchmarkShards(
	packages: string[]
): BenchmarkShard[] {
	return packages.flatMap(
		(name) =>
			(Object.hasOwn(shards, name) ? shards[name] : undefined)?.map(
				(shard) => ({ ...shard, package: name })
			) ?? [
				{ id: name.replace('@c15t/', ''), only: [], package: name, skip: [] },
			]
	);
};

/**
 * Select the complete profile, one package, or one shard by its matrix id,
 * rejecting empty or unknown selections.
 */
export const createBenchmarkPlan = function createBenchmarkPlan(
	mode: string,
	selector?: string
) {
	const profile = Object.hasOwn(profiles, mode) ? profiles[mode] : undefined;
	if (!profile) {
		throw new Error(`Unknown benchmark mode: ${mode}`);
	}
	const shard = createBenchmarkShards(profile.packages).find(
		(entry) => entry.id === selector
	);
	if (
		selector !== undefined &&
		!shard &&
		!profile.packages.includes(selector)
	) {
		throw new Error(`Unknown benchmark package for ${mode}: ${selector}`);
	}
	const selected = shard?.package ?? selector;
	const packages = selected === undefined ? profile.packages : [selected];
	return {
		// The Nuxt runner records results under the Vue adapter's package name.
		expectedPackages: packages.map((name) =>
			name === '@c15t/nuxt-browser-bench' ? '@c15t/vue' : name
		),
		only: shard?.only ?? [],
		packages,
		skip: shard?.skip ?? [],
		suites: profile.suites,
	};
};

if (import.meta.main) {
	const { packages } = createBenchmarkPlan(process.argv[2] ?? 'quick');
	process.stdout.write(
		JSON.stringify({
			include: createBenchmarkShards(packages).map(({ id, package: name }) => ({
				id,
				package: name,
			})),
		})
	);
}
