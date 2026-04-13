import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bundleAnalyzer from '@next/bundle-analyzer';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
	openAnalyzer: true,
});

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/react',
	'@c15t/nextjs',
	'c15t',
];

const config = {
	transpilePackages,
	turbopack: {
		root: monorepoRoot,
	},
};

export default withBundleAnalyzer(config);
