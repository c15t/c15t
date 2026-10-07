/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { createCMPApi } from '../tcf/cmp-api';
import { generateTCString } from '../tcf/tc-string';
import { completeGVL } from './fixtures/gvl-sample';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
});

test.each(['replacement', 'withdrawal'] as const)(
	'notifies listeners of a TC string %s while the dialog is visible',
	async (change) => {
		const accepted = await generateTCString(
			{
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorConsents: { '1': true },
				vendorLegitimateInterests: {},
				vendorsDisclosed: { '1': true },
			},
			completeGVL,
			{ cmpId: 28 }
		);
		const rejected = await generateTCString(
			{
				purposeConsents: {},
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorConsents: {},
				vendorLegitimateInterests: {},
				vendorsDisclosed: { '1': true },
			},
			completeGVL,
			{ cmpId: 28 }
		);
		const api = createCMPApi({ cmpId: 28, gvl: completeGVL });
		disposers.push(api.destroy);
		api.updateConsent(accepted);
		api.setDisplayStatus('visible');
		const listener = vi.fn();
		window.__tcfapi?.('addEventListener', 2, listener);
		await vi.waitFor(() =>
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					eventStatus: 'cmpuishown',
					tcString: accepted,
				}),
				true
			)
		);
		listener.mockClear();

		const nextString = change === 'replacement' ? rejected : '';
		api.updateConsent(nextString);
		await vi.waitFor(() =>
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					eventStatus: change === 'replacement' ? 'cmpuishown' : undefined,
					purpose: expect.objectContaining({ consents: {} }),
					tcString: nextString,
					vendor: expect.objectContaining({ consents: {} }),
				}),
				true
			)
		);
	}
);
