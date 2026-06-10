import { defineProject, mergeConfig } from 'vitest/config';
import { baseConfig } from './base-config';

export const uiConfig = mergeConfig(
	baseConfig,
	defineProject({
		test: {
			environment: 'jsdom',
		},
	})
);
