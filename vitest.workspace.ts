import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./packages/react/vitest.config.ts',
	'./packages/preact/vitest.config.ts',
	'./packages/backend/vitest.config.ts',
	'./packages/core/vitest.config.ts',
	'./packages/cli/vitest.config.ts',
	'./scripts/vitest.config.ts',
]);
