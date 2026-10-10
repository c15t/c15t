/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { vercelSpeedInsights } from './vendors/analytics/vercel-speed-insights';
import type { VercelSpeedInsightsBeforeSend } from './vendors/analytics/vercel-speed-insights';

type SpeedInsightsWindow = Window & {
	si?: (action: string, handler: VercelSpeedInsightsBeforeSend) => void;
	siq?: [string, VercelSpeedInsightsBeforeSend][];
	sil?: boolean;
};

const event = {
	type: 'vital',
	url: 'https://example.com/',
} as const;

describe('Vercel Speed Insights loader contract', () => {
	registerVendorContractCleanup();

	it('gates reports on measurement through grant, revoke and a new grant', () => {
		const appended: HTMLScriptElement[] = [];
		let beforeSend: VercelSpeedInsightsBeforeSend | undefined;

		// Mirrors script.js: it starts once per page, guarded by `window.sil`,
		// then swaps the `si` stub for a setter and replays `siq`.
		installHeadProbe((node, win) => {
			if (!node.src.includes('/v1/speed-insights/script.js')) {
				return;
			}
			appended.push(node);
			const siWindow = win as SpeedInsightsWindow;
			if (siWindow.sil) {
				return;
			}
			siWindow.sil = true;
			siWindow.si = (action, handler) => {
				if (action === 'beforeSend') {
					beforeSend = handler;
				}
			};
			for (const [action, handler] of siWindow.siq ?? []) {
				siWindow.si(action, handler);
			}
		});

		const scripts = [vercelSpeedInsights({ sampleRate: 0.5 })];
		loadScripts(scripts, deniedConsents);
		expect(appended).toHaveLength(0);
		expect((window as SpeedInsightsWindow).siq).toBeUndefined();

		updateScripts(scripts, grantedMeasurementConsents);
		expect(appended).toHaveLength(1);
		expect(appended[0]?.defer).toBe(true);
		expect(appended[0]?.getAttribute('data-sdkn')).toBe('c15t');
		expect(appended[0]?.getAttribute('data-sample-rate')).toBe('0.5');
		expect(beforeSend?.(event)).toEqual(event);

		updateScripts(scripts, deniedConsents);
		expect(appended[0]?.isConnected).toBe(false);
		expect(beforeSend?.(event)).toBeNull();

		// An unrelated category change keeps reports dropped.
		updateScripts(scripts, grantedMarketingConsents);
		expect(beforeSend?.(event)).toBeNull();

		updateScripts(scripts, grantedMeasurementConsents);
		expect(appended).toHaveLength(2);
		expect(beforeSend?.(event)).toEqual(event);
	});
});
