import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: { enabled: false },
		// DOM tests opt in per file with `@vitest-environment jsdom`; server
		// request tests stay on plain Node like a real server render.
		environment: 'node',
		include: ['tests/**/*.test.{ts,tsx}'],
		passWithNoTests: false,
		restoreMocks: true,
		setupFiles: ['tests/setup.ts'],
		unstubGlobals: true,
	},
});
