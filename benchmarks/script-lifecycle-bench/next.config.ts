import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/react',
	'@c15t/nextjs',
	'c15t',
];

const config: NextConfig = {
	transpilePackages,
	turbopack: {
		root: monorepoRoot,
	},
};

export default config;
