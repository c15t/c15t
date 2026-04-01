import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
	openAnalyzer: true,
});

const config: NextConfig = {
	transpilePackages: ['@c15t/benchmarking'],
	turbopack: {
		root: monorepoRoot,
	},
};

export default withBundleAnalyzer(config);
