import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

const config: NextConfig = {
	transpilePackages: ['@c15t/benchmarking'],
	turbopack: {
		root: monorepoRoot,
	},
};

export default config;
