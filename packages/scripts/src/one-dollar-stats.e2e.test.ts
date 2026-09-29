/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { oneDollarStats } from './vendors/analytics/one-dollar-stats';

describe('OneDollarStats loader contract', () => {
	registerVendorContractCleanup();

	it('waits for measurement consent and sets classic script attributes before append', () => {
		let appended: HTMLScriptElement | undefined;
		installHeadProbe((node) => {
			if (!node.src.includes('assets.onedollarstats.com/stonks.js')) return;
			appended = node;
			expect(node.type).not.toBe('module');
			expect(node.defer).toBe(true);
			expect(node.getAttribute('data-hostname')).toBe('docs.example.com');
			expect(node.getAttribute('data-devmode')).toBe('true');
			expect(node.getAttribute('data-autocollect')).toBe('false');
			expect(node.hasAttribute('data-hash-routing')).toBe(false);
			node.dispatchEvent(new Event('load'));
		});

		const scripts = [
			oneDollarStats({
				hostname: 'docs.example.com',
				devmode: 'true',
				autocollect: 'false',
				'hash-routing': 'false',
			}),
		];
		const scriptIdMap: Record<string, string> = {};
		loadScripts(scripts, deniedConsents, scriptIdMap);
		expect(appended).toBeUndefined();

		updateScripts(scripts, grantedMeasurementConsents, scriptIdMap);
		expect(appended).toBeDefined();
		expect(appended?.isConnected).toBe(true);

		updateScripts(scripts, deniedConsents, scriptIdMap);
		expect(appended?.isConnected).toBe(false);
	});
});
