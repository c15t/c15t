import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./packages/backend/vitest.config.ts',
	'./packages/backend/vitest.config.ts',
	'./packages/cli/vitest.config.ts',
	'./packages/core/vitest.config.ts',
	'./packages/dev-tools/vitest.config.ts',
	'./packages/iab/vitest.config.ts',
	'./packages/logger/vitest.config.ts',
	'./packages/nextjs/vitest.config.ts',
	'./packages/node-sdk/vitest.config.ts',
	'./packages/react/vitest.config.ts',
	'./packages/scripts/vitest.config.ts',
	'./packages/svelte/vitest.config.ts',
	'./packages/tanstack-start/vitest.config.ts',
	'./packages/translations/vitest.config.ts',
	'./packages/ui/vitest.config.ts',
	'./packages/vue/vitest.config.ts',
	'./scripts/vitest.config.ts',
]);
