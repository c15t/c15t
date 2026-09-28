import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import { StrictMode, useEffect } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const TRACKER = 'https://tracker.example/collect';
const rules: NetworkBlockerRule[] = [
	{ category: 'measurement', domain: 'tracker.example' },
];

let nativeFetch: typeof window.fetch;
let network: ReturnType<typeof vi.fn>;

beforeEach(() => {
	nativeFetch = window.fetch;
	network = vi.fn(() => Promise.resolve(new Response('ok')));
	window.fetch = network as unknown as typeof window.fetch;
});

afterEach(() => {
	window.fetch = nativeFetch;
});

/** Sends a tracker request from its mount effect and records the status. */
const Beacon = ({
	label,
	statuses,
}: {
	label: string;
	statuses: Promise<number>[];
}) => {
	useEffect(() => {
		statuses.push(
			window.fetch(`${TRACKER}?when=${label}`).then(({ status }) => status)
		);
	}, [label, statuses]);
	return null;
};

const trackerCalls = () =>
	network.mock.calls.filter(([input]) => String(input).startsWith(TRACKER));

const renderWithBeacons = (
	measurement: boolean | undefined,
	wrap: (node: ReactNode) => ReactNode = (node) => node
) => {
	const statuses: Promise<number>[] = [];
	const prefetch =
		measurement === undefined
			? policyFixture()
			: policyFixture({ measurement });
	const view = render(
		wrap(
			<>
				<Beacon
					label="sibling"
					statuses={statuses}
				/>
				<ConsentProvider
					options={{
						mode: offline(),
						networkBlocker: { logBlockedRequests: false, rules },
						persistence: false,
						prefetch,
					}}
				>
					<Beacon
						label="child"
						statuses={statuses}
					/>
				</ConsentProvider>
			</>
		)
	);
	return { statuses, view };
};

test('holds requests from mount effects that run before the blocker loads', async () => {
	const { statuses } = renderWithBeacons(undefined);
	await vi.waitFor(() => expect(statuses).toHaveLength(2));

	// Both effects ran before the lazily loaded blocker could install.
	expect(trackerCalls()).toHaveLength(0);
	expect(await Promise.all(statuses)).toEqual([451, 451]);
	expect(trackerCalls()).toHaveLength(0);
});

test('holds them in StrictMode too', async () => {
	const { statuses } = renderWithBeacons(false, (node) => (
		<StrictMode>{node}</StrictMode>
	));
	await vi.waitFor(() => expect(statuses.length).toBeGreaterThanOrEqual(2));

	for (const status of await Promise.all(statuses)) {
		expect(status).toBe(451);
	}
	expect(trackerCalls()).toHaveLength(0);
});

test('sends held requests once stored consent allows them', async () => {
	const { statuses } = renderWithBeacons(true);
	await vi.waitFor(() => expect(statuses).toHaveLength(2));

	expect(await Promise.all(statuses)).toEqual([200, 200]);
	expect(trackerCalls().map(([input]) => input)).toEqual([
		`${TRACKER}?when=sibling`,
		`${TRACKER}?when=child`,
	]);
});
