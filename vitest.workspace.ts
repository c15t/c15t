import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./packages/react/vitest.config.ts',
	'./packages/backend/vitest.config.ts',
	'./packages/core/vitest.config.ts',
	'./apps/examples/vite-react/vite.config.ts',
]);
