import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../../..');

const config: NextConfig = {
	cacheComponents: true,
	partialPrefetching: true,
	turbopack: {
		root: monorepoRoot,
	},
};

export default config;
