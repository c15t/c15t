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
				type: 'callGlobal',
				global: 'rdt',
				args: ['init', '{{pixelId}}'],
			},
			{
				type: 'loadScript',
				src: '{{scriptUrl}}',
				async: true,
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
				type: 'callGlobal',
				global: 'snaptr',
				args: ['init', '{{pixelId}}'],
			},
			{
				type: 'callGlobal',
				global: 'snaptr',
				args: ['track', 'PAGE_VIEW'],
			},
			{
				type: 'loadScript',
				src: '{{scriptUrl}}',
				async: true,
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
			type: 'loadScript',
			src: '{{loaderUrl}}',
			async: true,
		});
	});
});
