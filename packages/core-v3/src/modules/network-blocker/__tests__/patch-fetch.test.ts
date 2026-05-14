/**
 * @vitest-environment jsdom
 */
import { describe, expect, test, vi } from 'vitest';
import { createConsentKernel } from '../../../kernel';
import { installFetchPatch } from '../patch-fetch';
import type { NetworkBlockerRule } from '../types';

const rule: NetworkBlockerRule = {
	id: 'r',
	domain: 'tracker.example',
	category: 'marketing',
};

describe('installFetchPatch', () => {
	test('returns 451 Response when blocked', async () => {
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as typeof window.fetch;

		const kernel = createConsentKernel();
		const notifyBlocked = vi.fn();
		const uninstall = installFetchPatch({
			getRules: () => [rule],
			getSnapshot: () => kernel.getSnapshot(),
			isEnabled: () => true,
			notifyBlocked,
		});

		const response = await window.fetch('https://tracker.example/');
		expect(response.status).toBe(451);
		expect(original).not.toHaveBeenCalled();
		expect(notifyBlocked).toHaveBeenCalledOnce();

		uninstall();
	});

	test('passes through when isEnabled is false', async () => {
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as typeof window.fetch;

		const kernel = createConsentKernel();
		const uninstall = installFetchPatch({
			getRules: () => [rule],
			getSnapshot: () => kernel.getSnapshot(),
			isEnabled: () => false,
			notifyBlocked: () => {},
		});

		await window.fetch('https://tracker.example/');
		expect(original).toHaveBeenCalledOnce();

		uninstall();
	});

	test('passes through when no rule matches', async () => {
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as typeof window.fetch;

		const kernel = createConsentKernel();
		const uninstall = installFetchPatch({
			getRules: () => [rule],
			getSnapshot: () => kernel.getSnapshot(),
			isEnabled: () => true,
			notifyBlocked: () => {},
		});

		await window.fetch('https://allowed.example/');
		expect(original).toHaveBeenCalledOnce();

		uninstall();
	});

	test('uninstall restores fetch so subsequent calls hit the original', async () => {
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as typeof window.fetch;

		const kernel = createConsentKernel();
		const uninstall = installFetchPatch({
			getRules: () => [rule],
			getSnapshot: () => kernel.getSnapshot(),
			isEnabled: () => true,
			notifyBlocked: () => {},
		});
		uninstall();

		// After uninstall, blocked URLs should pass through to the
		// original (no longer 451-rejected by our patched fn).
		const response = await window.fetch('https://tracker.example/');
		expect(response.status).toBe(200);
		expect(original).toHaveBeenCalledOnce();
	});
});
