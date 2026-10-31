import { afterEach, expect, test, vi } from 'vitest';

import { flushPromises } from '../../__tests__/helpers/fake-native';
import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentWidget } from '../consent-widget';
import { mountSurface, requireRole, tap, translatedSnapshot } from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

test('the widget saves its draft without a modal, then notifies its host', async () => {
	const onSave = vi.fn();
	const tree = mountSurface(
		<ConsentWidget onSave={onSave} />,
		translatedSnapshot({ promptRequirement: { kind: 'none' } })
	);
	expect(tree.container().querySelector('[role="dialog"]')).toBeNull();
	tap(requireRole(tree.container(), 'switch', 'Werbung'));
	expect(onSave).not.toHaveBeenCalled();
	tap(requireRole(tree.container(), 'button', 'Speichern'));
	await flushPromises();
	expect(JSON.parse(tree.fake.commitIntents[0] ?? '{}')).toMatchObject({
		action: 'explicit',
		consents: { marketing: true },
	});
	expect(onSave).toHaveBeenCalledTimes(1);
	tree.unmount();
});

test('a failed widget save retains the draft and never notifies its host', async () => {
	const onSave = vi.fn();
	const tree = mountSurface(<ConsentWidget onSave={onSave} />);
	tree.fake.failCommitWith('unavailable');
	tap(requireRole(tree.container(), 'switch', 'Werbung'));
	tap(requireRole(tree.container(), 'button', 'Speichern'));
	await flushPromises();
	expect(
		requireRole(tree.container(), 'switch', 'Werbung').getAttribute(
			'aria-checked'
		)
	).toBe('true');
	expect(onSave).not.toHaveBeenCalled();
	tree.unmount();
});
