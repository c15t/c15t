/**
 * The contract's no-per-call-allocation rule, stated as an identity test on the
 * client the boundary builds.
 */

import { createConsentClient } from '@c15t/react-native';
import { describe, expect, it } from 'vitest';

import { ensureReactGlobalForDist } from '../support/ensure-react-global';
import { installBenchNativeModule } from '../support/fake-native';
import { buildSnapshot } from '../support/fixtures';
import {
	NativeEventEmitter,
	resetNativeStub,
	setNativeModule,
} from '../support/react-native-stub';

ensureReactGlobalForDist();
resetNativeStub();

const native = installBenchNativeModule(
	'C15t',
	setNativeModule,
	buildSnapshot()
);

const client = createConsentClient(
	native as never,
	{
		addListener: (eventName: string, listener: (payload: unknown) => void) =>
			new NativeEventEmitter(native).addListener(eventName, listener),
	} as never
);

describe('getSnapshot', () => {
	it('returns the same object on every read', () => {
		const first = client.getSnapshot();
		for (let index = 0; index < 100; index += 1) {
			expect(client.getSnapshot()).toBe(first);
		}
	});

	it('does not cross into native to answer a read', () => {
		const before = native.snapshotCalls;
		client.getSnapshot();
		expect(native.snapshotCalls).toBe(before);
	});
});
