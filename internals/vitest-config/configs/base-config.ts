import { defineConfig } from 'vitest/config';

export const baseConfig = defineConfig({
	test: {
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json-summary', 'json'],
			reportOnFailure: true,
			enabled: true,
		},
	},
});
