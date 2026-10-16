import { afterEach, expect, test } from 'vitest';

import { App } from '../../../../../internals/fixtures/react-native-bare/src/app';
import { AppearanceProvider } from '../../../../../internals/fixtures/react-native-bare/src/appearance';
import { flush, flushPromises } from '../../__tests__/helpers/fake-native';
import {
	linking,
	resetNativeStub,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { mountSurface, requireRole, tap } from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

test('the dismiss deep link leaves an unanswered IAB banner visible', async () => {
	const tree = mountSurface(
		<AppearanceProvider>
			<App />
		</AppearanceProvider>
	);
	tap(requireRole(tree.container(), 'button', 'IAB'));
	await flushPromises();
	const banner = () =>
		tree.container().querySelector('[data-testid="c15t-iab-banner"]');
	expect(banner()).not.toBeNull();
	flush(() => {
		for (const listener of linking.listeners) {
			listener({ url: 'c15t-demo://dismiss' });
		}
	});
	await flushPromises();
	expect(banner()).not.toBeNull();
	expect(tree.fake.commitIntents).toEqual([]);
	tree.unmount();
});
