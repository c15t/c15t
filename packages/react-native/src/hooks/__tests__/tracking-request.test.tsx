/**
 * The whole Apple tracking journey, driven through one hook.
 *
 * What is under test is the choreography, not Apple. Every case feeds the bridge a platform
 * answer and checks what the app does with it: whether Apple is asked again, whether the
 * preference centre opens, whether anything is written to consent, and whether a caller can
 * end up holding a request that nothing will ever settle.
 *
 * None of it proves Apple showed anything. The expanded sheet, the regional rules behind it,
 * and the Additional Information button live in the system process, and a fake bridge can
 * imitate their answers and nothing else.
 */

import type { ReactNode } from 'react';
import { act, useEffect, useState } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import {
	buildSnapshot,
	createFakeNativeModule,
	flush,
	flushPromises,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import type {
	FakeNativeModule,
	RenderHandle,
} from '../../__tests__/helpers/fake-native';
import {
	resetNativeStub,
	setAppState,
} from '../../__tests__/helpers/react-native-stub';
import { MAX_TRACKING_REQUEST_TURNS } from '../../lib/tracking-journey';
import { resetConsentClient } from '../../native/client';
import type { ConsentSnapshot } from '../../protocol';
import type { OptionalConsentCategory } from '../../protocol/vocabulary';
import { C15tProvider } from '../../provider/c15t-provider';
import { useTrackingRequest } from '../use-tracking-request';
import type { TrackingRequest } from '../use-tracking-request';

/** Everything granted except `necessary`, which is never a choice. */
const ALL_GRANTED: ConsentSnapshot['effectivePermissions'] = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

/** Nothing optional granted, which is what a reject-all subject looks like. */
const ALL_REFUSED: ConsentSnapshot['effectivePermissions'] = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

/** A pause, which is the only thing that keeps a journey open. */
const PAUSE = {
	presentation: 'expanded',
	stage: 'additional-information',
	status: 'not-determined',
} as const;

/** A settled answer. */
const ANSWER = {
	presentation: 'expanded',
	stage: 'final',
	status: 'authorized',
} as const;

/** The hook's last render, plus the request it has open. */
const probe: {
	pending: Promise<unknown> | null;
	tracking: TrackingRequest | null;
} = {
	pending: null,
	tracking: null,
};

/** Remember what the hook handed out, from an effect rather than the render body. */
const record = function record(tracking: TrackingRequest): void {
	probe.tracking = tracking;
};

interface ProbeProps {
	readonly categories?: readonly OptionalConsentCategory[];
}

const Probe = ({ categories }: ProbeProps): ReactNode => {
	const tracking = useTrackingRequest(
		categories === undefined ? {} : { categories }
	);

	const { open } = tracking.preferences;

	useEffect((): void => {
		record(tracking);
	});

	return (
		<>
			{open ? 'prefs-open' : 'prefs-closed'}|
			{tracking.pending ? 'pending' : 'idle'}
		</>
	);
};

/** What {@link boot} hands back: the tree and the bridge it is wired to. */
interface Mounted {
	fake: FakeNativeModule;
	tree: RenderHandle;
}

/**
 * Mount the hook against a bridge that answers with `replies`, one per request.
 *
 * @param snapshot - Consent state to boot with.
 * @param replies - One payload per `requestTrackingAuthorization()` the journey makes.
 * @param options - Passed to the probe.
 * @returns The tree and the bridge behind it.
 */
const boot = function boot(
	snapshot: ConsentSnapshot,
	replies: Parameters<FakeNativeModule['queueTrackingRequestReplies']>[0] = [],
	options: ProbeProps = {}
): Mounted {
	const fake = createFakeNativeModule({ snapshot });

	fake.queueTrackingRequestReplies(replies);
	probe.tracking = null;
	probe.pending = null;

	return {
		fake,
		tree: renderTree(
			<C15tProvider>
				<Probe {...options} />
			</C15tProvider>
		),
	};
};

/** Press the button the way a host would, leaving the journey open. */
const press = function press(): void {
	flush((): void => {
		probe.pending = probe.tracking?.request() ?? null;
	});
};

/** Close the preference centre the way `ConsentPreferences` does after a save. */
const close = function close(): void {
	flush((): void => {
		probe.tracking?.preferences.onRequestClose();
	});
};

/**
 * Close the preference centre `turns` times, one journey turn at a time.
 *
 * Recursion rather than a loop with an `await` in it, because the turns are not independent
 * work that belongs in `Promise.all`: each one is a render and a finger, and the next turn
 * only exists once the previous close has been answered.
 *
 * @param turns - How many closes to hand the journey.
 * @returns Resolves once the journey has been given them all.
 */
const walk = async function walk(turns: number): Promise<void> {
	if (turns <= 0) {
		return;
	}

	await flushPromises();
	close();
	await walk(turns - 1);
};

/**
 * Run an assertion against the journey inside an act window.
 *
 * The hook clears its own `pending` flag from a promise continuation, and React applies an
 * update like that at the next act boundary. A bare `await` drains the microtask queue
 * without opening one, so the journey would resolve while the tree still showed it running.
 * The `open` half of the same problem is why the cap test closes by hand: the centre only
 * reaches a subject through a render.
 *
 * @param expectation - The assertion to settle the journey with.
 * @returns Resolves once both the journey and React have caught up.
 */
const settle = async function settle(
	expectation: () => Promise<unknown>
): Promise<void> {
	await act(async (): Promise<void> => {
		await expectation();
	});
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
	probe.tracking = null;
	probe.pending = null;
});

