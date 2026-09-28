/**
 * What the hooks owe the app: a rerender only when the value a component
 * actually reads moves, and a decision that reaches native exactly once.
 *
 * Render counts come from an effect rather than the render body, so a probe
 * counts the times React committed it, which is the thing under test.
 */

import type { ConsentState } from '@c15t/core';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';

import {
	buildSnapshot,
	captureErrorMessage,
	createFakeNativeModule,
	flush,
	flushPromises,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import type {
	FakeNativeModule,
	RenderHandle,
} from '../../__tests__/helpers/fake-native';
import { resetNativeStub } from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import type { ConsentSnapshot, TrackingAuthorization } from '../../protocol';
import { C15tProvider } from '../../provider/c15t-provider';
import { useConsent } from '../use-consent';
import type { ConsentActions } from '../use-consent-actions';
import { useConsentActions } from '../use-consent-actions';
import { useConsentDecision } from '../use-consent-decision';
import { useConsentSelector } from '../use-consent-selector';
import { useConsentStatus } from '../use-consent-status';
import { useIsAllowed } from '../use-is-allowed';
import { useIsTrackingAllowed } from '../use-is-tracking-allowed';
import { useTrackingAuthorization } from '../use-tracking-authorization';

/** The default permissions, with marketing granted. */
const MARKETING_GRANTED: ConsentState = {
	experience: false,
	functionality: true,
	marketing: true,
	measurement: false,
	necessary: true,
};

/** Commits per probe, plus the action objects the last probe rendered with. */
const probe: { actions: ConsentActions[]; counts: Record<string, number> } = {
	actions: [],
	counts: {},
};

/** Count a commit for one probe. */
const countCommit = function countCommit(key: string): void {
	probe.counts[key] = (probe.counts[key] ?? 0) + 1;
};

/** Commits recorded for one probe. */
const commitsOf = function commitsOf(key: string): number {
	return probe.counts[key] ?? 0;
};

const AllowedProbe = (): ReactNode => {
	const allowed = useIsAllowed('marketing');

	useEffect(() => {
		countCommit('allowed');
	});

	return <span>{allowed ? 'allowed' : 'blocked'}</span>;
};

const DecisionProbe = (): ReactNode => {
	const decision = useConsentDecision('marketing');

	useEffect(() => {
		countCommit('decision');
	});

	return <span>{decision}</span>;
};

const TrackingAllowedProbe = (): ReactNode => {
	const allowed = useIsTrackingAllowed('marketing');

	useEffect(() => {
		countCommit('tracking');
	});

	return <span>{allowed ? 'allowed' : 'blocked'}</span>;
};

const TrackingAuthorizationProbe = (): ReactNode => {
	const authorization = useTrackingAuthorization();

	useEffect(() => {
		countCommit('authorization');
	});

	return <span>{authorization}</span>;
};

/** Renders nothing, and leaves its stable actions object where a test can reach it. */
const ActionsRequestProbe = (): ReactNode => {
	const actions = useConsentActions();

	useEffect(() => {
		probe.actions.push(actions);
	});

	return null;
};

const StatusProbe = (): ReactNode => {
	const status = useConsentStatus();

	useEffect(() => {
		countCommit('status');
	});

	return <span>{`${status.activeUI}/${status.promptRequirement.kind}`}</span>;
};

const ConsentProbe = (): ReactNode => {
	const snapshot = useConsent();

	useEffect(() => {
		countCommit('consent');
	});

	return <span>{`rev${String(snapshot.revision)}`}</span>;
};

const SelectorProbe = (): ReactNode => {
	// An inline selector on purpose: the hook has to stay correct when the
	// caller does not hoist it to module scope.
	const country = useConsentSelector(
		(snapshot) => snapshot.location?.countryCode ?? 'none'
	);

	useEffect(() => {
		countCommit('selector');
	});

	return <span>{country}</span>;
};

const ActionsProbe = (): ReactNode => {
	// Reads the whole snapshot so it commits on every native change, which is
	// what makes the identity assertion below mean something.
	const snapshot = useConsent();
	const actions = useConsentActions();

	useEffect(() => {
		countCommit('actions');
		probe.actions.push(actions);
	});

	return <span>{`rev${String(snapshot.revision)}`}</span>;
};

/** The action object the probe rendered with, or a failure that says why. */
const capturedActions = function capturedActions(): ConsentActions {
	const [actions] = probe.actions;

	if (actions === undefined) {
		throw new Error('the actions probe never rendered');
	}

	return actions;
};

/**
 * Reach the actions object a request probe rendered with.
 *
 * The provider hands the same object to every consumer, so any probe that
 * captured one can hand a test the platform request.
 */
const capturedRequestActions =
	function capturedRequestActions(): ConsentActions {
		return capturedActions();
	};

let fake: FakeNativeModule;

/**
 * Render children under a provider over a fresh native core.
 *
 * `trackingArm` is served before the first read, because the client caches the
 * platform answer after it: setting it later would describe a prompt that already
 * happened rather than the state the tree mounted in.
 */
const mount = function mount(
	children: ReactNode,
	snapshot?: ConsentSnapshot,
	trackingArm?: TrackingAuthorization
): RenderHandle {
	fake = createFakeNativeModule(snapshot === undefined ? {} : { snapshot });

	if (trackingArm !== undefined) {
		fake.setTrackingAuthorization(trackingArm);
	}

	probe.actions = [];
	probe.counts = {};

	return renderTree(<C15tProvider>{children}</C15tProvider>);
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('useIsAllowed', () => {
	test('does not rerender for an event whose selected value is unchanged', () => {
		const tree = mount(<AllowedProbe />);

		expect(tree.text()).toBe('blocked');
		expect(commitsOf('allowed')).toBe(1);

		// The revision moves and another category changes; the watched boolean
		// does not.
		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: { ...MARKETING_GRANTED, marketing: false },
					revision: 5,
				})
			);
		});

		expect(commitsOf('allowed')).toBe(1);
		expect(tree.text()).toBe('blocked');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({ effectivePermissions: MARKETING_GRANTED, revision: 6 })
			);
		});

		expect(commitsOf('allowed')).toBe(2);
		expect(tree.text()).toBe('allowed');

		tree.unmount();
	});

	test('denies an optional category until the policy resolves', () => {
		const tree = mount(
			<AllowedProbe />,
			buildSnapshot({
				effectivePermissions: MARKETING_GRANTED,
				policyPending: true,
			})
		);

		expect(tree.text()).toBe('blocked');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: MARKETING_GRANTED,
					policyPending: false,
					revision: 2,
				})
			);
		});

		expect(tree.text()).toBe('allowed');

		tree.unmount();
	});
});

