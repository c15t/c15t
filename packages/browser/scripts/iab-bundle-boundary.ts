import type { Rspack } from '@rslib/core';

/** Fail a normal script build if it acquires the CMP, codec, or IAB stylesheet. */
export const iabBundleBoundary = (): Rspack.RspackPluginInstance => ({
	apply(compiler) {
		compiler.hooks.compilation.tap('IABBundleBoundary', (compilation) => {
			compilation.hooks.finishModules.tap('IABBundleBoundary', (modules) => {
				for (const module of modules) {
					const id = module.identifier().replaceAll('\\', '/');
					if (
						/\/packages\/iab\/|\/@c15t\/iab\/|\/@iabtechlabtcf\/|\/generated\/iab-styles/u.test(
							id
						)
					) {
						throw new Error(
							`IAB implementation leaked into a normal browser bundle: ${id}`
						);
					}
				}
			});
		});
	},
});
