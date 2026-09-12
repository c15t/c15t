/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	isArgumentsPayload,
	loadScripts,
	registerVendorContractCleanup,
	toArgs,
	updateScripts,
} from './e2e-test-utils';
import { openaiPixel } from './vendors/ads-and-pixels/openai-pixel';

const pixelId = 'FZfHJsmuTCvv8LyoCnzMuh';
type OaiqStub = ((...args: unknown[]) => void) & { q?: unknown[] };
const getOaiq = function getOaiq(): OaiqStub | undefined {
	return (window as Window & { oaiq?: OaiqStub }).oaiq;
};

describe('openaiPixel loader contract', () => {
	registerVendorContractCleanup();

	it('loads only with marketing consent and preserves the SDK across consent changes', () => {
		const runtime = vi.fn();
		let loads = 0;
		let queue: unknown[] = [];
		installHeadProbe((node) => {
			loads += 1;
			queue = getOaiq()?.q ?? [];
			Reflect.set(window, 'oaiq', runtime);
			node.dispatchEvent(new Event('load'));
		});
		const scripts = [openaiPixel({ debug: true, pixelId })];

		expect(loadScripts(scripts, deniedConsents)).toEqual([]);
		expect(loadScripts(scripts, grantedMeasurementConsents)).toEqual([]);
		expect(loads).toBe(0);
		expect(getOaiq()).toBeUndefined();

		expect(loadScripts(scripts, grantedMarketingConsents)).toEqual([
			'openai-pixel',
		]);
		expect(queue.every(isArgumentsPayload)).toBe(true);
		expect(queue.map(toArgs)).toEqual([
			['consent', false],
			['init', { debug: true, pixelId }],
			['consent', true],
		]);
		runtime.mockClear();

		updateScripts(scripts, deniedConsents);
		expect(runtime).toHaveBeenLastCalledWith('consent', false);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		updateScripts(scripts, grantedMarketingConsents);
		expect(runtime).toHaveBeenLastCalledWith('consent', true);
		expect(loads).toBe(1);
		expect(runtime.mock.calls.some(([command]) => command === 'init')).toBe(
			false
		);
	});

	it('queues withdrawal while the SDK is still downloading', () => {
		let scriptElement: HTMLScriptElement | undefined;
		installHeadProbe((node) => {
			scriptElement = node;
		});
		const scripts = [openaiPixel({ pixelId })];
		loadScripts(scripts, grantedMarketingConsents);
		updateScripts(scripts, deniedConsents);
		scriptElement?.dispatchEvent(new Event('load'));

		const stub = getOaiq();
		expect(typeof stub).toBe('function');
		expect(stub?.q?.map(toArgs).at(-1)).toEqual(['consent', false]);
	});
});
