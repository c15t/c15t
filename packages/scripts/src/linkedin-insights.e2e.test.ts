/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMarketingConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { linkedinInsights } from './linkedin-insights';

describe('linkedinInsights contract', () => {
	registerVendorContractCleanup();

	it('boots with the required partner globals prepared before load', () => {
		let acknowledged = false;

		installHeadProbe((node, win) => {
			if (
				!node.src.includes('snap.licdn.com/li.lms-analytics/insight.min.js')
			) {
				return;
			}

			acknowledged =
				win._linkedin_partner_id === 'LI-CONTRACT' &&
				Array.isArray(win._linkedin_data_partner_ids) &&
				win._linkedin_data_partner_ids.includes('LI-CONTRACT') &&
				typeof win.lintrk === 'function' &&
				Array.isArray(win.lintrk.q) &&
				win.lintrk.q.length === 0;

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...linkedinInsights({ id: 'LI-CONTRACT' }),
					id: 'linkedin-insights-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(acknowledged).toBe(true);
	});
});
