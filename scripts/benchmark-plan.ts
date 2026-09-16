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

/** Select the complete profile or one package, rejecting empty or unknown shards. */
export const createBenchmarkPlan = function createBenchmarkPlan(
	mode: string,
	packageName?: string
) {
	const profile = Object.hasOwn(profiles, mode) ? profiles[mode] : undefined;
	if (!profile) {
		throw new Error(`Unknown benchmark mode: ${mode}`);
	}
	if (packageName !== undefined && !profile.packages.includes(packageName)) {
		throw new Error(`Unknown benchmark package for ${mode}: ${packageName}`);
	}
	const packages = packageName === undefined ? profile.packages : [packageName];
	return {
		// The Nuxt runner records results under the Vue adapter's package name.
		expectedPackages: packages.map((name) =>
			name === '@c15t/nuxt-browser-bench' ? '@c15t/vue' : name
		),
		packages,
		suites: profile.suites,
	};
};

if (import.meta.main) {
	const plan = createBenchmarkPlan(process.argv[2] ?? 'quick');
	process.stdout.write(
		JSON.stringify({
			include: plan.packages.map((name) => ({
				id: name.replace('@c15t/', ''),
				package: name,
			})),
		})
	);
}
