import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: { environment: 'node', include: ['examples/demo/lib/**/*.test.ts'] },
});
