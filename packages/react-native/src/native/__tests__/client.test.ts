/**
 * The client's two promises: the bridge is crossed only when something
 * changed, and a subscriber only hears about a change it can see.
 *
 * `react-native` resolves to the faithful stub in this package's Vitest
 * config, so `getNativeC15tEvents()` builds over the registered fake exactly
 * as it does over the Swift and Kotlin modules.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	buildSnapshot,
	captureError,
	captureErrorMessage,
	createFakeNativeModule,
	FAKE_BOOTSTRAP,
} from '../../__tests__/helpers/fake-native';
import type { FakeNativeModule } from '../../__tests__/helpers/fake-native';
import {
	emitNativeEvent,
	nativeListenerCount,
	resetNativeStub,
} from '../../__tests__/helpers/react-native-stub';
import { shallowEqual } from '../../lib/selectors';
import type { ConsentSnapshot } from '../../protocol';
import { NativeBridgeError } from '../bridge-error';
import {
	createConsentClient,
	getConsentClient,
	resetConsentClient,
} from '../client';
import type { ConsentClient } from '../client';
import { getNativeC15tEvents } from '../module';
import { C15tProtocolMismatchError } from '../protocol-mismatch-error';

/** Build a client over a fresh fake module. */
const makeClient = function makeClient(
	options: {
		readonly snapshot?: ConsentSnapshot;
		readonly bootstrap?: unknown;
	} = {}
): { client: ConsentClient; fake: FakeNativeModule } {
	const fake = createFakeNativeModule(options);

	return { client: createConsentClient(fake, getNativeC15tEvents()), fake };
};

