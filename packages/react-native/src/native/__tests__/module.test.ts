/**
 * The bridge lookup: a usable module when the binary has one, and a diagnosis
 * that names the cause when it does not.
 *
 * `react-native` resolves to the faithful stub in this package's Vitest config,
 * so the production lookup path is what runs here.
 */

import { beforeEach, describe, expect, test } from 'vitest';

import {
	buildSnapshot,
	captureErrorMessage,
	flush,
} from '../../__tests__/helpers/fake-native';
import {
	emitNativeEvent,
	nativeListenerCount,
	resetNativeStub,
	setNativeModule,
	setRegistryThrows,
} from '../../__tests__/helpers/react-native-stub';
import { NATIVE_C15T_MODULE_NAME } from '../../protocol';
import {
	getNativeC15t,
	getNativeC15tEvents,
	hasNativeC15tSurface,
	NativeC15tUnavailableError,
} from '../module';

describe('getNativeC15t', () => {
	beforeEach(() => {
		resetNativeStub();
	});

	test('returns the registered module', () => {
		const fake = { getBootstrap: () => '', getSnapshot: () => '' };

		setNativeModule(NATIVE_C15T_MODULE_NAME, fake);

		expect(getNativeC15t()).toBe(fake);
	});

	test('names the causes when no module is registered', () => {
		const message = captureErrorMessage(getNativeC15t);

		expect(captureErrorMessage(getNativeC15t)).toContain('"C15t"');
		expect(message).toContain('Expo Go');
		expect(message).toContain('pod install');
		expect(message).toContain('JavaScript-only update');
	});

	test('throws its own error type for a missing module', () => {
		expect(() => getNativeC15t()).toThrow(NativeC15tUnavailableError);
	});

	test('wraps a registry that invariants rather than returning null', () => {
		// A build with the New Architecture off fails the lookup this way, so
		// the diagnosis still has to come from this package.
		setRegistryThrows(true);

		expect(captureErrorMessage(getNativeC15t)).toContain(
			'the TurboModule registry refused the lookup'
		);
	});
});

describe('hasNativeC15tSurface', () => {
	test('accepts a module with the synchronous reads', () => {
		expect(
			hasNativeC15tSurface({
				commit: () => Promise.resolve(''),
				getBootstrap: () => '',
				getSnapshot: () => '',
			} as never)
		).toBe(true);
	});

	test('rejects a module built against another protocol', () => {
		expect(hasNativeC15tSurface({ getBootstrap: () => '' } as never)).toBe(
			false
		);
	});
});

describe('getNativeC15tEvents', () => {
	beforeEach(() => {
		resetNativeStub();
	});

	test('rejects a half-built native binding', () => {
		setNativeModule(NATIVE_C15T_MODULE_NAME, {
			getBootstrap: () => '',
			getSnapshot: () => '',
		});

		expect(captureErrorMessage(getNativeC15tEvents)).toContain(
			'missing getBootstrap, getSnapshot, or commit'
		);
	});

	test('delivers every event payload as JSON text', () => {
		setNativeModule(NATIVE_C15T_MODULE_NAME, {
			commit: () => Promise.resolve(''),
			getBootstrap: () => '',
			getSnapshot: () => JSON.stringify(buildSnapshot()),
		});

		const events = getNativeC15tEvents();
		const received: string[] = [];

		const subscription = events.addListener('snapshot', (payload) => {
			received.push(payload);
		});

		expect(nativeListenerCount('snapshot')).toBe(1);

		// iOS sends the JSON string the contract specifies; an Android core may
		// hand over a dictionary instead. Both have to arrive as text.
		flush(() => {
			emitNativeEvent('snapshot', '{"revision":3}');
			emitNativeEvent('snapshot', { revision: 4 });
			emitNativeEvent('snapshot', undefined);
		});

		subscription.remove();

		expect(nativeListenerCount('snapshot')).toBe(0);
		expect(received).toEqual(['{"revision":3}', '{"revision":4}', '{}']);
	});
});
