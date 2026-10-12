import { describe, expect, it } from 'vitest';

import { buildQueuePixelInstall } from './install-builders';

describe('vendor install builders', () => {
	it('builds an init call followed by a script load', () => {
		expect(
			buildQueuePixelInstall({
				global: 'rdt',
				initArgs: ['init', '{{pixelId}}'],
			})
		).toEqual([
			{
				args: ['init', '{{pixelId}}'],
				global: 'rdt',
				type: 'callGlobal',
			},
			{
				async: true,
				src: '{{scriptUrl}}',
				type: 'loadScript',
			},
		]);
	});

	it('adds an optional tracking call before loading the script', () => {
		expect(
			buildQueuePixelInstall({
				global: 'snaptr',
				initArgs: ['init', '{{pixelId}}'],
				trackStep: {
					args: ['track', 'PAGE_VIEW'],
				},
			})
		).toEqual([
			{
				args: ['init', '{{pixelId}}'],
				global: 'snaptr',
				type: 'callGlobal',
			},
			{
				args: ['track', 'PAGE_VIEW'],
				global: 'snaptr',
				type: 'callGlobal',
			},
			{
				async: true,
				src: '{{scriptUrl}}',
				type: 'loadScript',
			},
		]);
	});

	it('supports a custom script placeholder', () => {
		expect(
			buildQueuePixelInstall({
				global: 'pixel',
				initArgs: ['init'],
				scriptPlaceholder: '{{loaderUrl}}',
			})
		).toContainEqual({
			async: true,
			src: '{{loaderUrl}}',
			type: 'loadScript',
		});
	});
});
