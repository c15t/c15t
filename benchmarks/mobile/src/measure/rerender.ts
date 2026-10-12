/**
 * Render counting for the React boundary.
 *
 * The contract allows one rerender per subscribed component per consent change,
 * and none when the selected slice did not move. Both are measured with
 * react-test-renderer: a probe increments a counter in its own render body, so
 * the number is React's render pass and not an estimate.
 */

import {
	C15tProvider,
	getConsentClient,
	useConsentStatus,
	useIsAllowed,
} from '@c15t/react-native';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { act, create } from 'react-test-renderer';

import { ensureReactGlobalForDist } from '../support/ensure-react-global';
import { installBenchNativeModule } from '../support/fake-native';
import { buildExplicitChoice, buildSnapshot } from '../support/fixtures';
import type { BenchSnapshot } from '../support/fixtures';
import {
	emitNativeEvent,
	resetNativeStub,
	setNativeModule,
} from '../support/react-native-stub';

// react-test-renderer only permits `act` when the environment says a test drives it.
(
	globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Name the native cores register the TurboModule under. */
const MODULE_NAME = 'C15t';

/** Renders recorded per probe since the last reset. */
const renderCounts = new Map<string, number>();

/**
 * Record one render for a probe and hand back its selected value.
 *
 * @param name - Probe identity.
 * @param value - Value the probe selected.
 * @returns Text to render.
 */
const probe = function probe<ValueType>(
	name: string,
	value: ValueType
): string {
	renderCounts.set(name, (renderCounts.get(name) ?? 0) + 1);
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/** Watches one boolean category. */
const MarketingProbe = (): ReactNode =>
	probe('marketing', useIsAllowed('marketing'));

/**
 * Build a probe that watches one category.
 *
 * @param name - Probe identity, distinct per mounted instance.
 * @param category - Category to read.
 * @returns A subscribed component.
 */
const categoryProbe = function categoryProbe(
	name: string,
	category: 'marketing' | 'measurement'
): () => ReactNode {
	return () => probe(name, useIsAllowed(category));
};

/** Two watchers of a category no scenario in here touches. */
const MeasurementProbe = categoryProbe('measurement', 'measurement');
const SecondMeasurementProbe = categoryProbe('measurement2', 'measurement');

/** Watches the banner-shaped status slice the package's own hook builds. */
const StatusProbe = (): ReactNode =>
	probe('consentStatus', useConsentStatus().activeUI);

/** The tree under test: the real provider, four subscribed components. */
const BenchTree = (): ReactNode =>
	createElement(
		C15tProvider,
		null,
		createElement(MarketingProbe),
		createElement(MeasurementProbe),
		createElement(StatusProbe),
		createElement(SecondMeasurementProbe)
	);

/** Outcome of one scenario. */
export interface RerenderScenarioResult {
	/** Highest render count any single subscribed component produced. */
	maxRenders: number;
	/** Lowest, so a component that correctly stayed put is visible. */
	minRenders: number;
	/** Per-probe breakdown. */
	perComponent: Record<string, number>;
}

export interface RerenderResult {
	consentChange: RerenderScenarioResult;
	unchangedEvent: RerenderScenarioResult;
	/**
	 * Distinct snapshot objects seen across the run's distinct revisions.
	 *
	 * This is not the no-per-call-allocation number, and must not be read as one:
	 * the run deliberately moves through several states, and a new object per state
	 * is correct. The per-call claim belongs to `measureJavaScript`, which reads one
	 * settled state many times. Here the useful reading is that the count tracks the
	 * states and not the reads.
	 */
	distinctSnapshotsAcrossStates: number;
	/** Times the bridge crossed into native for a snapshot. */
	nativeSnapshotCalls: number;
	/** Mounted subscribed components. */
	components: number;
}

const snapshot = function snapshot(): Record<string, number> {
	return Object.fromEntries(renderCounts);
};

const subtract = function subtract(
	now: Record<string, number>,
	before: Record<string, number>
): Record<string, number> {
	const delta: Record<string, number> = {};
	for (const [name, count] of Object.entries(now)) {
		delta[name] = (count ?? 0) - (before[name] ?? 0);
	}
	return delta;
};

const summarize = function summarize(
	perComponent: Record<string, number>
): RerenderScenarioResult {
	const values = Object.values(perComponent);
	return {
		maxRenders: values.length > 0 ? Math.max(...values) : 0,
		minRenders: values.length > 0 ? Math.min(...values) : 0,
		perComponent,
	};
};

/** Event payload the core sends: a revision, not a snapshot. */
const revisionEvent = function revisionEvent(revision: number): string {
	return JSON.stringify({ revision });
};

/**
 * Measure renders per consent change and per unchanged snapshot event.
 *
 * @returns Render counts, plus how much native traffic the boundary produced.
 */
export const measureRerenders =
	async function measureRerenders(): Promise<RerenderResult> {
		ensureReactGlobalForDist();
		resetNativeStub();
		renderCounts.clear();

		const native = installBenchNativeModule(
			MODULE_NAME,
			setNativeModule,
			buildSnapshot()
		);
		// Distinct snapshot objects, counted by identity. A WeakSet cannot report a
		// size, and the whole point of this number is the count.
		const identities: object[] = [];

		let tree: ReturnType<typeof create> | undefined;
		await act(() => {
			tree = create(createElement(BenchTree));
		});

		const client = getConsentClient();
		const remember = function remember(): void {
			const value = client.getSnapshot() as object;
			if (!identities.some((seen) => seen === value)) {
				identities.push(value);
			}
		};

		remember();
		const mounted = snapshot();

		// A consent change: only `marketing` moves.
		const current = native.current();
		const changed: BenchSnapshot = {
			...current,
			activeUI: 'none',
			effectivePermissions: {
				...current.effectivePermissions,
				marketing: true,
			},
			explicitChoice: buildExplicitChoice(current.evaluatedAt + 25),
			promptRequirement: { kind: 'choice', reason: 'standing' },
			revision: current.revision + 1,
		};

		await act(() => {
			native.push(changed);
			emitNativeEvent('snapshot', revisionEvent(changed.revision));
		});
		remember();

		const consentChange = summarize(subtract(snapshot(), mounted));

		// An event that bumps the revision without moving any selected slice.
		const beforeQuiet = snapshot();
		const sameSlice: BenchSnapshot = {
			...native.current(),
			evaluatedAt: native.current().evaluatedAt + 1000,
			revision: native.current().revision + 1,
		};

		await act(() => {
			native.push(sameSlice);
			emitNativeEvent('snapshot', revisionEvent(sameSlice.revision));
		});
		remember();

		// And the duplicate the contract says native must never send.
		await act(() => {
			emitNativeEvent('snapshot', revisionEvent(sameSlice.revision));
		});
		remember();

		const unchangedEvent = summarize(subtract(snapshot(), beforeQuiet));

		await act(() => {
			tree?.unmount();
		});

		return {
			components: Object.keys(consentChange.perComponent).length,
			consentChange,
			distinctSnapshotsAcrossStates: identities.length,
			nativeSnapshotCalls: native.snapshotCalls,
			unchangedEvent,
		};
	};
