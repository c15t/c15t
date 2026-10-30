/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLiveVendorProbeConfig } from './vendors';

const runtimeCheck = () =>
	getLiveVendorProbeConfig('default-com')?.runtimeCheck?.();

const installedPixel = () => ({
	consent: { analytics: true, marketing: true },
	consentSetterInstalled: true,
	q: [],
	setConsent: vi.fn(),
});

describe('Default Pixel runtime probe', () => {
	afterEach(() => {
		delete window.__defaultPixel__;
	});

	it('accepts installed consent state without inspecting the setter source', () => {
		const pixel = installedPixel();
		window.__defaultPixel__ = pixel;

		expect(runtimeCheck()?.ok).toBe(true);
		expect(pixel.setConsent).not.toHaveBeenCalled();
	});

	it.each([
		['missing installation marker', { consentSetterInstalled: undefined }],
		['uninstalled setter', { consentSetterInstalled: false }],
		['missing setter', { setConsent: undefined }],
		[
			'undrained queue',
			{ q: [['setConsent', { analytics: true, marketing: true }]] },
		],
		['missing queue', { q: undefined }],
		['missing consent state', { consent: undefined }],
		['analytics denied', { consent: { analytics: false, marketing: true } }],
		['marketing denied', { consent: { analytics: true, marketing: false } }],
	])('rejects %s', (_label, overrides) => {
		window.__defaultPixel__ = { ...installedPixel(), ...overrides };

		expect(runtimeCheck()?.ok).toBe(false);
	});
});
