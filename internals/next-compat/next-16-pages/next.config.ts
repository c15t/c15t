import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../../..');

const config: NextConfig = {
	// v3 components import their CSS from JavaScript. The Pages Router loads
	// installed packages with Node at runtime, which cannot import `.css`, so
	// the c15t packages have to be bundled rather than externalised.
	transpilePackages: [
		'@c15t/next-compat-shared',
		'@c15t/nextjs',
		'@c15t/react',
		'@c15t/ui',
	],
	turbopack: {
		root: monorepoRoot,
	},
};

export default config;
