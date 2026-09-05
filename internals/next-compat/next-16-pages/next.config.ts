import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../../..');

const config: NextConfig = {
	// The Pages Router loads installed packages with Node at runtime, and the
	// @c15t/ui component class maps import their CSS (by design: a js + css +
	// d.ts triple per component). Node cannot import CSS, so the c15t packages
	// have to be bundled rather than externalised here.
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
