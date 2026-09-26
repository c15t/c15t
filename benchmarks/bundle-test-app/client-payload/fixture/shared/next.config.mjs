import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Identical in every arm. Browser source maps let the attribution script map
 * minified chunk bytes back to the package and module that produced them.
 * They add a trailing `sourceMappingURL` comment, which the script strips
 * before measuring.
 */
const config = {
	outputFileTracingRoot: root,
	productionBrowserSourceMaps: true,
	reactStrictMode: true,
	turbopack: { root },
};

export default config;
