/** @vitest-environment node */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { describe, expect, it, vi } from 'vitest';

import { activeCampaignTracking } from './vendors/email-and-sms/activecampaign';

describe('ActiveCampaign without a document', () => {
	it.each(['dispose', 'replace'] as const)(
		'cleans up without callback errors on %s',
		(action) => {
			expect(typeof document).toBe('undefined');
			const kernel = createConsentKernel();
			const onDebug = vi.fn();
			const loader = createScriptLoader({
				kernel,
				onDebug,
				scripts: [activeCampaignTracking({ accountId: '123456' })],
			});
			try {
				if (action === 'replace') {
					loader.updateScripts([
						activeCampaignTracking({ accountId: '654321' }),
					]);
				} else {
					loader.dispose();
				}
				expect(onDebug).toHaveBeenCalledWith(
					expect.objectContaining({
						action: 'callback_invoked',
						callback: 'onDispose',
						scriptId: 'activecampaign',
					})
				);
				expect(onDebug).not.toHaveBeenCalledWith(
					expect.objectContaining({ action: 'callback_error' })
				);
				expect(loader.getLoadedScriptIds()).toEqual([]);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);
});
