import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../../..');

const config: NextConfig = {
	cacheComponents: true,
	transpilePackages: [
		'@c15t/next-compat-shared',
		'@c15t/nextjs',
		'@c15t/react',
		'c15t',
	],
	turbopack: {
		root: monorepoRoot,
	},
};

export default config;
