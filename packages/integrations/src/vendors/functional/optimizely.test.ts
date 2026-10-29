/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import type { OptimizelyWebOptions } from './optimizely';
import { optOutOptimizely, optimizelyWeb } from './optimizely';

describe('optimizelyWeb', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.optimizely;
	});

	it('matches the experience integration registry', () => {
		expectScriptMatchesIntegration(
			'optimizelyWeb',
			optimizelyWeb({ projectId: '12345678' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: undefined,
				src: 'https://cdn.optimizely.com/js/12345678.js',
			}
		);
	});

	it.each([
		'',
		'   ',
		undefined,
		null,
		{},
		Number.NaN,
		Infinity,
		'abc',
		'../123',
		-1,
		Number.MAX_SAFE_INTEGER + 1,
		1.5,
		'1e12',
	])('logs and skips invalid project ID %s', (projectId) => {
		expectSkippedScript(
			() =>
				optimizelyWeb({
					projectId: projectId as OptimizelyWebOptions['projectId'],
				}),
			{ category: 'experience', id: 'optimizely' },
			'optimizelyWeb: missing or invalid projectId'
		);
	});

	it('keeps a custom consent condition when the project ID is missing', () => {
		expectSkippedScript(
			() => optimizelyWeb({ category: 'measurement', projectId: '' }),
			{ category: 'measurement', id: 'optimizely' },
			'optimizelyWeb: missing or invalid projectId'
		);
	});

	it('normalises project IDs without creating a global', () => {
		expect(optimizelyWeb({ projectId: '  12345678  ' }).src).toBe(
			'https://cdn.optimizely.com/js/12345678.js'
		);
		expect(optimizelyWeb({ projectId: 12345678 }).src).toBe(
			'https://cdn.optimizely.com/js/12345678.js'
		);
		expect(window.optimizely).toBeUndefined();
	});

	it('preserves a large project ID supplied as a string', () => {
		expect(optimizelyWeb({ projectId: '9007199254740993' }).src).toBe(
			'https://cdn.optimizely.com/js/9007199254740993.js'
		);
	});

	it('supports a custom category condition, loader URL and CSP nonce', () => {
		const script = optimizelyWeb({
			category: { and: ['experience', 'measurement'] },
			nonce: '  nonce-value  ',
			projectId: '12345678',
			scriptSrc: ' https://example.com/optimizely.js ',
		});
		expect(script).toMatchObject({
			async: false,
			category: { and: ['experience', 'measurement'] },
			nonce: 'nonce-value',
			src: 'https://example.com/optimizely.js',
		});
	});

	it('uses the project snippet when the URL override is blank', () => {
		expect(optimizelyWeb({ projectId: '12345678', scriptSrc: '  ' }).src).toBe(
			'https://cdn.optimizely.com/js/12345678.js'
		);
	});

	it('does not replace an existing Optimizely API during configuration', () => {
		const api = { push: vi.fn() };
		window.optimizely = api;
		optimizelyWeb({ projectId: '12345678' });
		expect(window.optimizely).toBe(api);
		expect(api.push).not.toHaveBeenCalled();
	});

	it('sends the documented persistent opt-out only when requested', () => {
		window.optimizely = { push: vi.fn() };
		optOutOptimizely();
		expect(window.optimizely.push).toHaveBeenCalledExactlyOnceWith({
			isOptOut: true,
			type: 'optOut',
		});
	});

	it('can queue an explicit opt-out on an existing snippet queue', () => {
		const queue: Record<string, unknown>[] = [];
		window.optimizely = queue;
		optOutOptimizely();
		expect(queue).toEqual([{ isOptOut: true, type: 'optOut' }]);
	});

	it('creates no queue when the explicit opt-out runs without the SDK', () => {
		optOutOptimizely();
		expect(window.optimizely).toBeUndefined();
	});

	it('supports SSR without browser globals', () => {
		vi.stubGlobal('window', undefined);
		expect(() => optimizelyWeb({ projectId: '12345678' })).not.toThrow();
		expect(() => optOutOptimizely()).not.toThrow();
	});
});
