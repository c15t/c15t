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
import type { ConsentSnapshot } from '../../protocol';
import { C15tProvider } from '../../provider/c15t-provider';
import { useConsent } from '../use-consent';
import type { ConsentActions } from '../use-consent-actions';
import { useConsentActions } from '../use-consent-actions';
import { useConsentDecision } from '../use-consent-decision';
import { useConsentSelector } from '../use-consent-selector';
import { useConsentStatus } from '../use-consent-status';
import { useIsAllowed } from '../use-is-allowed';

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

let fake: FakeNativeModule;

/** Render children under a provider over a fresh native core. */
const mount = function mount(
	children: ReactNode,
	snapshot?: ConsentSnapshot
): RenderHandle {
	fake = createFakeNativeModule(snapshot === undefined ? {} : { snapshot });

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

	test('forwards refresh, identify, logout, and overrides', async () => {
		mount(<ActionsProbe />);

		const actions = capturedActions();

		await actions.refresh();
		await actions.identify('user-7');
		await actions.logout();
		await actions.setOverrides({ country: 'US' });
		await flushPromises();

		expect(fake.refreshCalls).toBe(1);
		expect(fake.identifyCalls).toEqual(['user-7']);
		expect(fake.logoutCalls).toBe(1);
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
