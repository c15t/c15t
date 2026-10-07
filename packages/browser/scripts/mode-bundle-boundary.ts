import type { Rspack } from '@rslib/core';

interface BundledModule {
	identifier?: string;
	nameForCondition?: string | null;
	modules?: BundledModule[];
}

const COMMON_EXCLUSIONS = [
	/\/(?:packages\/browser|@c15t\/browser)\/(?:src|dist)\/(?:client|global|transports\/manifest)\.[jt]s(?:$|[?|])/u,
	/\/(?:packages\/core|@c15t\/core)\/(?:src|dist)\/transports\/manifest[^/]*\.[jt]s(?:$|[?|])/u,
];
const HOSTED_EXCLUSIONS = [
	...COMMON_EXCLUSIONS,
	/\/(?:packages\/core|@c15t\/core)\/(?:src|dist)\/transports\/offline\.[jt]s(?:$|[?|])/u,
	/\/(?:packages\/browser|@c15t\/browser)\/(?:src|dist)\/policy-rules\.[jt]s(?:$|[?|])/u,
	/\/(?:packages\/schema|@c15t\/schema)\/(?:src|dist)\/shared\/(?:policy-rule-presets|policy-resolution|policy-rule|policy-rule-fingerprint)\.[jt]s(?:$|[?|])/u,
];
const OFFLINE_EXCLUSIONS = [
	...COMMON_EXCLUSIONS,
	/\/(?:packages\/core|@c15t\/core)\/(?:src|dist)\/transports\/(?:hosted[^/]*|mode)\.[jt]s(?:$|[?|])/u,
];

const assertModules = function assertModules(
	mode: 'hosted' | 'offline',
	modules: readonly BundledModule[]
): void {
	const exclusions = mode === 'hosted' ? HOSTED_EXCLUSIONS : OFFLINE_EXCLUSIONS;
	for (const module of modules) {
		const id = (module.nameForCondition ?? module.identifier ?? '').replaceAll(
			'\\',
			'/'
		);
		if (exclusions.some((pattern) => pattern.test(id))) {
			throw new Error(
				`Unexpected implementation in ${mode} browser bundle: ${id}`
			);
		}
		if (module.modules) {
			assertModules(mode, module.modules);
		}
	}
};

/**
 * Check emitted chunks after tree shaking, including concatenated modules.
 * Parsed but unused barrel exports do not count as bundled code.
 *
 * @param mode - The bundle's supported transport.
 * @returns A build plugin that fails if another mode enters the output.
 */
export const modeBundleBoundary = (
	mode: 'hosted' | 'offline'
): Rspack.RspackPluginInstance => ({
	apply(compiler) {
		compiler.hooks.done.tap('BrowserModeBundleBoundary', (stats) => {
			const output = stats.toJson({
				all: false,
				cachedModules: true,
				chunkModules: true,
				chunkModulesSpace: Number.POSITIVE_INFINITY,
				chunks: true,
				dependentModules: true,
				groupModulesByAttributes: false,
				groupModulesByCacheStatus: false,
				groupModulesByExtension: false,
				groupModulesByLayer: false,
				groupModulesByPath: false,
				groupModulesByType: false,
				nestedModules: true,
				nestedModulesSpace: Number.POSITIVE_INFINITY,
				orphanModules: true,
			});
			for (const chunk of output.chunks ?? []) {
				assertModules(mode, chunk.modules ?? []);
			}
		});
	},
});