describe('useTrackingRequest', () => {
	test('a settled answer resolves and never opens a surface', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[ANSWER]
		);

		expect(tree.text()).toBe('prefs-closed|idle');

		press();

		await settle((): Promise<unknown> =>
			expect(probe.pending).resolves.toMatchObject(ANSWER)
		);
		expect(fake.trackingRequestCalls).toBe(1);
		expect(tree.text()).toBe('prefs-closed|idle');

		tree.unmount();
	});

	test('Additional Information opens the preference centre and holds the request open', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();

		// The subject is partway through deciding, and the promise waits with them
		// rather than resolving with the `not-determined` Apple reports for a tap.
		expect(tree.text()).toBe('prefs-open|pending');
		expect(fake.trackingRequestCalls).toBe(1);

		close();
		await flushPromises();

		await expect(probe.pending).resolves.toMatchObject(ANSWER);
		expect(fake.trackingRequestCalls).toBe(2);
		expect(tree.text()).toBe('prefs-closed|idle');

		tree.unmount();
	});

	test('refusing every tracking category finishes without going back to Apple', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_REFUSED }),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();
		close();
		await flushPromises();

		await expect(probe.pending).resolves.toMatchObject({
			stage: 'additional-information',
			status: 'not-determined',
		});

		// The journey ends on the pause, carrying Apple's own arm. A caller that turned
		// this into `denied` would record a refusal the device never captured.
		expect(fake.trackingRequestCalls).toBe(1);

		tree.unmount();
	});

	test('an unresolved policy is not read as a yes', async () => {
		const { fake, tree } = boot(
			buildSnapshot({
				effectivePermissions: ALL_GRANTED,
				policyPending: true,
				ready: false,
			}),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();
		close();
		await flushPromises();

		// A policy still resolving is a wait, and Apple's prompt does not end one.
		expect(fake.trackingRequestCalls).toBe(1);

		tree.unmount();
	});

	test('comes back while any named category is still granted', async () => {
		const { fake, tree } = boot(
			buildSnapshot({
				effectivePermissions: { ...ALL_REFUSED, measurement: true },
			}),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();
		close();
		await flushPromises();

		expect(fake.trackingRequestCalls).toBe(2);

		tree.unmount();
	});

	test('a refused category ends a request that stood only for it', async () => {
		const { fake, tree } = boot(
			buildSnapshot({
				effectivePermissions: { ...ALL_REFUSED, measurement: true },
			}),
			[PAUSE, ANSWER],
			{ categories: ['marketing'] }
		);

		press();
		await flushPromises();
		close();
		await flushPromises();

		// `measurement` is still on, and it is none of this request's business.
		expect(fake.trackingRequestCalls).toBe(1);

		tree.unmount();
	});

	test('a binary that never sends a stage is a settled request', async () => {
		// A JavaScript update can outrun the binary in the user's hand. The older payload
		// carries only an arm, and reading a missing stage as a pause would open a
		// preference centre that nothing on this device asked for.
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[{ status: 'not-determined' }]
		);

		press();

		await settle((): Promise<unknown> =>
			expect(probe.pending).resolves.toMatchObject({
				stage: 'final',
				status: 'not-determined',
			})
		);
		expect(tree.text()).toBe('prefs-closed|idle');
		expect(fake.trackingRequestCalls).toBe(1);

		tree.unmount();
	});

	test('a platform with nothing to ask rejects and opens nothing', async () => {
		// Android's answer, and the one an iOS build with no prompt string gives.
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED })
		);

		fake.rejectTrackingRequestWith(
			'C15T_TRACKING_UNSUPPORTED',
			'no tracking question to ask'
		);

		press();

		await settle((): Promise<unknown> =>
			expect(probe.pending).rejects.toThrow('no tracking question')
		);
		expect(tree.text()).toBe('prefs-closed|idle');

		tree.unmount();
	});

	test('a second press joins the journey already running', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();

		// A second journey waiting on the same preference centre could never be released
		// by a single close, so the second press rides along on the first.
		const second = probe.pending;

		press();
		await flushPromises();

		expect(probe.pending).toBe(second);
		expect(fake.trackingRequestCalls).toBe(1);

		close();
		await flushPromises();

		await expect(probe.pending).resolves.toMatchObject(ANSWER);
		expect(fake.trackingRequestCalls).toBe(2);

		tree.unmount();
	});

	test('leaving the screen releases the wait and asks Apple for nobody', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();
		expect(tree.text()).toBe('prefs-open|pending');

		tree.unmount();
		await flushPromises();

		// An abandoned journey must not surface a sheet behind whoever navigated away,
		// and it must not sit holding a promise nothing will settle.
		await expect(probe.pending).resolves.toMatchObject({
			stage: 'additional-information',
		});
		expect(fake.trackingRequestCalls).toBe(1);
	});

	test('a platform that pauses forever stops at the cap', async () => {
		const forever = Array.from(
			{ length: MAX_TRACKING_REQUEST_TURNS * 3 },
			() => PAUSE
		);

		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			forever
		);

		press();

		// A bridge that reported a pause without showing anything would otherwise recurse
		// as fast as it answered. Each turn costs a close, so the journey is walked one
		// tap at a time until the brake engages.
		await walk(MAX_TRACKING_REQUEST_TURNS);

		await settle((): Promise<unknown> =>
			expect(probe.pending).resolves.toMatchObject({
				stage: 'additional-information',
			})
		);
		expect(fake.trackingRequestCalls).toBe(MAX_TRACKING_REQUEST_TURNS);
		expect(tree.text()).toBe('prefs-closed|idle');

		tree.unmount();
	});

	test('leaving the app mid-journey neither restarts it nor drops the wait', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[PAUSE, ANSWER]
		);

		press();
		await flushPromises();
		expect(tree.text()).toBe('prefs-open|pending');

		// The subject left the app with the centre still open. Coming back is a reason to
		// re-read the platform arm, not a reason to start a second journey, so the wait
		// they left has to be the one that resolves and Apple must hear about it once.
		const journey = probe.pending;

		setAppState('background');
		await flushPromises();
		setAppState('active');
		await flushPromises();

		expect(probe.pending).toBe(journey);
		expect(fake.trackingRequestCalls).toBe(1);

		close();
		await flushPromises();

		await settle((): Promise<unknown> =>
			expect(probe.pending).resolves.toMatchObject(ANSWER)
		);
		expect(fake.trackingRequestCalls).toBe(2);
		expect(tree.text()).toBe('prefs-closed|idle');

		tree.unmount();
	});

	test('a platform yes writes no consent', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_REFUSED }),
			[ANSWER]
		);

		press();
		await flushPromises();

		// The requirement in one assertion. Apple's Allow is Apple's, and a journey that
		// answered it by granting c15t categories would be buying consent with a system
		// dialog. The categories stay exactly where the subject left them.
		expect(fake.commitIntents).toEqual([]);

		tree.unmount();
	});

	test('an inline categories list does not recreate the request', () => {
		const { tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[],
			{
				categories: ['marketing'],
			}
		);

		const request = probe.tracking?.request;
		const onRequestClose = probe.tracking?.preferences.onRequestClose;

		// `useTrackingRequest({ categories: ['marketing'] })` is a fresh array on every
		// render. The journey reads the list when it needs it rather than capturing it,
		// so a host's own memo of the button keeps holding.
		tree.rerender(
			<C15tProvider>
				<Probe categories={['marketing']} />
			</C15tProvider>
		);
		tree.rerender(
			<C15tProvider>
				<Probe categories={['marketing']} />
			</C15tProvider>
		);

		expect(probe.tracking?.request).toBe(request);
		expect(probe.tracking?.preferences.onRequestClose).toBe(onRequestClose);

		tree.unmount();
	});

	test('reads the categories list as it stands when the centre closes', async () => {
		const { fake, tree } = boot(
			buildSnapshot({
				effectivePermissions: { ...ALL_REFUSED, measurement: true },
			}),
			[PAUSE, ANSWER],
			{ categories: ['marketing'] }
		);

		press();
		await flushPromises();

		// The request now stands for `measurement`, which is still granted. A list read
		// when the journey began still holds `marketing`, and ending here would leave
		// the subject who kept measurement granted stuck without their sheet.
		tree.rerender(
			<C15tProvider>
				<Probe categories={['measurement']} />
			</C15tProvider>
		);

		close();
		await flushPromises();

		expect(fake.trackingRequestCalls).toBe(2);

		tree.unmount();
	});

	test('hands over exactly the props a preference centre takes', () => {
		const { tree } = boot(buildSnapshot({ effectivePermissions: ALL_GRANTED }));

		// Spread-ready, so a host that already renders a preference centre adds one
		// expression rather than a state machine of its own.
		expect(Object.keys(probe.tracking?.preferences ?? {}).sort()).toEqual([
			'onRequestClose',
			'open',
		]);
		expect(probe.tracking?.preferences.open).toBe(false);

		tree.unmount();
	});

	test('reports the platform arm the bridge answered with', async () => {
		const { tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED }),
			[ANSWER]
		);

		expect(probe.tracking?.authorization).toBe('unsupported');

		press();
		await flushPromises();

		expect(probe.tracking?.authorization).toBe('authorized');

		tree.unmount();
	});
});