describe('useConsentStatus', () => {
	test('ignores a snapshot change that leaves the lifecycle alone', () => {
		const tree = mount(
			<>
				<StatusProbe />
				<ConsentProbe />
			</>
		);

		expect(tree.text()).toBe('banner/choicerev0');

		probe.counts = {};

		// Same four lifecycle fields, a different evaluation timestamp and revision.
		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({ evaluatedAt: 1_770_000_009_999, revision: 11 })
			);
		});

		expect(commitsOf('status')).toBe(0);
		expect(commitsOf('consent')).toBe(1);

		tree.unmount();
	});

	test('rerenders when the surface it gates on changes', () => {
		const tree = mount(<StatusProbe />);

		probe.counts = {};

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					activeUI: null,
					promptRequirement: { kind: 'none' },
					revision: 12,
				})
			);
		});

		expect(commitsOf('status')).toBe(1);
		expect(tree.text()).toBe('null/none');

		tree.unmount();
	});
});

describe('useConsentSelector', () => {
	test('follows its slice and ignores everything else', () => {
		const tree = mount(<SelectorProbe />);

		expect(tree.text()).toBe('DE');
		expect(commitsOf('selector')).toBe(1);

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					activeUI: null,
					promptRequirement: { kind: 'none' },
					revision: 4,
				})
			);
		});

		expect(commitsOf('selector')).toBe(1);

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					location: { countryCode: 'FR', regionCode: null },
					revision: 5,
				})
			);
		});

		expect(tree.text()).toBe('FR');
		expect(commitsOf('selector')).toBe(2);

		tree.unmount();
	});
});

