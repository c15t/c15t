import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

const config: NextConfig = {
	allowedDevOrigins: ['example-demo.localhost', '*.example-demo.localhost'],
	turbopack: {
		root: workspaceRoot,
	},
};

export default config;