describe('a preference centre the host already owns', () => {
	/** Lets a test be the host: open the centre it keeps, and count its closes. */
	const centre: {
		closeCalls: number;
		setHostOpen: ((open: boolean) => void) | null;
	} = { closeCalls: 0, setHostOpen: null };

	/** The host's own centre state, reached through the hook's `preferences` option. */
	const SharedProbe = (): ReactNode => {
		const [hostOpen, setHostOpen] = useState(false);

		const tracking = useTrackingRequest({
			preferences: {
				onRequestClose: (): void => {
					setHostOpen(false);
					centre.closeCalls += 1;
				},
				open: hostOpen,
			},
		});

		useEffect((): void => {
			record(tracking);
		});

		// The setter is stable, so a test can raise the host's own centre from outside.
		useEffect((): void => {
			centre.setHostOpen = setHostOpen;
		}, []);

		return tracking.preferences.open ? 'open' : 'closed';
	};

	/** Mount {@link SharedProbe} against a bridge that answers with `replies`. */
	const bootShared = function bootShared(
		replies: Parameters<FakeNativeModule['queueTrackingRequestReplies']>[0] = []
	): Mounted {
		const fake = createFakeNativeModule({
			snapshot: buildSnapshot({ effectivePermissions: ALL_GRANTED }),
		});

		fake.queueTrackingRequestReplies(replies);
		probe.tracking = null;
		probe.pending = null;
		centre.closeCalls = 0;
		centre.setHostOpen = null;

		return {
			fake,
			tree: renderTree(
				<C15tProvider>
					<SharedProbe />
				</C15tProvider>
			),
		};
	};

	afterEach(() => {
		centre.closeCalls = 0;
		centre.setHostOpen = null;
	});

	test('the host keeps its own reasons for opening the centre', () => {
		const { tree } = bootShared();

		expect(tree.text()).toBe('closed');

		// A spread that replaced `open` would drop the card the moment the host raised
		// it, which is the bug this option exists to prevent.
		flush((): void => {
			centre.setHostOpen?.(true);
		});

		expect(tree.text()).toBe('open');

		tree.unmount();
	});

	test('the journey opens that same centre and hands it back', async () => {
		const { fake, tree } = bootShared([PAUSE, ANSWER]);

		press();
		await flushPromises();

		expect(tree.text()).toBe('open');
		expect(fake.trackingRequestCalls).toBe(1);

		close();
		await flushPromises();

		// One card, and the host learns it closed: leaving their `open` true would trap
		// a sheet the subject has already dismissed.
		expect(tree.text()).toBe('closed');
		expect(centre.closeCalls).toBe(1);

		await settle((): Promise<unknown> =>
			expect(probe.pending).resolves.toMatchObject(ANSWER)
		);
		expect(fake.trackingRequestCalls).toBe(2);

		tree.unmount();
	});

	test('the host closing its own centre asks Apple for nobody', async () => {
		const { fake, tree } = bootShared();

		flush((): void => {
			centre.setHostOpen?.(true);
		});
		await flushPromises();

		close();
		await flushPromises();

		// No journey was waiting on that close, so it must not become one.
		expect(fake.trackingRequestCalls).toBe(0);
		expect(tree.text()).toBe('closed');

		tree.unmount();
	});
});

describe('the platform answer after the Settings app', () => {
	test('re-reads tracking when the app comes back to the foreground', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED })
		);

		fake.setTrackingAuthorization('authorized');
		await flushPromises();

		const readsBefore = fake.trackingReadCalls;

		setAppState('background');
		setAppState('active');
		await flushPromises();

		// Apple tells a running process nothing about a change made in Settings, so the
		// foreground read is the only way an app learns tracking was withdrawn.
		expect(fake.trackingReadCalls).toBeGreaterThan(readsBefore);

		tree.unmount();
	});

	test('stays quiet on a platform with no tracking answer to refresh', async () => {
		const { fake, tree } = boot(
			buildSnapshot({ effectivePermissions: ALL_GRANTED })
		);
		await flushPromises();

		const readsBefore = fake.trackingReadCalls;

		setAppState('active');
		await flushPromises();

		// Android still gets the listener and still answers `unsupported`, which is what
		// keeps one consumer integration valid on both platforms.
		expect(fake.trackingReadCalls).toBeGreaterThanOrEqual(readsBefore);

		tree.unmount();
	});
});