/** Watch one snapshot field, and report how often the client calls back. */
const watch = function watch<ResultType>(
	client: ConsentClient,
	selector: (snapshot: ConsentSnapshot) => ResultType,
	equals?: (current: ResultType, next: ResultType) => boolean
): { calls: () => number; stop: () => void } {
	const listener = vi.fn();

	const stop = client.subscribe(selector, listener, equals);

	listener.mockClear();

	return { calls: () => listener.mock.calls.length, stop };
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('handshake', () => {
	test('reads the bootstrap payload once per app', () => {
		const fake = createFakeNativeModule();

		const client = getConsentClient();

		expect(client.bootstrap.protocolVersion).toBe(1);
		expect(client.bootstrap.nativeSdkVersion).toBe('rn->9.9.9');
		expect(getConsentClient()).toBe(client);
		expect(fake.bootstrapCalls).toBe(1);
	});

	test('rejects a native build ahead of this bundle', () => {
		createFakeNativeModule({
			bootstrap: { ...FAKE_BOOTSTRAP, protocolVersion: 99 },
		});

		const message = captureErrorMessage(getConsentClient);

		expect(message).toContain('protocol 99');
		expect(message).toMatch(/supports 1 to 1/u);
	});

	test('reports the offending version on the error', () => {
		createFakeNativeModule({
			bootstrap: { ...FAKE_BOOTSTRAP, protocolVersion: 99 },
		});

		const error = captureError(getConsentClient);

		expect(error).toBeInstanceOf(C15tProtocolMismatchError);
		expect(error.protocolVersion).toBe(99);
	});

	test('reports no version when native omits the field', () => {
		createFakeNativeModule({ bootstrap: { nativeSdkVersion: 'rn->1.0.0' } });

		const error = captureError(getConsentClient);

		expect(error).toBeInstanceOf(C15tProtocolMismatchError);
		expect(error.protocolVersion).toBeNull();
	});

	test('rejects a native build behind this bundle', () => {
		createFakeNativeModule({
			bootstrap: { ...FAKE_BOOTSTRAP, protocolVersion: 0 },
		});

		expect(() => getConsentClient()).toThrow(/protocol 0/u);
	});

	test('rejects a build that reports no protocol at all', () => {
		createFakeNativeModule({
			bootstrap: { nativeSdkVersion: 'rn->1.0.0' },
		});

		expect(() => getConsentClient()).toThrow(/no protocolVersion/u);
	});

	test('rejects a bootstrap payload that is not JSON', () => {
		const fake = createFakeNativeModule();

		fake.getBootstrap.mockReturnValue('not-json');

		expect(() => createConsentClient(fake, getNativeC15tEvents())).toThrow(
			NativeBridgeError
		);
	});
});

describe('snapshot reads', () => {
	test('serves one immutable object and stops asking native', () => {
		const { client, fake } = makeClient();

		const first = client.getSnapshot();

		expect(first.revision).toBe(0);

		const calls = fake.snapshotCalls;

		for (let index = 0; index < 10; index += 1) {
			expect(client.getSnapshot()).toBe(first);
		}

		expect(fake.snapshotCalls).toBe(calls);
	});

	test('does not pull for a revision it already holds', () => {
		const { client, fake } = makeClient();

		client.getSnapshot();

		const calls = fake.snapshotCalls;

		emitNativeEvent('snapshot', JSON.stringify({ revision: 0 }));

		expect(fake.snapshotCalls).toBe(calls);
		expect(client.getSnapshot()).toBe(client.getSnapshot());
	});

	test('pulls once when native reports a newer revision', () => {
		const { client, fake } = makeClient();
		const sub = watch(client, (snapshot) => snapshot.revision);

		client.getSnapshot();

		const calls = fake.snapshotCalls;

		fake.pushSnapshot(buildSnapshot({ revision: 7 }));

		expect(fake.snapshotCalls).toBe(calls + 1);
		expect(client.getSnapshot().revision).toBe(7);
		expect(sub.calls()).toBe(1);

		sub.stop();
	});

	test('costs no bridge read while nothing is mounted', () => {
		const { client, fake } = makeClient();

		client.getSnapshot();

		const calls = fake.snapshotCalls;

		// No subscriber, so the event only records that state moved.
		fake.pushSnapshot(buildSnapshot({ revision: 8 }));

		expect(fake.snapshotCalls).toBe(calls);
		// The next read notices the state moved while nobody was listening.
		expect(client.getSnapshot().revision).toBe(8);
	});

	test('keeps one native listener for the life of the client', () => {
		const { client } = makeClient();

		expect(nativeListenerCount('snapshot')).toBe(1);

		const stop = client.subscribe(
			(snapshot) => snapshot.revision,
			() => {}
		);

		stop();

		// Dropping the last subscriber must not detach the listener: a read made
		// after a native-only change has to see the change.
		expect(nativeListenerCount('snapshot')).toBe(1);

		client.dispose();

		expect(nativeListenerCount('snapshot')).toBe(0);
	});

	test('resubscribing does not cross the bridge again', () => {
		const { client, fake } = makeClient();

		client.getSnapshot();

		const calls = fake.snapshotCalls;

		const stop = client.subscribe(
			(snapshot) => snapshot.revision,
			() => {}
		);

		stop();
		client.subscribe(
			(snapshot) => snapshot.revision,
			() => {}
		);

		expect(fake.snapshotCalls).toBe(calls);
	});

	test('fails closed on a snapshot it cannot read', () => {
		const { client, fake } = makeClient();

		fake.pushUnreadableSnapshot('{"revision":"seven"}');

		const snapshot = client.getSnapshot();

		expect(snapshot.ready).toBe(false);
		expect(snapshot.policyPending).toBe(true);
		expect(snapshot.error?.code).toBe('invalid-native-snapshot');
		expect(snapshot.effectivePermissions.necessary).toBe(true);
		expect(snapshot.effectivePermissions.marketing).toBe(false);
	});

	test('keeps the last readable snapshot when a later one breaks', () => {
		const { client, fake } = makeClient();

		const good = client.getSnapshot();

		fake.pushUnreadableSnapshot('not json at all');

		expect(client.getSnapshot()).toBe(good);
	});
});

describe('wire drift', () => {
	/**
	 * A snapshot whose bridge JSON moved one of the keys the kernel owns the name of.
	 * This is the shape the Android bridge shipped with, and nothing about it throws.
	 */
	const drifted = function drifted(): ConsentSnapshot {
		return {
			...buildSnapshot(),
			location: { country: 'DE', region: null },
		} as unknown as ConsentSnapshot;
	};

	/** Record the warnings the client writes, without letting them fill the report. */
	const captureWarnings = function captureWarnings() {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		return {
			problems: () =>
				warn.mock.calls.map((call) => call[1] as unknown as readonly string[]),
			restore: () => warn.mockRestore(),
			warn,
		};
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('names a key the native bridge renamed', () => {
		const warnings = captureWarnings();
		const { client } = makeClient({ snapshot: drifted() });

		client.getSnapshot();

		expect(warnings.warn).toHaveBeenCalledTimes(1);

		const [message, problems] = warnings.warn.mock.calls[0] as [
			string,
			readonly string[],
		];

		expect(message).toContain(
			'does not use the key names this package declares'
		);
		expect(problems).toContain(
			'location.countryCode: required here, absent from the payload'
		);
		expect(problems).toContain(
			'location.country: the kernel owns these key names and does not use "country" here'
		);
	});

	test('warns once while the same broken snapshot stays current', () => {
		const warnings = captureWarnings();
		const { client } = makeClient({ snapshot: drifted() });

		client.getSnapshot();
		client.getSnapshot();
		client.isAllowed('marketing');

		expect(warnings.warn).toHaveBeenCalledTimes(1);
	});

	test('says nothing about a field this bundle does not know yet', () => {
		// The contract lets a newer native core add a key. Warning there would tell
		// every app that upgraded its native half that something is broken.
		const warnings = captureWarnings();
		const added = {
			...buildSnapshot(),
			tenantId: 'ten_1',
		} as unknown as ConsentSnapshot;

		const { client } = makeClient({ snapshot: added });
		client.getSnapshot();

		expect(warnings.warn).not.toHaveBeenCalled();
	});

	test('stays quiet in a production bundle', () => {
		const warnings = captureWarnings();
		const previous = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		try {
			const { client } = makeClient({ snapshot: drifted() });
			client.getSnapshot();
		} finally {
			process.env.NODE_ENV = previous;
		}

		expect(warnings.warn).not.toHaveBeenCalled();
	});

	test('reports a snapshot it can read but not one it cannot', () => {
		// The fail-closed path already has its own message, and a payload that is not
		// a JSON object has no keys to name.
		const warnings = captureWarnings();
		const { client, fake } = makeClient();

		fake.pushUnreadableSnapshot('not json at all');

		expect(client.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(warnings.warn).not.toHaveBeenCalled();
	});
});

describe('subscriptions', () => {
	test('notifies only the subscriber whose slice moved', () => {
		const { client, fake } = makeClient();

		const marketing = watch(
			client,
			(snapshot) => snapshot.effectivePermissions.marketing
		);
		const measurement = watch(
			client,
			(snapshot) => snapshot.effectivePermissions.measurement
		);

		fake.pushSnapshot(
			buildSnapshot({
				effectivePermissions: {
					experience: false,
					functionality: true,
					marketing: false,
					measurement: true,
					necessary: true,
				},
				revision: 3,
			})
		);

		expect(marketing.calls()).toBe(0);
		expect(measurement.calls()).toBe(1);

		marketing.stop();
		measurement.stop();
	});

	test('notifies once per change and re-seeds after a resubscribe', () => {
		const { client, fake } = makeClient();
		const ready = watch(client, (snapshot) => snapshot.ready);

		fake.pushSnapshot(buildSnapshot({ ready: false, revision: 4 }));
		fake.pushSnapshot(buildSnapshot({ ready: false, revision: 5 }));

		expect(ready.calls()).toBe(1);

		ready.stop();

		const second = watch(client, (snapshot) => snapshot.ready);

		expect(second.calls()).toBe(0);

		second.stop();
	});

	test('honours a custom equality for a derived object', () => {
		const { client, fake } = makeClient();
		const derived = watch(
			client,
			(snapshot) => ({ ready: snapshot.ready }),
			shallowEqual
		);

		// A fresh object every event, but the same fields, so nothing is notified.
		fake.pushSnapshot(buildSnapshot({ ready: true, revision: 6 }));
		fake.pushSnapshot(buildSnapshot({ ready: true, revision: 7 }));

		expect(derived.calls()).toBe(0);

		derived.stop();
	});

	test('treats the initialized and error events as state changes', () => {
		const { client, fake } = makeClient();
		const errors = watch(client, (snapshot) => snapshot.error?.code ?? null);

		fake.getSnapshot.mockReturnValue(
			JSON.stringify(
				buildSnapshot({
					error: { code: 'transport', message: 'offline' },
					revision: 9,
				})
			)
		);

		emitNativeEvent('initialized', JSON.stringify({ revision: 9 }));

		expect(errors.calls()).toBe(1);

		emitNativeEvent(
			'error',
			JSON.stringify({ code: 'unsupported-contract', message: 'no' })
		);

		expect(client.getSnapshot().error?.code).toBe('transport');

		errors.stop();
	});

	/**
	 * `native/CONTRACT.md` "Revisions and error writes": an error is snapshot state,
	 * so a core that records one has committed a change and must announce it on a new
	 * revision. `native/protocol/revision-trace-error-writes.json` pins that both
	 * native cores publish the refused-contract write; this pins the other half, that
	 * a revision-bearing snapshot event is enough for JavaScript to learn it. The
	 * paired `error` event is deliberately absent here: it is a convenience, and the
	 * client must not need it.
	 */
	test('learns an unsupported-contract error from the snapshot event alone', () => {
		const { client, fake } = makeClient();
		const codes = watch(client, (snapshot) => snapshot.error?.code ?? null);

		// The iOS core's shape after a refused contract: deny-all, policy still
		// pending, the error recorded, and a revision bumped by the write.
		fake.getSnapshot.mockReturnValue(
			JSON.stringify(
				buildSnapshot({
					effectivePermissions: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
					error: {
						code: 'unsupported-contract',
						message: 'backend declares policy contract 2',
					},
					policyPending: true,
					revision: 4,
				})
			)
		);

		emitNativeEvent('snapshot', JSON.stringify({ revision: 4 }));

		expect(codes.calls()).toBe(1);
		expect(client.getSnapshot().error?.code).toBe('unsupported-contract');

		codes.stop();
	});
});

describe('actions', () => {
	test('forwards a commit exactly once and reconciles the snapshot', async () => {
		const { client, fake } = makeClient();

		fake.failCommitWith(
			JSON.stringify({
				confirmed: ['marketing'],
				ok: true,
				queued: false,
				revision: 12,
				subjectId: 'sub-1',
			})
		);

		const result = await client.commit({ action: 'all' });

		expect(fake.commit).toHaveBeenCalledTimes(1);
		expect(fake.commitIntents).toEqual(['{"action":"all"}']);
		expect(result).toEqual({
			confirmed: ['marketing'],
			ok: true,
			queued: false,
			revision: 12,
			subjectId: 'sub-1',
		});
	});

	test('pulls the new snapshot when the commit advanced state', async () => {
		const { client, fake } = makeClient();
		const marketing = watch(
			client,
			(snapshot) => snapshot.effectivePermissions.marketing
		);

		fake.getSnapshot.mockReturnValue(
			JSON.stringify(
				buildSnapshot({
					effectivePermissions: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					},
					revision: 20,
				})
			)
		);

		await client.commit({ action: 'all' });

		expect(marketing.calls()).toBe(1);
		expect(client.getSnapshot().effectivePermissions.marketing).toBe(true);

		marketing.stop();
	});

	test('does not notify a subscriber when the commit changed nothing it reads', async () => {
		const { client } = makeClient();
		const marketing = watch(
			client,
			(snapshot) => snapshot.effectivePermissions.marketing
		);

		await client.commit({ action: 'necessary' });

		expect(marketing.calls()).toBe(0);

		marketing.stop();
	});

	test('rejects a commit reply that is not a result', async () => {
		const { client, fake } = makeClient();

		fake.failCommitWith('ok');

		await expect(client.commit({ action: 'all' })).rejects.toThrow(
			NativeBridgeError
		);
	});

	test('forwards every other native call', async () => {
		const { client, fake } = makeClient();
		const ready = watch(client, (snapshot) => snapshot.ready);

		client.dismissNotice();
		await client.refresh();
		await client.identify('user-42');
		await client.logout();
		await client.setOverrides({ country: 'FR', language: 'fr' });

		expect(fake.dismissCalls).toBe(1);
		expect(fake.refreshCalls).toBe(1);
		expect(fake.identifyCalls).toEqual(['user-42']);
		expect(fake.logoutCalls).toBe(1);
		expect(fake.overrideCalls).toEqual(['{"country":"FR","language":"fr"}']);
		// None of them moved `ready`, so the subscriber stayed quiet.
		expect(ready.calls()).toBe(0);

		ready.stop();
	});
});

describe('isAllowed', () => {
	test('reads permissions off the snapshot, denying while pending', () => {
		const { client, fake } = makeClient({
			snapshot: buildSnapshot({ policyPending: true }),
		});

		expect(client.isAllowed('necessary')).toBe(true);
		expect(client.isAllowed('functionality')).toBe(false);

		fake.pushSnapshot(buildSnapshot({ policyPending: false, revision: 2 }));

		expect(client.isAllowed('functionality')).toBe(true);
	});
});