describe('useConsentActions', () => {
	test('sends an explicit save to commit exactly once', async () => {
		mount(<ActionsProbe />);

		const result = await capturedActions().save({ marketing: true });

		await flushPromises();

		expect(fake.commit).toHaveBeenCalledTimes(1);
		expect(fake.commitIntents).toEqual([
			'{"action":"explicit","consents":{"marketing":true}}',
		]);
		expect(result.ok).toBe(true);
	});

	test('sends an empty explicit save when no category is passed', async () => {
		mount(<ActionsProbe />);

		await capturedActions().save();
		await flushPromises();

		expect(fake.commitIntents).toEqual(['{"action":"explicit","consents":{}}']);
	});

	test('maps acceptAll and rejectAll onto the intent vocabulary', async () => {
		mount(<ActionsProbe />);

		await capturedActions().acceptAll();
		await capturedActions().rejectAll();
		await flushPromises();

		expect(fake.commit).toHaveBeenCalledTimes(2);
		expect(fake.commitIntents).toEqual([
			'{"action":"all"}',
			'{"action":"necessary"}',
		]);
	});

	test('dismisses a notice without writing a consent record', () => {
		mount(<ActionsProbe />);

		flush(() => {
			capturedActions().dismissNotice();
		});

		expect(fake.dismissCalls).toBe(1);
		expect(fake.commit).toHaveBeenCalledTimes(0);
	});

	test('forwards refresh, identify, logout, reset, and overrides', async () => {
		mount(<ActionsProbe />);

		const actions = capturedActions();

		await actions.refresh();
		await actions.identify('user-7');
		await actions.logout();
		await actions.reset();
		await actions.setOverrides({ country: 'US' });
		await flushPromises();

		expect(fake.refreshCalls).toBe(1);
		expect(fake.identifyCalls).toEqual(['user-7']);
		expect(fake.logoutCalls).toBe(1);
		expect(fake.resetCalls).toBe(1);
		expect(fake.overrideCalls).toEqual(['{"country":"US"}']);
	});

	test('keeps one action object across rerenders', () => {
		const tree = mount(<ActionsProbe />);

		flush(() => {
			fake.pushSnapshot(buildSnapshot({ revision: 13 }));
		});

		const [first] = probe.actions;

		expect(probe.actions.length).toBe(2);
		expect(probe.actions.every((actions) => actions === first)).toBe(true);

		tree.unmount();
	});
});

describe('wiring', () => {
	test('every hook reports a missing provider', () => {
		for (const Missing of [
			AllowedProbe,
			StatusProbe,
			SelectorProbe,
			ActionsProbe,
		]) {
			expect(
				captureErrorMessage(() => renderToStaticMarkup(<Missing />))
			).toContain('<C15tProvider>');
		}
	});
});

describe('useConsentDecision', () => {
	test('tells an unresolved policy apart from a refusal, then from a grant', () => {
		// The same three snapshots the boolean probe renders as `blocked` twice.
		const tree = mount(
			<DecisionProbe />,
			buildSnapshot({
				effectivePermissions: MARKETING_GRANTED,
				policyPending: true,
			})
		);

		expect(tree.text()).toBe('pending');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: MARKETING_GRANTED,
					policyPending: false,
					revision: 2,
				})
			);
		});

		expect(tree.text()).toBe('granted');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: { ...MARKETING_GRANTED, marketing: false },
					revision: 3,
				})
			);
		});

		expect(tree.text()).toBe('denied');

		tree.unmount();
	});

	test('does not rerender for an event whose decision is unchanged', () => {
		const tree = mount(<DecisionProbe />);

		expect(tree.text()).toBe('denied');
		expect(commitsOf('decision')).toBe(1);

		// A policy re-resolution that leaves the watched category alone.
		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: { ...MARKETING_GRANTED, marketing: false },
					revision: 7,
				})
			);
		});

		expect(commitsOf('decision')).toBe(1);

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({ effectivePermissions: MARKETING_GRANTED, revision: 8 })
			);
		});

		expect(commitsOf('decision')).toBe(2);
		expect(tree.text()).toBe('granted');

		tree.unmount();
	});
});

