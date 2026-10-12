import { createConsentRuntime } from '@c15t/core/runtime';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

test('retains an external-runtime child and its draft after the IAB bridge loads', async () => {
	const runtime = createConsentRuntime({
		mode: offline(),
		persistence: false,
		prefetch: policyFixture(),
	});
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		// act() can resolve the old Suspense boundary before committing its fallback.
		root.render(
			<ConsentProvider runtime={runtime}>
				<input
					aria-label="Draft"
					defaultValue="initial"
				/>
			</ConsentProvider>
		);
		await vi.waitFor(
			() => expect(container.querySelector('input')).not.toBeNull(),
			{ interval: 5 }
		);
		const input = container.querySelector('input');
		if (!input) {
			throw new Error('Missing draft input');
		}
		input.value = 'edited';
		await import('../external-iab-context');
		// Include the delayed commit that used to replace the fallback children.
		await new Promise((resolve) => {
			setTimeout(resolve, 350);
		});
		expect(container.querySelector('input')).toBe(input);
		expect(input.value).toBe('edited');
	} finally {
		root.unmount();
		container.remove();
		runtime.dispose();
	}
});
