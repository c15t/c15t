import { createConsentRuntime } from '@c15t/core/runtime';
import { createIAB } from '@c15t/iab';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';

import AstroDialog from '../../../astro/src/components/islands/panel-surface';
import { mockGVL } from '../components/iab/__tests__/fixtures/mock-consent-state';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

test('reveals the cold Astro React IAB island when its module is ready', async () => {
	const runtime = createConsentRuntime({
		createIAB,
		iab: { cmpId: 42, gvl: mockGVL },
		mode: offline(),
		persistence: false,
		prefetch: {
			...policyFixture({}, { model: 'iab' }),
			initialIab: { cmpId: 42, enabled: true, gvl: mockGVL },
		},
	});
	runtime.start();
	runtime.kernel.set.activeUI('dialog');
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		root.render(
			<AstroDialog
				runtime={runtime}
				options={{}}
				kind="iab"
			/>
		);
		await import('../../../astro/src/components/islands/iab-dialog-surface');
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		expect(
			document.querySelector('[data-testid="iab-consent-dialog-root"]')
		).not.toBeNull();
	} finally {
		root.unmount();
		container.remove();
		runtime.dispose();
	}
});