/**
 * The platform half of a tracking gate, seen from a component.
 *
 * The consent half is covered by `useIsAllowed` and `useConsentDecision`; what
 * belongs here is that both answers are read, that neither one is allowed to
 * speak for the other, and that the Apple dialog is a thing the host asks for
 * rather than something that happens to it.
 */
describe('useIsTrackingAllowed', () => {
	test('holds a granted category off while the platform has not answered', () => {
		const tree = mount(
			<TrackingAllowedProbe />,
			buildSnapshot({ effectivePermissions: MARKETING_GRANTED }),
			'not-determined'
		);

		// The subject granted marketing, and the platform has not been asked. That is
		// the state an analytics SDK must not read as a yes.
		expect(tree.text()).toBe('blocked');
		expect(commitsOf('tracking')).toBe(1);

		tree.unmount();
	});

	test('opens only when the subject granted and the platform authorized', async () => {
		const tree = mount(
			<>
				<TrackingAllowedProbe />
				<ActionsRequestProbe />
			</>,
			buildSnapshot({ effectivePermissions: MARKETING_GRANTED }),
			'not-determined'
		);

		expect(tree.text()).toBe('blocked');

		fake.setTrackingAuthorization('authorized');
		await capturedRequestActions().requestTrackingAuthorization();
		await flushPromises();

		expect(tree.text()).toBe('allowed');
		expect(commitsOf('tracking')).toBe(2);

		tree.unmount();
	});

	test('stays blocked for a refused category however the platform answered', async () => {
		const tree = mount(
			<>
				<TrackingAllowedProbe />
				<ActionsRequestProbe />
			</>,
			buildSnapshot({
				effectivePermissions: { ...MARKETING_GRANTED, marketing: false },
			}),
			'not-determined'
		);

		fake.setTrackingAuthorization('authorized');
		await capturedRequestActions().requestTrackingAuthorization();
		await flushPromises();

		// Apple said yes to a subject who said no. The category stays off, and the
		// component does not even rerender, because nothing it reads moved.
		expect(tree.text()).toBe('blocked');
		expect(commitsOf('tracking')).toBe(1);

		tree.unmount();
	});

	test('stays blocked for an unresolved policy with the platform authorized', async () => {
		const tree = mount(
			<>
				<TrackingAllowedProbe />
				<ActionsRequestProbe />
			</>,
			buildSnapshot({
				effectivePermissions: MARKETING_GRANTED,
				policyPending: true,
			}),
			'not-determined'
		);

		fake.setTrackingAuthorization('authorized');
		await capturedRequestActions().requestTrackingAuthorization();
		await flushPromises();

		expect(tree.text()).toBe('blocked');

		flush(() => {
			fake.pushSnapshot(
				buildSnapshot({
					effectivePermissions: MARKETING_GRANTED,
					policyPending: false,
					revision: 4,
				})
			);
		});

		// The policy resolving is the event that was waiting for, and it is the only
		// one that was ever going to be.
		expect(tree.text()).toBe('allowed');

		tree.unmount();
	});
});

describe('useTrackingAuthorization', () => {
	test('reports the platform arm and nothing else', () => {
		const tree = mount(<TrackingAuthorizationProbe />);

		expect(tree.text()).toBe('unsupported');

		tree.unmount();
	});

	test('rerenders when a request answers, and not before', async () => {
		const tree = mount(
			<>
				<TrackingAuthorizationProbe />
				<ActionsRequestProbe />
			</>
		);

		expect(tree.text()).toBe('unsupported');
		expect(commitsOf('authorization')).toBe(1);

		fake.setTrackingAuthorization('denied');
		await capturedRequestActions().requestTrackingAuthorization();
		await flushPromises();

		expect(tree.text()).toBe('denied');
		expect(commitsOf('authorization')).toBe(2);

		// A consent change is not a platform change, and the component watching the
		// platform stays put through one.
		flush(() => {
			fake.pushSnapshot(buildSnapshot({ revision: 9 }));
		});

		expect(commitsOf('authorization')).toBe(2);

		tree.unmount();
	});
});
