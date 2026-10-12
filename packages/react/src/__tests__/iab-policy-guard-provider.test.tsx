/**
 * An `iab` policy in an app that mounts `<IABProvider>` beside the standard
 * surfaces, as the IAB guide shows. Nothing throws and the IAB banner
 * renders. `iab-policy-guard.test.tsx` covers the app without it.
 */
import { MINIMAL_GVL } from '@c15t/conformance';
import type { GlobalVendorList } from '@c15t/core';
import { custom, deferInitGvl } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { IABConsentBanner } from '../components/iab-prompt';
import { ConsentDialog } from '../components/panel';
import { ConsentBanner } from '../components/prompt';
import { IABProvider } from '../iab-context';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const GVL = MINIMAL_GVL as unknown as GlobalVendorList;
const iabPolicy = () =>
	policyFixture({}, { categories: ['marketing'], model: 'iab' });

describe('an `iab` policy with <IABProvider>', () => {
	it.each(['prefetch', 'reference'] as const)(
		'renders the IAB banner from a %s and throws nothing',
		async (source) => {
			const init = vi.fn(() =>
				Promise.resolve(
					deferInitGvl(
						{
							cmpId: 28,
							gvl: GVL,
							policyResolution: writePolicyResolutionWire(
								iabPolicy().initialPolicyResolution
							),
						} as never,
						'https://consent.example.com/gvl'
					)
				)
			);
			await render(
				<ConsentProvider
					options={{
						disableAnimation: true,
						mode: custom({ init }),
						persistence: false,
						prefetch:
							source === 'prefetch'
								? {
										...iabPolicy(),
										initialIab: { cmpId: 28, enabled: true, gvl: GVL },
									}
								: { ...iabPolicy(), initialPolicyPending: true },
					}}
				>
					<ConsentBanner />
					<ConsentDialog />
					<IABProvider cmpId={28}>
						<IABConsentBanner />
					</IABProvider>
				</ConsentProvider>
			);

			await vi.waitFor(() => {
				expect(
					document.querySelector('[data-testid="iab-consent-banner-root"]')
				).not.toBeNull();
			});
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeNull();
		}
	);
});
